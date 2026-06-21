// PROJECT_ROOT — путь от корня воркспэйса до проекта (от /)
export const PROJECT_ROOT = 'p/saas/tg/ref-program'

// Базовый путь проекта для формирования ссылок (от корня, без домена)
const BASE_PATH = `/${PROJECT_ROOT}`

// Подпуть редиректа партнёрской ссылки (GET /r?linkId=… — в фиче 3)
export const REDIRECT_SUBROUTE = 'r'

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./)
export const ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests',
  invite: './web/invite',
  campaign: './web/campaign'
} as const

/** Пути для getFullUrl (абсолютные от корня проекта) */
export const ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests',
  invite: '/web/invite',
  campaign: '/web/campaign'
} as const

/**
 * Формирует путь для передачи на фронтенд (Vue компоненты, ссылки).
 * От корня "/" через PROJECT_ROOT, без хардкода домена.
 */
export function getFullUrl(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/^\//, '')
  const normalized = clean ? `/${clean}` : '/'
  return `${BASE_PATH}${normalized}`
}

export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}

export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  const clean = subroute.startsWith('/') ? subroute.slice(1) : subroute
  return `${withProjectRoot(route)}~${clean}`
}

/** Базовый URL приложения (для партнёрских ссылок, webhook и т.д.). При необходимости переопределяется через конфигурацию. */
export function getBaseUrl(): string {
  return 'https://srv.aley.pro'
}

/** Полный URL редиректа партнёрской ссылки по slug (query-параметр linkId) */
export function getPartnerRedirectUrl(linkSlug: string): string {
  return getBaseUrl() + getFullUrl(REDIRECT_SUBROUTE) + '?linkId=' + encodeURIComponent(linkSlug)
}

/** URL-шаблон посадочной для тестов роута редиректа (подставьте {ref}) */
export function getRedirectTestLandingUrlTemplate(): string {
  return getBaseUrl() + getFullUrl('web/tests/redirect-landing') + '?ref={ref}'
}

/** Подпуть webhook Telegram (POST). botId передаётся в query, без тильды в адресе. */
export const TELEGRAM_WEBHOOK_SUBROUTE = 'hook/telegram'

/** Полный URL webhook Telegram для бота (для установки в Telegram Bot API). */
export function getTelegramWebhookUrl(botId: string): string {
  return (
    getBaseUrl() + getFullUrl(TELEGRAM_WEBHOOK_SUBROUTE) + '?botId=' + encodeURIComponent(botId)
  )
}

/** URL страницы приглашения по токену (path с тильдой: /web/invite~token). */
export function getInvitePageUrl(token: string): string {
  return getFullUrl(ROUTE_PATHS.invite) + '~' + encodeURIComponent(token)
}

/** URL страницы кампании по id (query: /web/campaign?campaignId=…). */
export function getCampaignPageUrl(campaignId: string): string {
  return getFullUrl(ROUTE_PATHS.campaign) + '?campaignId=' + encodeURIComponent(campaignId)
}

/** Извлечь параметр из пути вида /base~param (тильда). */
export function parseTildeParam(fullPath: string, basePath: string): string | null {
  const base = basePath.replace(/\/$/, '')
  if (!fullPath.startsWith(base + '~') && fullPath !== base) return null
  const after = fullPath.slice((base + '~').length)
  return after.split('~')[0] || null
}
