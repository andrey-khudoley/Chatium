/** Название проекта по умолчанию (если в настройках не задано) */
export const DEFAULT_PROJECT_TITLE = 'Assistant'

/** Имя страницы: для главной и профиля */
export const INDEX_PAGE_NAME = 'Главная'
export const PROFILE_PAGE_NAME = 'Профиль'
export const ADMIN_PAGE_NAME = 'Админка'
export const TESTS_PAGE_NAME = 'Тесты'
export const JOURNAL_PAGE_NAME = 'Мой журнал'
export const TASKS_PAGE_NAME = 'Управление задачами'
export const TOOLS_PAGE_NAME = 'Инструменты'
export const POMODORO_PAGE_NAME = 'Таймеры'

/** Текст для <title>: "Название страницы - Название из настроек" */
export function getPageTitle(pageName: string, projectName: string): string {
  return `${pageName} - ${projectName}`
}

/** Текст для шапки (h1): "Название из настроек / Название страницы" */
export function getHeaderText(pageName: string, projectName: string): string {
  return `${projectName} / ${pageName}`
}

/** Текст контента домашней страницы (заголовок) */
export const BODY_TEXT = 'Assistant'

/** Подзаголовок домашней страницы */
export const BODY_SUBTEXT = 'В разработке'
