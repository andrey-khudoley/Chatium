/** Название проекта по умолчанию (если в настройках не задано) */
export const DEFAULT_PROJECT_TITLE = 'Larina Diagnostics'

/** Имя страницы: для админки */
export const ADMIN_PAGE_NAME = 'Диагностика'

/** Текст для <title>: "Название страницы - Название из настроек" */
export function getPageTitle(pageName: string, projectName: string): string {
  return `${pageName} - ${projectName}`
}

/** Текст для шапки (h1): "Название из настроек / Название страницы" */
export function getHeaderText(pageName: string, projectName: string): string {
  return `${projectName} / ${pageName}`
}
