/**
 * Библиотека формирования полных URL страниц BPM.
 * Домен берётся из настроек проекта (таблица settings), по умолчанию s.chtm.aley.pro.
 * Путь = базовый путь проекта из config/routes + путь страницы из ROUTES.
 */
import { ROUTES, getFullUrl, getDesignScenarioRoute } from '../config/routes'
import { getProjectDomain } from './settings.lib'

/** Собрать origin (схема + домен) из строки домена. */
export function getOrigin(domain: string): string {
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `https://${domain}`
}

/** Полный URL страницы по относительному пути из ROUTES и домену. */
export function getPageUrl(routePath: string, domain: string): string {
  const origin = getOrigin(domain)
  const path = getFullUrl(routePath)
  return `${origin}${path}`
}

/** Полный URL страницы design-сценария по slug. */
export function getDesignScenarioPageUrl(slug: string, domain: string): string {
  return getPageUrl(getDesignScenarioRoute(slug), domain)
}

export interface BpmNavUrls {
  homeUrl: string
  loginUrl: string
  adminUrl: string
  testsUrl: string
  designUrl: string
  clientsDialogsUrl: string
  /** Функция для получения полного URL страницы design-сценария по slug. */
  getScenarioUrl: (slug: string) => string
}

/** Полный набор URL меню по домену (без обращения к БД). */
export function getBpmNavUrls(domain: string): BpmNavUrls {
  const origin = getOrigin(domain)
  const path = (route: string) => `${origin}${getFullUrl(route)}`
  return {
    homeUrl: path(ROUTES.index),
    loginUrl: path(ROUTES.login),
    adminUrl: path(ROUTES.admin),
    testsUrl: path(ROUTES.tests),
    designUrl: path(ROUTES.design),
    clientsDialogsUrl: path(ROUTES.clientsDialogs),
    getScenarioUrl: (slug: string) => getDesignScenarioPageUrl(slug, domain)
  }
}

/** Получить URL меню из настроек проекта (домен из таблицы settings). */
export async function getBpmNavUrlsAsync(ctx: app.Ctx): Promise<BpmNavUrls> {
  const domain = await getProjectDomain(ctx)
  return getBpmNavUrls(domain)
}
