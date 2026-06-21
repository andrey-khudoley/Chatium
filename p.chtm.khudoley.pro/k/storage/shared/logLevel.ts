/** Уровень логирования для страницы (Storage без настроек — всегда Info). */
export async function getLogLevelForPage(_ctx: app.Ctx): Promise<'Info'> {
  return 'Info'
}

/** Скрипт для установки window.__BOOT__.logLevel на клиенте. */
export function getLogLevelScript(logLevel: string): string {
  return `window.__BOOT__=window.__BOOT__||{};window.__BOOT__.logLevel=${JSON.stringify(logLevel)};`
}
