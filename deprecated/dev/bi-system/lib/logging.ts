import AnalyticsSettings from '../tables/settings.table'
import { Debug, DebugLevel } from '../shared/debug'

export const LOG_LEVEL_SETTING_KEY = 'log_level'
export const DEFAULT_LOG_LEVEL: DebugLevel = 'error'
const LOG_LEVELS: DebugLevel[] = ['info', 'warn', 'error']
const CACHE_TTL_MS = 60 * 1000

let cachedLevel: DebugLevel = DEFAULT_LOG_LEVEL
let cacheUpdatedAt = 0

function isDebugLevel(value: unknown): value is DebugLevel {
  return typeof value === 'string' && LOG_LEVELS.includes(value as DebugLevel)
}

function normalizeLevel(value?: string | null): DebugLevel {
  return isDebugLevel(value?.toLowerCase())
    ? (value!.toLowerCase() as DebugLevel)
    : DEFAULT_LOG_LEVEL
}

export function getCachedLogLevel(): DebugLevel {
  return cachedLevel
}

export function updateLogLevelCache(level: DebugLevel): void {
  cachedLevel = level
  cacheUpdatedAt = Date.now()
  Debug.setLevel(level)
}

async function ensureLogLevelRecord(ctx: RichUgcCtx): Promise<DebugLevel> {
  const existing = await AnalyticsSettings.findOneBy(ctx, { key: LOG_LEVEL_SETTING_KEY })

  if (!existing) {
    await AnalyticsSettings.create(ctx, {
      key: LOG_LEVEL_SETTING_KEY,
      value: DEFAULT_LOG_LEVEL,
      description: 'Уровень детализации логов Debug (info | warn | error)'
    })
    return DEFAULT_LOG_LEVEL
  }

  const normalized = normalizeLevel(existing.value)
  if (normalized !== existing.value) {
    await AnalyticsSettings.update(ctx, {
      id: existing.id,
      value: normalized
    })
  }

  return normalized
}

export async function applyDebugLevel(
  ctx: RichUgcCtx,
  reason: string = 'auto'
): Promise<DebugLevel> {
  const now = Date.now()

  if (now - cacheUpdatedAt < CACHE_TTL_MS) {
    Debug.setLevel(cachedLevel)
    return cachedLevel
  }

  try {
    const level = await ensureLogLevelRecord(ctx)
    updateLogLevelCache(level)
    Debug.info(ctx, `[debug] уровень логов обновлён (${reason}): ${level}`)
    return level
  } catch (error: any) {
    Debug.warn(
      ctx,
      `[debug] не удалось обновить уровень логов (${reason}): ${error?.message || error}`
    )
    Debug.setLevel(cachedLevel)
    return cachedLevel
  }
}

export async function persistLogLevel(ctx: RichUgcCtx, level: DebugLevel): Promise<void> {
  if (!isDebugLevel(level)) {
    throw Debug.throw(ctx, `Недопустимый уровень логирования: ${level}`, 'E_LOG_LEVEL')
  }

  await AnalyticsSettings.createOrUpdateBy(ctx, 'key', {
    key: LOG_LEVEL_SETTING_KEY,
    value: level,
    description: 'Уровень детализации логов Debug (info | warn | error)'
  })

  updateLogLevelCache(level)
  Debug.info(ctx, `[debug] уровень логов сохранён вручную: ${level}`)
}

export function parseDebugLevel(value: unknown): DebugLevel {
  return normalizeLevel(typeof value === 'string' ? value : undefined)
}
