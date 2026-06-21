/** Название проекта по умолчанию */
export const DEFAULT_PROJECT_TITLE = 'Геткурс документация'

/** Имя страницы: главная */
export const INDEX_PAGE_NAME = 'Документация API'

/** Текст для <title>: "pageName - projectName" */
export function getPageTitle(pageName: string, projectName: string): string {
  return `${pageName} - ${projectName}`
}

/** Текст для шапки контента */
export const BODY_TEXT = 'GetCourse Tech API'

/** Подзаголовок */
export const BODY_SUBTEXT = 'Документация для интеграторов'
