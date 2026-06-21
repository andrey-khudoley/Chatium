import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import { GC_DEVELOPER_API_KEY, GC_TEST_SCHOOL_API_KEY } from '../shared/gatewaySettingKeys'
import { validateGcSchoolHostTrimmed } from '../shared/gcSchoolHostValidation'
import {
  SETTING_KEYS,
  LOG_LEVELS,
  isLogLevel,
  parseLogsLimit,
  isValidDateFilter,
  normalizeDateFilter
} from './settings.lib'

const LOG_MODULE = 'lib/settings.lib'

function isSecretHeapSettingKey(key: string): boolean {
  return key === GC_DEVELOPER_API_KEY || key === GC_TEST_SCHOOL_API_KEY
}

/** В логах не передаём значения секретов Heap (manual §5.7). */
function loggableSettingPayload(key: string, value: unknown): { key: string; value: unknown } {
  if (isSecretHeapSettingKey(key)) {
    return { key, value: '[redacted]' }
  }
  return { key, value }
}

/**
 * Сохранить настройку. Валидирует значение для известных ключей.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: loggableSettingPayload(key, value)
  })
  let normalized: unknown = value

  if (key === SETTING_KEYS.LOG_LEVEL) {
    const str = typeof value === 'string' ? value : String(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LOG_LEVEL branch`,
      payload: { str, isLogLevel: isLogLevel(str) }
    })
    if (!isLogLevel(str)) {
      await loggerLib.throwLoggedServerError(
        ctx,
        `Недопустимый уровень логирования: ${str}. Допустимо: ${LOG_LEVELS.join(', ')}`,
        {
          payload: { key: SETTING_KEYS.LOG_LEVEL, str }
        }
      )
    }
    normalized = str
  } else if (key === SETTING_KEYS.LOGS_LIMIT) {
    const n = parseLogsLimit(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LOGS_LIMIT branch`,
      payload: { n, value }
    })
    if (n < 1 || n > 10000) {
      await loggerLib.throwLoggedServerError(
        ctx,
        `Лимит логов должен быть от 1 до 10000, получено: ${value}`,
        { payload: { key: SETTING_KEYS.LOGS_LIMIT, n, value } }
      )
    }
    normalized = String(n)
  } else if (key === SETTING_KEYS.PROJECT_NAME || key === SETTING_KEYS.PROJECT_TITLE) {
    normalized = typeof value === 'string' ? value.trim() : String(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting PROJECT_NAME/PROJECT_TITLE branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.LOG_WEBHOOK) {
    if (typeof value !== 'object' || value === null) {
      await loggerLib.throwLoggedServerError(
        ctx,
        'log_webhook должен быть объектом { enable: boolean, url: string }',
        { payload: { key: SETTING_KEYS.LOG_WEBHOOK } }
      )
    }
    const o = value as Record<string, unknown>
    normalized = {
      enable: typeof o.enable === 'boolean' ? o.enable : false,
      url: typeof o.url === 'string' ? o.url : ''
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting LOG_WEBHOOK branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.DASHBOARD_RESET_AT) {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n) || n < 0) {
      await loggerLib.throwLoggedServerError(
        ctx,
        'dashboard_reset_at должен быть неотрицательным числом (Unix ms)',
        { payload: { key: SETTING_KEYS.DASHBOARD_RESET_AT, value } }
      )
    }
    normalized = Math.floor(n)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting DASHBOARD_RESET_AT branch`,
      payload: { normalized }
    })
  } else if (
    key === SETTING_KEYS.GC_DEVELOPER_API_KEY ||
    key === SETTING_KEYS.GC_TEST_SCHOOL_API_KEY
  ) {
    const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
    if (!s) {
      const msg =
        key === SETTING_KEYS.GC_DEVELOPER_API_KEY
          ? 'Ключ разработчика GetCourse: нужна непустая строка после обрезки пробелов (разд. 5.4 manual).'
          : 'Тестовый ключ школы: нужна непустая строка после обрезки пробелов (разд. 5.4–5.5 manual).'
      await loggerLib.throwLoggedServerError(ctx, msg, { payload: { key } })
    }
    normalized = s
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_* secret string`,
      payload: { key, normalized: '[redacted]' }
    })
  } else if (key === SETTING_KEYS.GC_TEST_SCHOOL_HOST) {
    const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
    const hostErr = validateGcSchoolHostTrimmed(s)
    if (hostErr) {
      await loggerLib.throwLoggedServerError(ctx, hostErr, {
        payload: { key: SETTING_KEYS.GC_TEST_SCHOOL_HOST, source: 'gcSchoolHostValidation' }
      })
    }
    normalized = s
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_TEST_SCHOOL_HOST`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.PANEL_DATE_FILTER) {
    if (!isValidDateFilter(value)) {
      await loggerLib.throwLoggedServerError(
        ctx,
        'panel_date_filter должен быть объектом { from?: number > 0, to?: number > 0 }, при обеих границах from <= to',
        { payload: { key: SETTING_KEYS.PANEL_DATE_FILTER } }
      )
    }
    normalized = normalizeDateFilter(value)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting PANEL_DATE_FILTER branch`,
      payload: { normalized }
    })
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: loggableSettingPayload(key, normalized)
  })
}

/**
 * Удалить настройку по ключу (manual §5.9: произвольные пары «ключ — значение»).
 * Если строки нет — операция тихо завершается.
 */
export async function deleteSetting(ctx: app.Ctx, key: string): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] deleteSetting entry`,
    payload: { key }
  })
  const trimmed = key.trim()
  if (!trimmed) {
    await loggerLib.throwLoggedServerError(ctx, 'Поле key обязательно для удаления настройки', {
      payload: { key }
    })
  }
  await repo.deleteByKey(ctx, trimmed)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] deleteSetting exit`,
    payload: { key: trimmed }
  })
}

/** Имена ключей, валидируемых отдельно (используются админкой для отделения «известных» от произвольных). */
export const KNOWN_SETTING_KEYS: ReadonlySet<string> = new Set(Object.values(SETTING_KEYS))

/** Произвольные пары «ключ — значение» в Heap (manual §5.9): всё, что не входит в `KNOWN_SETTING_KEYS`. */
export async function listArbitrarySettings(
  ctx: app.Ctx
): Promise<Array<{ key: string; value: unknown }>> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] listArbitrarySettings entry`,
    payload: {}
  })
  const rows = await repo.findAll(ctx)
  const arbitrary = rows
    .filter((row) => row.key && !KNOWN_SETTING_KEYS.has(row.key))
    .map((row) => ({ key: row.key, value: row.value }))
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] listArbitrarySettings exit`,
    payload: { count: arbitrary.length, keys: arbitrary.map((r) => r.key) }
  })
  return arbitrary
}
