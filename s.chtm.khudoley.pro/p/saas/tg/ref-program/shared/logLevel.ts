import { getLogLevel, type LogLevel } from '../lib/settings.lib'

/**
 * Получить уровень логирования для страницы (при серверной генерации).
 * Валидация выполняется в settings.lib.
 */
export async function getLogLevelForPage(ctx: app.Ctx): Promise<LogLevel> {
  return getLogLevel(ctx)
}

/**
 * Скрипт для установки window.__BOOT__.logLevel на клиенте.
 */
export function getLogLevelScript(logLevel: LogLevel): string {
  return `window.__BOOT__=window.__BOOT__||{};window.__BOOT__.logLevel=${JSON.stringify(logLevel)};`
}
