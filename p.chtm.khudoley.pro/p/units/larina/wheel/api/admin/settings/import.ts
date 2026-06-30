// @shared-route
import { requireAccountRole } from '@app/auth'
import { runWithExclusiveLock } from '@app/sync'
import * as settingsLib from '../../../lib/settings.lib'
import * as segmentsRepo from '../../../repos/segments.repo'
import * as spinsRepo from '../../../repos/spins.repo'
import * as loggerLib from '../../../lib/logger.lib'
import { BACKUP_TYPE, BACKUP_VERSION } from '../../../shared/backupMeta'

const LOG_PATH = 'api/admin/settings/import'

/** Тип нормализованного сегмента для создания. */
type NormalizedSegment = {
  order: number
  label: string
  full: string
  weight: number
  maxWins: number | null
  enabled: boolean
  prizeOfferID: string | null
  redirectUrl: string | null
}

type IncomingSegment = {
  order?: unknown
  label?: unknown
  full?: unknown
  weight?: unknown
  maxWins?: unknown
  enabled?: unknown
  prizeOfferID?: unknown
  redirectUrl?: unknown
}

/** Нормализация одного сегмента из бэкапа в данные для create. Возвращает null при невалидном label. */
function normalizeSegment(raw: IncomingSegment, index: number): NormalizedSegment | null {
  const label = typeof raw.label === 'string' ? raw.label : ''
  if (!label) return null

  const orderRaw = typeof raw.order === 'number' ? raw.order : Number(raw.order)
  const order = Number.isFinite(orderRaw) && orderRaw >= 0 ? Math.floor(orderRaw) : index

  const weightRaw = typeof raw.weight === 'number' ? raw.weight : Number(raw.weight)
  const weight = Number.isFinite(weightRaw) && weightRaw >= 0 ? weightRaw : 0

  const maxWinsRaw =
    raw.maxWins == null || raw.maxWins === ''
      ? null
      : typeof raw.maxWins === 'number'
        ? raw.maxWins
        : parseInt(String(raw.maxWins), 10)
  const maxWins = maxWinsRaw !== null && Number.isFinite(maxWinsRaw) ? Math.floor(maxWinsRaw) : null

  const prizeOfferID =
    typeof raw.prizeOfferID === 'string' && raw.prizeOfferID.trim() ? raw.prizeOfferID.trim() : null
  const redirectUrl =
    typeof raw.redirectUrl === 'string' && raw.redirectUrl.trim() ? raw.redirectUrl.trim() : null

  return {
    order,
    label,
    full: typeof raw.full === 'string' ? raw.full : '',
    weight,
    maxWins,
    enabled: raw.enabled === true || raw.enabled === 'true' || raw.enabled === 1,
    prizeOfferID,
    redirectUrl
  }
}

/**
 * POST /api/admin/settings/import — восстановление настроек и сегментов из бэкапа.
 * Body: { backup: { _meta, settings, segments } }
 * Только Admin. Импорт ЗАМЕНЯЕТ текущие настройки и сегменты.
 *
 * Настройки применяются всегда. Сегменты заменяются целиком (replace-all) только
 * если ни у одного существующего сегмента нет истории побед (иначе удаление
 * сломало бы ссылки spins); в этом случае импорт сегментов пропускается с
 * сообщением — настройки при этом всё равно применяются.
 */
export const importSettingsRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос импорта настроек`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as { backup?: unknown }
  const backup = body?.backup as
    | { _meta?: { type?: unknown }; settings?: unknown; segments?: unknown }
    | undefined

  if (!backup || typeof backup !== 'object') {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: backup отсутствует`,
      payload: {}
    })
    return { success: false, error: 'Файл бэкапа не передан или повреждён' }
  }

  const fileType = backup._meta?.type
  if (fileType !== BACKUP_TYPE) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация: неверный тип файла`,
      payload: { fileType: String(fileType) }
    })
    return {
      success: false,
      error: `Это не файл бэкапа колеса (ожидался тип "${BACKUP_TYPE}")`
    }
  }

  // Версия формата: файл новее, чем понимает этот код, — отказываемся (несовместимость)
  const fileVersionRaw = (backup._meta as { version?: unknown } | undefined)?.version
  const fileVersion = typeof fileVersionRaw === 'number' ? fileVersionRaw : 0
  if (fileVersion > BACKUP_VERSION) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Валидация: версия файла новее поддерживаемой`,
      payload: { fileVersion, supported: BACKUP_VERSION }
    })
    return {
      success: false,
      error: `Версия файла бэкапа (${fileVersion}) новее поддерживаемой (${BACKUP_VERSION}). Обновите проект.`
    }
  }

  let settingsApplied = 0
  let settingsSkipped: string[] = []
  let segmentsImported = 0
  let segmentsImportedOk = false
  let segmentsMessage = ''

  try {
    // 1. Настройки
    if (backup.settings && typeof backup.settings === 'object' && !Array.isArray(backup.settings)) {
      const res = await settingsLib.applyBackupSettings(
        ctx,
        backup.settings as Record<string, unknown>
      )
      settingsApplied = res.applied.length
      settingsSkipped = res.skipped
    } else if (backup.settings != null) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] Блок settings некорректного типа — пропущен`,
        payload: { type: Array.isArray(backup.settings) ? 'array' : typeof backup.settings }
      })
    } else {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] В бэкапе нет блока settings`,
        payload: {}
      })
    }

    // 2. Сегменты (replace-all с защитой от потери ссылок spins).
    //    Нормализуем ВСЕ входящие сегменты ДО любого удаления (атомарность: при
    //    битом входе ничего не теряем). Мутацию (проверка побед → удаление →
    //    создание) выполняем под эксклюзивным локом, чтобы сериализовать
    //    параллельные импорты. Остаточная гонка с конкурентным спином (новый spin
    //    между findAll и удалением) — принятый риск, как в api/admin/segments/delete.
    if (Array.isArray(backup.segments)) {
      const incoming = backup.segments as IncomingSegment[]
      const normalized: NormalizedSegment[] = []
      for (let i = 0; i < incoming.length; i++) {
        const norm = normalizeSegment(incoming[i] ?? {}, i)
        if (!norm) {
          await loggerLib.writeServerLog(ctx, {
            severity: 6,
            message: `[${LOG_PATH}] Сегмент пропущен: нет label`,
            payload: { index: i }
          })
          continue
        }
        normalized.push(norm)
      }

      const segResult = await runWithExclusiveLock(ctx, 'wheel:segments:mutate', async () => {
        const existing = await segmentsRepo.findAll(ctx)

        let hasWins = false
        for (const seg of existing) {
          const wins = await spinsRepo.countBySegment(ctx, seg.id)
          if (wins > 0) {
            hasWins = true
            break
          }
        }

        if (hasWins) {
          await loggerLib.writeServerLog(ctx, {
            severity: 4,
            message: `[${LOG_PATH}] Импорт сегментов пропущен: есть история побед`,
            payload: { existingCount: existing.length }
          })
          return {
            ok: false,
            imported: 0,
            message:
              'Сегменты не импортированы: у текущих сегментов есть история побед. Сбросьте результаты колеса и повторите импорт.'
          }
        }

        for (const seg of existing) {
          await segmentsRepo.deleteById(ctx, seg.id)
        }
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] Старые сегменты удалены`,
          payload: { deletedCount: existing.length }
        })

        let imported = 0
        for (const norm of normalized) {
          await segmentsRepo.create(ctx, norm)
          imported++
        }
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] Сегменты импортированы`,
          payload: { imported }
        })
        return { ok: true, imported, message: '' }
      })

      segmentsImportedOk = segResult.ok
      segmentsImported = segResult.imported
      segmentsMessage = segResult.message
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Импорт завершён`,
      payload: { settingsApplied, segmentsImported, segmentsImportedOk, settingsSkipped }
    })

    return {
      success: true,
      settingsApplied,
      settingsSkipped,
      segmentsImported,
      segmentsImportedOk,
      segmentsMessage
    }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка импорта настроек`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default importSettingsRoute
