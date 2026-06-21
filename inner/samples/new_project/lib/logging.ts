// @shared

import { ProjectSettings } from '../tables/settings.table'
import { Debug, DebugLevel } from '../shared/debug'

export const LOG_LEVEL_SETTING_KEY = 'log_level'
export const LOG_PREFIX_SETTING_KEY = 'log_prefix'
export const ERROR_COUNT_SETTING_KEY = 'error_count'
export const WARN_COUNT_SETTING_KEY = 'warn_count'
export const COUNTERS_RESET_AT_SETTING_KEY = 'counters_reset_at'
export const DEFAULT_LOG_LEVEL: DebugLevel = 'info'
export const DEFAULT_LOG_PREFIX = '[PROJECT]'
const DEFAULT_COUNTER_VALUE = 0
const LOG_LEVELS: DebugLevel[] = ['info', 'warn', 'error']
const CACHE_TTL_MS = 60 * 1000

let cachedLevel: DebugLevel = DEFAULT_LOG_LEVEL
let cachedPrefix: string = DEFAULT_LOG_PREFIX
let cacheUpdatedAt = 0

function isDebugLevel(value: unknown): value is DebugLevel {
  return typeof value === 'string' && LOG_LEVELS.includes(value as DebugLevel)
}

function normalizeLevel(value?: string | null): DebugLevel {
  return isDebugLevel(value?.toLowerCase())
    ? (value!.toLowerCase() as DebugLevel)
    : DEFAULT_LOG_LEVEL
}

function normalizePrefix(value?: string | null): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return DEFAULT_LOG_PREFIX
}

function normalizeCounter(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed))
    }
  }

  return DEFAULT_COUNTER_VALUE
}

export function getCachedLogLevel(): DebugLevel {
  return cachedLevel
}

export function getCachedLogPrefix(): string {
  return cachedPrefix
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

export function updateLogPrefixCache(prefix: string, ctx?: RichUgcCtx): void {
  const previousPrefix = cachedPrefix
  cachedPrefix = prefix
  cacheUpdatedAt = Date.now()
  Debug.setLogPrefix(prefix)
  if (ctx) {
    Debug.info(ctx, `[logging] Кэш префикса логирования обновлён: ${previousPrefix} -> ${prefix}`)
  } else {
    // Если ctx не передан, логируем через console (только для отладки)
    console.log(`[logging] Кэш префикса логирования обновлён: ${previousPrefix} -> ${prefix}`)
  }
}

async function ensureLogLevelRecord(ctx: RichUgcCtx): Promise<DebugLevel> {
  Debug.info(ctx, `[logging] Поиск записи уровня логирования с ключом: ${LOG_LEVEL_SETTING_KEY}`)
  const existing = await ProjectSettings.findOneBy(ctx, { key: LOG_LEVEL_SETTING_KEY })

  if (!existing) {
    Debug.info(
      ctx,
      `[logging] Запись уровня логирования не найдена, создаём новую с уровнем по умолчанию: ${DEFAULT_LOG_LEVEL}`
    )
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
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
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key: LOG_LEVEL_SETTING_KEY,
      value: normalized
    })
    Debug.info(ctx, `[logging] Запись уровня логирования обновлена: ${normalized}`)
  } else {
    Debug.info(ctx, `[logging] Уровень логирования корректен: ${normalized}`)
  }

  return normalized
}

async function ensureLogPrefixRecord(ctx: RichUgcCtx): Promise<string> {
  Debug.info(ctx, `[logging] Поиск записи префикса логирования с ключом: ${LOG_PREFIX_SETTING_KEY}`)
  const existing = await ProjectSettings.findOneBy(ctx, { key: LOG_PREFIX_SETTING_KEY })

  if (!existing) {
    Debug.info(
      ctx,
      `[logging] Запись префикса логирования не найдена, создаём новую с префиксом по умолчанию: ${DEFAULT_LOG_PREFIX}`
    )
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key: LOG_PREFIX_SETTING_KEY,
      value: DEFAULT_LOG_PREFIX
    })
    Debug.info(ctx, `[logging] Запись префикса логирования успешно создана: ${DEFAULT_LOG_PREFIX}`)
    return DEFAULT_LOG_PREFIX
  }

  Debug.info(ctx, `[logging] Найдена существующая запись префикса логирования: ${existing.value}`)
  const normalized = normalizePrefix(existing.value)

  if (normalized !== existing.value) {
    Debug.warn(
      ctx,
      `[logging] Префикс логирования нормализован: ${existing.value} -> ${normalized}`
    )
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key: LOG_PREFIX_SETTING_KEY,
      value: normalized
    })
    Debug.info(ctx, `[logging] Запись префикса логирования обновлена: ${normalized}`)
  } else {
    Debug.info(ctx, `[logging] Префикс логирования корректен: ${normalized}`)
  }

  return normalized
}

async function ensureCounterRecord(ctx: RichUgcCtx, key: string, label: string): Promise<number> {
  Debug.info(ctx, `[logging] Поиск счётчика ${label} с ключом: ${key}`)
  const existing = await ProjectSettings.findOneBy(ctx, { key })

  if (!existing) {
    Debug.info(
      ctx,
      `[logging] Счётчик ${label} не найден, создаём новый со значением: ${DEFAULT_COUNTER_VALUE}`
    )
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key,
      value: DEFAULT_COUNTER_VALUE
    })
    Debug.info(ctx, `[logging] Счётчик ${label} успешно создан: ${DEFAULT_COUNTER_VALUE}`)
    return DEFAULT_COUNTER_VALUE
  }

  const normalized = normalizeCounter(existing.value)

  if (normalized !== existing.value) {
    Debug.warn(ctx, `[logging] Счётчик ${label} нормализован: ${existing.value} -> ${normalized}`)
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key,
      value: normalized
    })
    Debug.info(ctx, `[logging] Счётчик ${label} обновлён: ${normalized}`)
  } else {
    Debug.info(ctx, `[logging] Счётчик ${label} корректен: ${normalized}`)
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

export async function applyLogPrefix(ctx: RichUgcCtx, reason: string = 'auto'): Promise<string> {
  const now = Date.now()
  const cacheAge = now - cacheUpdatedAt

  // Устанавливаем префикс из кэша сразу, чтобы последующие логи работали
  Debug.setLogPrefix(cachedPrefix)

  Debug.info(
    ctx,
    `[logging] applyLogPrefix вызван (reason: ${reason}), кэш: ${cacheAge}ms назад, TTL: ${CACHE_TTL_MS}ms`
  )

  if (cacheAge < CACHE_TTL_MS) {
    Debug.info(
      ctx,
      `[logging] Используется кэшированный префикс логирования: ${cachedPrefix} (кэш актуален)`
    )
    return cachedPrefix
  }

  Debug.info(ctx, `[logging] Кэш устарел или отсутствует, загружаем префикс из базы данных`)
  try {
    const prefix = await ensureLogPrefixRecord(ctx)
    updateLogPrefixCache(prefix, ctx)
    Debug.setLogPrefix(prefix) // Обновляем на актуальный префикс из БД
    Debug.info(ctx, `[logging] Префикс логов обновлён (${reason}): ${prefix}`)
    return prefix
  } catch (error: any) {
    Debug.warn(
      ctx,
      `[logging] Не удалось обновить префикс логов (${reason}): ${error?.message || error}`
    )
    Debug.warn(ctx, `[logging] Stack trace: ${error?.stack || 'N/A'}`)
    Debug.warn(ctx, `[logging] Используется кэшированный префикс: ${cachedPrefix}`)
    // Префикс уже установлен из кэша в начале функции
    return cachedPrefix
  }
}

export async function applyLoggingSettings(
  ctx: RichUgcCtx,
  reason: string = 'auto'
): Promise<{ level: DebugLevel; prefix: string }> {
  const level = await applyDebugLevel(ctx, reason)
  const prefix = await applyLogPrefix(ctx, reason)
  return { level, prefix }
}

export async function persistLogLevel(ctx: RichUgcCtx, level: DebugLevel): Promise<void> {
  Debug.info(ctx, `[logging] persistLogLevel вызван с уровнем: ${level}`)

  // Валидация: если уровень невалиден, выбрасываем ошибку и прерываем выполнение
  if (!isDebugLevel(level)) {
    Debug.throw(ctx, `[logging] Недопустимый уровень логирования: ${level}`, 'E_LOG_LEVEL')
    // Код ниже недостижим при невалидном уровне (Debug.throw имеет тип never)
  }

  Debug.info(ctx, `[logging] Сохранение уровня логирования в базу данных: ${level}`)
  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: LOG_LEVEL_SETTING_KEY,
    value: level
  })
  Debug.info(ctx, `[logging] Уровень логирования успешно сохранён в базу данных: ${level}`)

  Debug.info(ctx, `[logging] Обновление кэша уровня логирования: ${level}`)
  updateLogLevelCache(level, ctx)
  Debug.info(ctx, `[logging] Уровень логов сохранён вручную и применён: ${level}`)
}

export async function persistLogPrefix(ctx: RichUgcCtx, prefix: string): Promise<void> {
  Debug.info(ctx, `[logging] persistLogPrefix вызван с префиксом: ${prefix}`)

  const normalized = normalizePrefix(prefix)

  Debug.info(ctx, `[logging] Сохранение префикса логирования в базу данных: ${normalized}`)
  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: LOG_PREFIX_SETTING_KEY,
    value: normalized
  })
  Debug.info(ctx, `[logging] Префикс логирования успешно сохранён в базу данных: ${normalized}`)

  Debug.info(ctx, `[logging] Обновление кэша префикса логирования: ${normalized}`)
  updateLogPrefixCache(normalized, ctx)
  Debug.info(ctx, `[logging] Префикс логов сохранён вручную и применён: ${normalized}`)
}

export async function getErrorCount(ctx: RichUgcCtx): Promise<number> {
  return ensureCounterRecord(ctx, ERROR_COUNT_SETTING_KEY, 'ошибок')
}

export async function getWarnCount(ctx: RichUgcCtx): Promise<number> {
  return ensureCounterRecord(ctx, WARN_COUNT_SETTING_KEY, 'предупреждений')
}

/**
 * Тихая версия getErrorCount - без логирования.
 * Используется в API получения логов, чтобы избежать рекурсии.
 */
export async function getErrorCountSilent(ctx: RichUgcCtx): Promise<number> {
  const existing = await ProjectSettings.findOneBy(ctx, { key: ERROR_COUNT_SETTING_KEY })
  if (!existing) {
    console.log(
      '[getErrorCountSilent] No existing record found, creating with DEFAULT_COUNTER_VALUE'
    )
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key: ERROR_COUNT_SETTING_KEY,
      value: DEFAULT_COUNTER_VALUE
    })
    return DEFAULT_COUNTER_VALUE
  }
  const value = normalizeCounter(existing.value)
  console.log(`[getErrorCountSilent] Found existing record with value: ${value}`)
  return value
}

/**
 * Тихая версия getWarnCount - без логирования.
 * Используется в API получения логов, чтобы избежать рекурсии.
 */
export async function getWarnCountSilent(ctx: RichUgcCtx): Promise<number> {
  const existing = await ProjectSettings.findOneBy(ctx, { key: WARN_COUNT_SETTING_KEY })
  if (!existing) {
    console.log(
      '[getWarnCountSilent] No existing record found, creating with DEFAULT_COUNTER_VALUE'
    )
    await ProjectSettings.createOrUpdateBy(ctx, 'key', {
      key: WARN_COUNT_SETTING_KEY,
      value: DEFAULT_COUNTER_VALUE
    })
    return DEFAULT_COUNTER_VALUE
  }
  const value = normalizeCounter(existing.value)
  console.log(`[getWarnCountSilent] Found existing record with value: ${value}`)
  return value
}

export async function resetCounters(ctx: RichUgcCtx): Promise<void> {
  const resetAt = new Date().toISOString()

  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: ERROR_COUNT_SETTING_KEY,
    value: DEFAULT_COUNTER_VALUE
  })
  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: WARN_COUNT_SETTING_KEY,
    value: DEFAULT_COUNTER_VALUE
  })
  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: COUNTERS_RESET_AT_SETTING_KEY,
    value: resetAt
  })
}

/**
 * Тихое увеличение счётчика ошибок (без логирования).
 * Используется при сохранении логов, чтобы избежать рекурсии.
 */
export async function incrementErrorCountSilent(ctx: RichUgcCtx): Promise<void> {
  // Получаем текущее значение напрямую, без создания записи
  const existing = await ProjectSettings.findOneBy(ctx, { key: ERROR_COUNT_SETTING_KEY })
  const current = existing ? normalizeCounter(existing.value) : DEFAULT_COUNTER_VALUE

  console.log(
    `[incrementErrorCountSilent] Current error count: ${current}, incrementing to ${current + 1}`
  )

  // Создаём или обновляем запись с новым значением
  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: ERROR_COUNT_SETTING_KEY,
    value: current + 1
  })

  console.log(`[incrementErrorCountSilent] Error count incremented successfully to ${current + 1}`)
}

/**
 * Тихое увеличение счётчика предупреждений (без логирования).
 * Используется при сохранении логов, чтобы избежать рекурсии.
 */
export async function incrementWarnCountSilent(ctx: RichUgcCtx): Promise<void> {
  // Получаем текущее значение напрямую, без создания записи
  const existing = await ProjectSettings.findOneBy(ctx, { key: WARN_COUNT_SETTING_KEY })
  const current = existing ? normalizeCounter(existing.value) : DEFAULT_COUNTER_VALUE

  console.log(
    `[incrementWarnCountSilent] Current warn count: ${current}, incrementing to ${current + 1}`
  )

  // Создаём или обновляем запись с новым значением
  await ProjectSettings.createOrUpdateBy(ctx, 'key', {
    key: WARN_COUNT_SETTING_KEY,
    value: current + 1
  })

  console.log(`[incrementWarnCountSilent] Warn count incremented successfully to ${current + 1}`)
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

export function parseLogPrefix(value: unknown): string {
  const normalized = normalizePrefix(typeof value === 'string' ? value : undefined)

  // Логируем только если входное значение было строкой и было нормализовано
  if (typeof value === 'string' && normalized !== value) {
    // Логируем только если была нормализация (но без ctx, так как это утилита)
    console.log(`[logging] parseLogPrefix: нормализация ${value} -> ${normalized}`)
  }

  return normalized
}
