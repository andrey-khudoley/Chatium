export const DEFAULT_PROJECT_TITLE = 'NeSo BPM'

export const INDEX_PAGE_NAME = 'Главная'
export const LOGIN_PAGE_NAME = 'Вход'
export const ADMIN_PAGE_NAME = 'Админка'
export const TESTS_PAGE_NAME = 'Тесты'
export const DESIGN_PAGE_NAME = 'Design Catalog'

export function getPageTitle(pageName: string, projectName: string): string {
  return `${pageName} - ${projectName}`
}

export function getHeaderText(pageName: string, projectName: string): string {
  return `${projectName} / ${pageName}`
}
