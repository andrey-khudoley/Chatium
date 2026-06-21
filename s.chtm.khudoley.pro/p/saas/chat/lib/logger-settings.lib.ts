import AppSettings from '../tables/app-settings.table'
import * as chatMetricsRepo from '../repos/chat-metrics.repo'

export const LOG_LEVELS = ['Debug', 'Info', 'Warn', 'Error', 'Disable'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const LOG_LEVEL_KEY = 'log_level'
const DEFAULT_LEVEL: LogLevel = 'Info'

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value)
}

/**
 * Получить текущий уровень логирования. Не логирует (вызывается из logger.lib).
 */
export async function getLogLevel(ctx: app.Ctx): Promise<LogLevel> {
  const row = await AppSettings.findOneBy(ctx, { key: LOG_LEVEL_KEY })
  const value = row?.value ?? null
  return isLogLevel(value) ? value : DEFAULT_LEVEL
}

/**
 * Установить уровень логирования (только для админки).
 */
export async function setLogLevel(ctx: app.Ctx, level: LogLevel): Promise<void> {
  if (!isLogLevel(level)) {
    throw new Error(`Недопустимый уровень: ${level}. Допустимо: ${LOG_LEVELS.join(', ')}`)
  }
  const existing = await AppSettings.findOneBy(ctx, { key: LOG_LEVEL_KEY })
  if (existing) {
    await AppSettings.update(ctx, existing.id, { value: level })
  } else {
    await AppSettings.create(ctx, {
      key: LOG_LEVEL_KEY,
      value: level,
      category: 'logging',
      description: 'Уровень логирования (Debug, Info, Warn, Error, Disable)'
    })
  }
}

/**
 * Получить все счётчики событий (для админки).
 */
export async function getMetrics(ctx: app.Ctx): Promise<Record<string, number>> {
  return chatMetricsRepo.getAll(ctx)
}

/**
 * Сбросить все счётчики (для админки).
 */
export async function resetMetrics(ctx: app.Ctx): Promise<void> {
  await chatMetricsRepo.reset(ctx)
}

/**
 * Увеличить счётчик на delta (вызывается из доменной логики / logger при обработке сообщений и ошибок).
 */
export async function incrementMetric(
  ctx: app.Ctx,
  key: keyof typeof chatMetricsRepo.METRIC_KEYS,
  delta?: number
): Promise<void> {
  await chatMetricsRepo.increment(ctx, chatMetricsRepo.METRIC_KEYS[key], delta ?? 1)
}
