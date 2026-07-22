import { BrokerSettings } from '../../tables/settings.table'

export type BrokerLogLevelSetting = 'Disable' | 'Error' | 'Warn' | 'Info' | 'Debug'

const LOG_LEVEL_KEY = 'log_level'
const VALID_LEVELS: readonly BrokerLogLevelSetting[] = ['Disable', 'Error', 'Warn', 'Info', 'Debug']

// Кэш уровня логирования с TTL (фикс-раунда 1, п.16а) — writeServerLog читает
// getLogLevel на КАЖДЫЙ вызов; без кэша прогон персистентного набора и дренер
// делают сотни лишних Heap-чтений одной и той же настройки. Модуль-уровневый —
// проект однотенантный (один account на копию d/system/broker или p/system/broker).
const CACHE_TTL_MS = 3000
let cached: { value: BrokerLogLevelSetting; expiresAt: number } | null = null

/**
 * Читает настройку уровня логирования (§5.10.8). Невалидное/отсутствующее
 * значение → дефолт 'Info' (§5.10.4). Кэш с TTL ~3с — инвалидируется явно в
 * setLogLevel (п.16а).
 *
 * ⚠️ Инвариант §5.10.9: эта функция НЕ вызывает writeServerLog — она читается
 * ИЗНУТРИ логгера, лог отсюда дал бы бесконечную рекурсию (RangeError на ~1300-м
 * вызове). Не добавляйте сюда логирование.
 */
export async function getLogLevel(ctx: RichUgcCtx): Promise<BrokerLogLevelSetting> {
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.value
  }
  const row = await BrokerSettings.findOneBy(ctx, { key: LOG_LEVEL_KEY })
  const value = row?.value
  const level =
    typeof value === 'string' && (VALID_LEVELS as string[]).includes(value)
      ? (value as BrokerLogLevelSetting)
      : 'Info'
  cached = { value: level, expiresAt: now + CACHE_TTL_MS }
  return level
}

/**
 * Записывает настройку уровня логирования — канонический KV-паттерн
 * findOneBy→createOrUpdateBy заменён на createOrUpdateBy напрямую (снимает
 * гонку записи, findOneBy снаружи не нужен). Инвалидирует кэш getLogLevel
 * немедленно (п.16а) — иначе смена уровня была бы не видна до TTL.
 *
 * ⚠️ Тоже не логирует — тот же инвариант §5.10.9.
 */
export async function setLogLevel(ctx: RichUgcCtx, level: BrokerLogLevelSetting): Promise<void> {
  await BrokerSettings.createOrUpdateBy(ctx, 'key', { key: LOG_LEVEL_KEY, value: level })
  cached = { value: level, expiresAt: Date.now() + CACHE_TTL_MS }
}
