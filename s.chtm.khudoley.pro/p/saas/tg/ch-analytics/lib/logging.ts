import TgChannelAnalyticsSettings from '../tables/settings.table'
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

export function updateLogLevelCache(level: DebugLevel, ctx?: RichUgcCtx): void {
  const previousLevel = cachedLevel
  cachedLevel = level
  cacheUpdatedAt = Date.now()
  Debug.setLevel(level)
  if (ctx) {
    Debug.info(ctx, `[logging] Кэш уровня логирования обновлён: ${previousLevel} -> ${level}`)
  } else {
    // Если ctx не передан, логируем через console (только для отладки)
    console.log(`[logging] Кэш уровня логирования обновлён: ${previousLevel} -> ${level}`)
  }
}

async function ensureLogLevelRecord(ctx: RichUgcCtx): Promise<DebugLevel> {
  Debug.info(ctx, `[logging] Поиск записи уровня логирования с ключом: ${LOG_LEVEL_SETTING_KEY}`)
  const existing = await TgChannelAnalyticsSettings.findOneBy(ctx, { key: LOG_LEVEL_SETTING_KEY })

  if (!existing) {
    Debug.info(
      ctx,
      `[logging] Запись уровня логирования не найдена, создаём новую с уровнем по умолчанию: ${DEFAULT_LOG_LEVEL}`
    )
    await TgChannelAnalyticsSettings.createOrUpdateBy(ctx, 'key', {
      key: LOG_LEVEL_SETTING_KEY,
      value: DEFAULT_LOG_LEVEL
    })
    Debug.info(ctx, `[logging] Запись уровня логирования успешно создана: ${DEFAULT_LOG_LEVEL}`)
    return DEFAULT_LOG_LEVEL
  }

  Debug.info(ctx, `[logging] Найдена существующая запись уровня логирования: ${existing.value}`)
  const normalized = normalizeLevel(existing.value)

  if (normalized !== existing.value) {
    Debug.warn(
      ctx,
      `[logging] Уровень логирования нормализован: ${existing.value} -> ${normalized}`
    )
    await TgChannelAnalyticsSettings.createOrUpdateBy(ctx, 'key', {
      key: LOG_LEVEL_SETTING_KEY,
      value: normalized
    })
    Debug.info(ctx, `[logging] Запись уровня логирования обновлена: ${normalized}`)
  } else {
    Debug.info(ctx, `[logging] Уровень логирования корректен: ${normalized}`)
  }

  return normalized
}

export async function applyDebugLevel(
  ctx: RichUgcCtx,
  reason: string = 'auto'
): Promise<DebugLevel> {
  const now = Date.now()
  const cacheAge = now - cacheUpdatedAt

  // Устанавливаем уровень из кэша сразу, чтобы последующие логи работали
  Debug.setLevel(cachedLevel)

  Debug.info(
    ctx,
    `[logging] applyDebugLevel вызван (reason: ${reason}), кэш: ${cacheAge}ms назад, TTL: ${CACHE_TTL_MS}ms`
  )

  if (cacheAge < CACHE_TTL_MS) {
    Debug.info(
      ctx,
      `[logging] Используется кэшированный уровень логирования: ${cachedLevel} (кэш актуален)`
    )
    return cachedLevel
  }

  Debug.info(ctx, `[logging] Кэш устарел или отсутствует, загружаем уровень из базы данных`)
  try {
    const level = await ensureLogLevelRecord(ctx)
    updateLogLevelCache(level, ctx)
    Debug.setLevel(level) // Обновляем на актуальный уровень из БД
    Debug.info(ctx, `[logging] Уровень логов обновлён (${reason}): ${level}`)
    return level
  } catch (error: any) {
    Debug.warn(
      ctx,
      `[logging] Не удалось обновить уровень логов (${reason}): ${error?.message || error}`
    )
    Debug.warn(ctx, `[logging] Stack trace: ${error?.stack || 'N/A'}`)
    Debug.warn(ctx, `[logging] Используется кэшированный уровень: ${cachedLevel}`)
    // Уровень уже установлен из кэша в начале функции
    return cachedLevel
  }
}

export async function persistLogLevel(ctx: RichUgcCtx, level: DebugLevel): Promise<void> {
  Debug.info(ctx, `[logging] persistLogLevel вызван с уровнем: ${level}`)

  // Валидация: если уровень невалиден, выбрасываем ошибку и прерываем выполнение
  if (!isDebugLevel(level)) {
    Debug.throw(ctx, `[logging] Недопустимый уровень логирования: ${level}`, 'E_LOG_LEVEL')
    // Код ниже недостижим при невалидном уровне (Debug.throw имеет тип never)
  }

  Debug.info(ctx, `[logging] Сохранение уровня логирования в базу данных: ${level}`)
  await TgChannelAnalyticsSettings.createOrUpdateBy(ctx, 'key', {
    key: LOG_LEVEL_SETTING_KEY,
    value: level
  })
  Debug.info(ctx, `[logging] Уровень логирования успешно сохранён в базу данных: ${level}`)

  Debug.info(ctx, `[logging] Обновление кэша уровня логирования: ${level}`)
  updateLogLevelCache(level, ctx)
  Debug.info(ctx, `[logging] Уровень логов сохранён вручную и применён: ${level}`)
}

export function parseDebugLevel(value: unknown): DebugLevel {
  const normalized = normalizeLevel(typeof value === 'string' ? value : undefined)

  // Логируем только если входное значение было строкой и было нормализовано
  if (typeof value === 'string' && normalized !== value) {
    // Логируем только если была нормализация (но без ctx, так как это утилита)
    console.log(`[logging] parseDebugLevel: нормализация ${value} -> ${normalized}`)
  }

  return normalized
}
