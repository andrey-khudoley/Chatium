import { getLogLevel, type LogLevel } from '../lib/settings.lib'
import * as loggerLib from '../lib/logger.lib'

const LOG_PATH = 'shared/logLevel'

/**
 * Получить уровень логирования для страницы (при серверной генерации).
 * Валидация выполняется в settings.lib.
 */
export async function getLogLevelForPage(ctx: app.Ctx): Promise<LogLevel> {
  const level = await getLogLevel(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] getLogLevelForPage: уровень получен`,
    payload: { level }
  })
  return level
}

/**
 * Скрипт для установки window.__BOOT__.logLevel на клиенте.
 */
export function getLogLevelScript(logLevel: LogLevel): string {
  return `window.__BOOT__=window.__BOOT__||{};window.__BOOT__.logLevel=${JSON.stringify(logLevel)};`
}
