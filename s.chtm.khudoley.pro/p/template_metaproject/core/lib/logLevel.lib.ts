import { getLogLevel, type LogLevel } from './settings.lib'
import * as loggerLib from './logger.lib'

export { getLogLevelScript } from '../shared/logLevel'
export type { LogLevel }

const LOG_PATH = 'lib/logLevel.lib'

/**
 * Получить уровень логирования для страницы (при серверной генерации).
 * Валидация выполняется в settings.lib.
 */
export async function getLogLevelForPage(ctx: app.Ctx): Promise<LogLevel> {
  const level = await getLogLevel(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] getLogLevelForPage: уровень получен`,
    payload: { level }
  })
  return level
}
