// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'
import * as segmentsRepo from '../../../repos/segments.repo'
import * as loggerLib from '../../../lib/logger.lib'
import { PROJECT_ROOT } from '../../../config/routes'
import { BACKUP_TYPE, BACKUP_VERSION } from '../../../shared/backupMeta'

const LOG_PATH = 'api/admin/settings/export'

/**
 * GET /api/admin/settings/export — выгрузка всех настроек и сегментов в JSON.
 * Только Admin. Возвращает { success, backup } для скачивания в админке.
 *
 * Секрет gc_school_api_key включается в выгрузку в открытом виде (бэкап должен
 * быть восстановим / переносим). Эндпоинт доступен только Admin — это осознанный
 * компромисс; значение секрета не пишется в логи (§18).
 */
export const exportSettingsRoute = app.get('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос экспорта настроек`,
    payload: {}
  })

  try {
    const settings = await settingsLib.getBackupSettings(ctx)
    const segmentsRaw = await segmentsRepo.findAll(ctx)

    // Сегменты без id (id будет назначен заново при импорте на любой экземпляр)
    const segments = segmentsRaw.map((seg) => ({
      order: seg.order,
      label: seg.label,
      full: seg.full,
      weight: seg.weight,
      maxWins: seg.maxWins ?? null,
      enabled: seg.enabled,
      prizeOfferID: seg.prizeOfferID ?? null,
      redirectUrl: seg.redirectUrl ?? null
    }))

    const backup = {
      _meta: {
        type: BACKUP_TYPE,
        version: BACKUP_VERSION,
        projectRoot: PROJECT_ROOT,
        exportedAt: new Date().toISOString()
      },
      settings,
      segments
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Экспорт сформирован`,
      payload: { settingsKeys: Object.keys(settings).length, segmentsCount: segments.length }
    })

    return { success: true, backup }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка экспорта настроек`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})

export default exportSettingsRoute
