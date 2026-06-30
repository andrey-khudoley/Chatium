import * as repo from '../repos/settings.repo'
import * as loggerLib from './logger.lib'
import { THEMES } from '../config/themes'

const LOG_MODULE = 'lib/settings.lib'

/** Ключи настроек */
export const SETTING_KEYS = {
  PROJECT_NAME: 'project_name',
  PROJECT_TITLE: 'project_title',
  LOG_LEVEL: 'log_level',
  LOGS_LIMIT: 'logs_limit',
  LOG_WEBHOOK: 'log_webhook',
  DASHBOARD_RESET_AT: 'dashboard_reset_at',
  WHEEL_ENABLED: 'wheel_enabled',
  WHEEL_MAX_SPINS: 'wheel_max_spins',
  GATEWAY_BASE_URL: 'gateway_base_url',
  GC_SCHOOL_HOST: 'gc_school_host',
  GC_SCHOOL_API_KEY: 'gc_school_api_key',
  GETCOURSE_REQUIRE_USER: 'getcourse_require_user',
  GETCOURSE_REQUIRE_GROUP: 'getcourse_require_group',
  GETCOURSE_REQUIRED_GROUP_IDS: 'getcourse_required_group_ids',
  GETCOURSE_ISSUE_REWARDS: 'getcourse_issue_rewards',
  THEME: 'theme',
  WHEEL_BRAND_LABEL: 'wheel_brand_label'
} as const

/** Настройка вебхука логов: enable — активна ли отправка, url — куда отправлять. */
export type LogWebhookSetting = { enable: boolean; url: string }

/** Эффективные флаги gating GetCourse */
export type GetcourseGating = {
  requireUser: boolean
  requireGroup: boolean
  requiredGroupIds: number[]
}

/** Значения по умолчанию */
export const DEFAULTS = {
  [SETTING_KEYS.PROJECT_NAME]: 'A/Ley Services',
  [SETTING_KEYS.PROJECT_TITLE]: 'A/Ley',
  [SETTING_KEYS.LOG_LEVEL]: 'Info',
  [SETTING_KEYS.LOGS_LIMIT]: '100',
  [SETTING_KEYS.LOG_WEBHOOK]: { enable: false, url: '' } as LogWebhookSetting,
  [SETTING_KEYS.DASHBOARD_RESET_AT]: null as number | null,
  [SETTING_KEYS.WHEEL_ENABLED]: true,
  [SETTING_KEYS.WHEEL_MAX_SPINS]: 1,
  [SETTING_KEYS.GATEWAY_BASE_URL]: '',
  [SETTING_KEYS.GC_SCHOOL_HOST]: '',
  [SETTING_KEYS.GC_SCHOOL_API_KEY]: '',
  [SETTING_KEYS.GETCOURSE_REQUIRE_USER]: false,
  [SETTING_KEYS.GETCOURSE_REQUIRE_GROUP]: false,
  [SETTING_KEYS.GETCOURSE_REQUIRED_GROUP_IDS]: [] as number[],
  [SETTING_KEYS.GETCOURSE_ISSUE_REWARDS]: false,
  [SETTING_KEYS.THEME]: 'gold',
  [SETTING_KEYS.WHEEL_BRAND_LABEL]: 'Онлайн-школа · Анастасия Ларина'
} as const

/** Допустимые уровни логирования */
export const LOG_LEVELS = ['Debug', 'Info', 'Warn', 'Error', 'Disable'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && LOG_LEVELS.includes(value as LogLevel)
}

function parseLogsLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  const n = typeof value === 'string' ? parseInt(value, 10) : NaN
  return !isNaN(n) && n > 0 ? n : 100
}

/** getSetting не логирует через writeServerLog — вызывается из logger.lib (getLogLevel, getLogWebhook), рекурсия. */
export async function getSetting(ctx: app.Ctx, key: string): Promise<unknown> {
  const row = await repo.findByKey(ctx, key)
  if (row && row.value !== undefined && row.value !== null) {
    return row.value
  }
  return (DEFAULTS as Record<string, unknown>)[key] ?? null
}

/**
 * Получить настройку как строку.
 */
export async function getSettingString(ctx: app.Ctx, key: string): Promise<string> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getSettingString entry`,
    payload: { key }
  })
  const value = await getSetting(ctx, key)
  const result =
    typeof value === 'string' ? value : String((DEFAULTS as Record<string, unknown>)[key] ?? '')
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getSettingString exit`,
    payload: { key, value, result }
  })
  return result
}

/** getLogLevel не логирует через writeServerLog — вызывается из logger.lib, рекурсия. */
export async function getLogLevel(ctx: app.Ctx): Promise<LogLevel> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_LEVEL)
  return isLogLevel(value) ? value : (DEFAULTS[SETTING_KEYS.LOG_LEVEL] as LogLevel)
}

/**
 * Получить лимит логов (число).
 */
export async function getLogsLimit(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getLogsLimit entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.LOGS_LIMIT)
  const result = parseLogsLimit(value)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getLogsLimit exit`,
    payload: { value, result }
  })
  return result
}

function isLogWebhook(value: unknown): value is LogWebhookSetting {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return typeof o.enable === 'boolean' && typeof o.url === 'string'
}

/** getLogWebhook не логирует через writeServerLog — вызывается из logger.lib, рекурсия. */
export async function getLogWebhook(ctx: app.Ctx): Promise<LogWebhookSetting> {
  const value = await getSetting(ctx, SETTING_KEYS.LOG_WEBHOOK)
  return isLogWebhook(value) ? value : DEFAULTS[SETTING_KEYS.LOG_WEBHOOK]
}

/**
 * Получить таймштамп сброса дашборда (Unix ms). При отсутствии — 0 (учитываются все логи).
 */
export async function getDashboardResetAt(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardResetAt entry`,
    payload: {}
  })
  const value = await getSetting(ctx, SETTING_KEYS.DASHBOARD_RESET_AT)
  const result =
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getDashboardResetAt exit`,
    payload: { value, result }
  })
  return result
}

/**
 * Получить все настройки в виде объекта ключ-значение (с дефолтами).
 * gc_school_api_key маскируется: вместо значения отдаётся '', плюс поле gc_school_api_key_set.
 */
export async function getAllSettings(ctx: app.Ctx): Promise<Record<string, unknown>> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings entry`,
    payload: {}
  })
  const rows = await repo.findAll(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings repo.findAll result`,
    payload: { rowsCount: rows.length, keys: rows.map((r) => r.key) }
  })
  const result = { ...DEFAULTS } as Record<string, unknown>
  for (const row of rows) {
    if (row.key && row.value !== undefined && row.value !== null) {
      result[row.key] = row.value
    }
  }
  // Маскируем секрет: передаём факт наличия, не значение
  const apiKeyRaw = result[SETTING_KEYS.GC_SCHOOL_API_KEY]
  const apiKeySet = typeof apiKeyRaw === 'string' ? apiKeyRaw.length > 0 : false
  result[SETTING_KEYS.GC_SCHOOL_API_KEY] = ''
  result['gc_school_api_key_set'] = apiKeySet
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getAllSettings exit`,
    payload: { resultKeys: Object.keys(result) }
  })
  return result
}

/**
 * Сохранить настройку. Валидирует значение для известных ключей.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: { key, value: key === SETTING_KEYS.GC_SCHOOL_API_KEY ? '[masked]' : value }
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
      throw new Error(
        `Недопустимый уровень логирования: ${str}. Допустимо: ${LOG_LEVELS.join(', ')}`
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
      throw new Error(`Лимит логов должен быть от 1 до 10000, получено: ${value}`)
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
      throw new Error('log_webhook должен быть объектом { enable: boolean, url: string }')
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
      throw new Error('dashboard_reset_at должен быть неотрицательным числом (Unix ms)')
    }
    normalized = Math.floor(n)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting DASHBOARD_RESET_AT branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.WHEEL_ENABLED) {
    normalized = value === true || value === 'true' || value === 1
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WHEEL_ENABLED branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.WHEEL_MAX_SPINS) {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10)
    if (!Number.isFinite(n) || n < 1) {
      throw new Error('wheel_max_spins должен быть положительным целым числом')
    }
    normalized = Math.floor(n)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WHEEL_MAX_SPINS branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GATEWAY_BASE_URL) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    if (str.length > 0 && !str.startsWith('http://') && !str.startsWith('https://')) {
      throw new Error('gateway_base_url должен начинаться с http:// или https://')
    }
    normalized = str.replace(/\/+$/, '')
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GATEWAY_BASE_URL branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GC_SCHOOL_HOST) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    // Срезаем схему и путь, оставляем только host
    const withoutScheme = str.replace(/^https?:\/\//, '')
    normalized = withoutScheme.split('/')[0] ?? ''
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_SCHOOL_HOST branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GC_SCHOOL_API_KEY) {
    normalized = typeof value === 'string' ? value.trim() : String(value).trim()
    // Секрет — не логируем значение, только факт
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GC_SCHOOL_API_KEY branch`,
      payload: { hasValue: (normalized as string).length > 0 }
    })
  } else if (key === SETTING_KEYS.GETCOURSE_REQUIRE_USER) {
    normalized = value === true || value === 'true' || value === 1
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GETCOURSE_REQUIRE_USER branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GETCOURSE_REQUIRED_GROUP_IDS) {
    // Приводим к массиву положительных целых id, дубликаты убираем
    const raw = Array.isArray(value) ? value : []
    const ids = Array.from(
      new Set(
        raw
          .map((v: unknown) => {
            const n = typeof v === 'number' ? v : parseInt(String(v), 10)
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
          })
          .filter((n): n is number => n !== null)
      )
    )
    // Пустой массив запрещён, если require_group=true
    if (ids.length === 0) {
      const requireGroup = await getSetting(ctx, SETTING_KEYS.GETCOURSE_REQUIRE_GROUP)
      if (requireGroup === true) {
        throw new Error('Выберите хотя бы одну группу')
      }
    }
    normalized = ids
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GETCOURSE_REQUIRED_GROUP_IDS branch`,
      payload: { count: ids.length }
    })
  } else if (key === SETTING_KEYS.GETCOURSE_REQUIRE_GROUP) {
    const boolVal = value === true || value === 'true' || value === 1
    if (boolVal) {
      // Требуем непустой сохранённый required_group_ids
      const savedIds = await getSetting(ctx, SETTING_KEYS.GETCOURSE_REQUIRED_GROUP_IDS)
      const ids = Array.isArray(savedIds) ? savedIds : []
      if (ids.length === 0) {
        throw new Error('Выберите хотя бы одну группу')
      }
      // Group влечёт User — принудительно сохраняем require_user=true
      await repo.upsert(ctx, SETTING_KEYS.GETCOURSE_REQUIRE_USER, true)
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] setSetting GETCOURSE_REQUIRE_GROUP: принудительно require_user=true`,
        payload: {}
      })
    }
    normalized = boolVal
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GETCOURSE_REQUIRE_GROUP branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.GETCOURSE_ISSUE_REWARDS) {
    normalized = value === true || value === 'true' || value === 1
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting GETCOURSE_ISSUE_REWARDS branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.THEME) {
    const str = typeof value === 'string' ? value.trim() : String(value).trim()
    const validIds = THEMES.map((t) => t.id)
    if (!validIds.includes(str)) {
      throw new Error(`Неизвестная тема: ${str}. Допустимо: ${validIds.join(', ')}`)
    }
    normalized = str
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting THEME branch`,
      payload: { normalized }
    })
  } else if (key === SETTING_KEYS.WHEEL_BRAND_LABEL) {
    normalized = (typeof value === 'string' ? value : String(value ?? '')).trim()
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] setSetting WHEEL_BRAND_LABEL branch`,
      payload: { length: (normalized as string).length }
    })
  }

  await repo.upsert(ctx, key, normalized)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized: key === SETTING_KEYS.GC_SCHOOL_API_KEY ? '[masked]' : normalized }
  })
}

// ---------------------------------------------------------------------------
// Новые getter'ы (§9)
// ---------------------------------------------------------------------------

/** Включено ли колесо. */
export async function getWheelEnabled(ctx: app.Ctx): Promise<boolean> {
  const value = await getSetting(ctx, SETTING_KEYS.WHEEL_ENABLED)
  return value === true || value === 'true'
}

/** Базовый лимит попыток на один email. */
export async function getWheelMaxSpins(ctx: app.Ctx): Promise<number> {
  const value = await getSetting(ctx, SETTING_KEYS.WHEEL_MAX_SPINS)
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value)
  }
  const n = typeof value === 'string' ? parseInt(value, 10) : NaN
  return !isNaN(n) && n >= 1 ? n : (DEFAULTS[SETTING_KEYS.WHEEL_MAX_SPINS] as number)
}

/** Базовый URL gateway GetCourse (без хвостового /). */
export async function getGatewayBaseUrl(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GATEWAY_BASE_URL)
  return typeof value === 'string' ? value : ''
}

/** Хост школы GetCourse (только host). */
export async function getGcSchoolHost(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GC_SCHOOL_HOST)
  return typeof value === 'string' ? value : ''
}

/**
 * Секретный ключ API школы GetCourse.
 * Не логировать значение — только факт наличия (§18).
 */
export async function getGcSchoolApiKey(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.GC_SCHOOL_API_KEY)
  return typeof value === 'string' ? value : ''
}

/**
 * Эффективные флаги gating GetCourse (§9).
 * requireGroup влечёт requireUser.
 */
export async function getGetcourseGating(ctx: app.Ctx): Promise<GetcourseGating> {
  const [rawRequireUser, rawRequireGroup, rawGroupIds] = await Promise.all([
    getSetting(ctx, SETTING_KEYS.GETCOURSE_REQUIRE_USER),
    getSetting(ctx, SETTING_KEYS.GETCOURSE_REQUIRE_GROUP),
    getSetting(ctx, SETTING_KEYS.GETCOURSE_REQUIRED_GROUP_IDS)
  ])

  const rawIds = Array.isArray(rawGroupIds) ? rawGroupIds : []
  const requiredGroupIds: number[] = rawIds
    .map((v: unknown) => {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10)
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    })
    .filter((n): n is number => n !== null)

  const requireGroup = rawRequireGroup === true && requiredGroupIds.length > 0
  const requireUser = rawRequireUser === true || requireGroup

  return { requireUser, requireGroup, requiredGroupIds }
}

/** Активная тема оформления. */
export async function getTheme(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.THEME)
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  return DEFAULTS[SETTING_KEYS.THEME] as string
}

/** Подпись бренда на странице колеса (настраивается в админке). */
export async function getWheelBrandLabel(ctx: app.Ctx): Promise<string> {
  const value = await getSetting(ctx, SETTING_KEYS.WHEEL_BRAND_LABEL)
  if (typeof value === 'string') {
    return value
  }
  return DEFAULTS[SETTING_KEYS.WHEEL_BRAND_LABEL] as string
}

// ---------------------------------------------------------------------------
// Экспорт/импорт настроек (бэкап для сохранения/восстановления/переноса)
// ---------------------------------------------------------------------------

/**
 * Полный набор настроек для бэкапа: эффективные значения всех известных ключей
 * (DEFAULTS, перекрытые сохранёнными). В ОТЛИЧИЕ от getAllSettings секрет
 * gc_school_api_key НЕ маскируется — иначе бэкап нельзя восстановить/перенести.
 * Возвращает только известные ключи SETTING_KEYS (без служебного gc_school_api_key_set).
 * Использовать только в Admin-эндпоинте экспорта. Значение секрета не логируем (§18).
 */
export async function getBackupSettings(ctx: app.Ctx): Promise<Record<string, unknown>> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getBackupSettings entry`,
    payload: {}
  })
  const rows = await repo.findAll(ctx)
  const stored: Record<string, unknown> = {}
  for (const row of rows) {
    if (row.key && row.value !== undefined && row.value !== null) {
      stored[row.key] = row.value
    }
  }
  const result: Record<string, unknown> = {}
  for (const key of Object.values(SETTING_KEYS)) {
    result[key] = key in stored ? stored[key] : ((DEFAULTS as Record<string, unknown>)[key] ?? null)
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] getBackupSettings exit`,
    payload: {
      keys: Object.keys(result),
      apiKeySet:
        typeof result[SETTING_KEYS.GC_SCHOOL_API_KEY] === 'string' &&
        (result[SETTING_KEYS.GC_SCHOOL_API_KEY] as string).length > 0
    }
  })
  return result
}

/** Служебные ключи, которые не являются настройками и в импорте игнорируются. */
const NON_SETTING_KEYS = new Set<string>(['gc_school_api_key_set'])

/**
 * Применяет настройки из бэкапа. Игнорирует неизвестные ключи (не из SETTING_KEYS)
 * и служебные поля. Секрет gc_school_api_key с пустым значением пропускается —
 * чтобы случайно не затереть рабочий ключ при импорте маскированного файла.
 *
 * Порядок применения важен из-за межключевых зависимостей gating (§9):
 * сначала нейтрализуем GETCOURSE_REQUIRE_GROUP, затем применяем все ключи
 * (включая required_group_ids и require_user), затем выставляем require_group
 * последним (его валидация требует непустой required_group_ids).
 * Возвращает список применённых и пропущенных ключей.
 */
export async function applyBackupSettings(
  ctx: app.Ctx,
  settings: Record<string, unknown>
): Promise<{ applied: string[]; skipped: string[] }> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] applyBackupSettings entry`,
    payload: { incomingKeys: Object.keys(settings) }
  })

  const knownKeys = new Set<string>(Object.values(SETTING_KEYS))
  const applied: string[] = []
  const skipped: string[] = []

  // Нейтрализуем require_group, чтобы валидации required_group_ids/require_group не падали
  await setSetting(ctx, SETTING_KEYS.GETCOURSE_REQUIRE_GROUP, false)

  // require_group применяем последним
  const deferred = SETTING_KEYS.GETCOURSE_REQUIRE_GROUP as string

  for (const [key, value] of Object.entries(settings)) {
    if (NON_SETTING_KEYS.has(key)) {
      skipped.push(key)
      continue
    }
    if (!knownKeys.has(key)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] applyBackupSettings: неизвестный ключ пропущен`,
        payload: { key }
      })
      skipped.push(key)
      continue
    }
    if (key === deferred) {
      continue
    }
    // Не затираем рабочий секрет пустым значением (маскированный экспорт)
    if (
      key === SETTING_KEYS.GC_SCHOOL_API_KEY &&
      (typeof value !== 'string' || value.trim() === '')
    ) {
      skipped.push(key)
      continue
    }
    try {
      await setSetting(ctx, key, value)
      applied.push(key)
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] applyBackupSettings: ошибка применения ключа`,
        payload: { key, error: String(error) }
      })
      skipped.push(key)
    }
  }

  // require_group — последним, если присутствует в бэкапе
  if (deferred in settings) {
    try {
      await setSetting(ctx, deferred, settings[deferred])
      applied.push(deferred)
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] applyBackupSettings: ошибка применения require_group`,
        payload: { error: String(error) }
      })
      skipped.push(deferred)
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 4,
    message: `[${LOG_MODULE}] applyBackupSettings exit`,
    payload: { appliedCount: applied.length, skippedCount: skipped.length, skipped }
  })
  return { applied, skipped }
}
