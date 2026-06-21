// @shared

export type LogLevel = 'Debug' | 'Info' | 'Warn' | 'Error' | 'Disable'

/**
 * Скрипт для установки window.__BOOT__.logLevel на клиенте.
 */
export function getLogLevelScript(logLevel: LogLevel): string {
  return `window.__BOOT__=window.__BOOT__||{};window.__BOOT__.logLevel=${JSON.stringify(logLevel)};`
}
