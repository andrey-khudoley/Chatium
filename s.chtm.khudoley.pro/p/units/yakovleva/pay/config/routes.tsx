// PROJECT_ROOT — путь от корня воркспэйса до проекта (от /)
export const PROJECT_ROOT = 'p/units/yakovleva/pay'

// Базовый путь проекта для формирования ссылок (от корня, без домена)
const BASE_PATH = `/${PROJECT_ROOT}`

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./)
export const ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests',
  panel: './web/panel',
  createBill: './web/create-bill',
  webhook: './webhooks/lifepay',
  webhookLavatop: './webhooks/lavatop',
  webhookLavatopStatus: './webhooks/lavatop/status',
  accessInvite: './web/access/invite',
  forbidden: './web/forbidden',
  widgetConfig: './api/widgets/config',
  widgetIntentLifepay: './api/widgets/intent-lifepay',
  widgetIntentLavatop: './api/widgets/intent-lavatop',
  widgetSettingsGet: './api/widgets/settings-get',
  widgetSettingsSave: './api/widgets/settings-save',
  widgetOffers: './api/widgets/offers',
  widgetIntentByDeal: './api/widgets/intent-by-deal',
  pluginSettingsGet: './api/plugins/settings-get',
  pluginSettingsSave: './api/plugins/settings-save',
  pluginSettingReveal: './api/plugins/setting-reveal',
  pluginLavatopCatalog: './api/plugins/lavatop-catalog',
  paymentPageConfig: './api/payment-page/config',
  paymentPageSettingsGet: './api/payment-page/settings-get',
  paymentPageSettingsSave: './api/payment-page/settings-save',
  paymentPageMethodCreate: './api/payment-page/method-create',
  paymentPageMethodDelete: './api/payment-page/method-delete',
  paymentPageMethodRename: './api/payment-page/method-rename',
  gatewayInvoke: './api/gateways/invoke',
  gatewayRecentRequests: './api/gateways/recent-requests',
  gatewayRecentWebhooks: './api/gateways/recent-webhooks',
  gatewayAnalyticsSummary: './api/gateways/analytics/summary',
  gatewaySearchByRequestId: './api/gateways/search-by-request-id',
  gatewayRawRequest: './api/gateways/raw-request',
  gatewayRawWebhook: './api/gateways/raw-webhook',
  gatewayLogSearch: './api/gateways/log-search',
  gatewayAnalyticsFilterSave: './api/gateways/analytics/filter-save',
  gatewayPaymentSocket: './api/gateways/payment-socket'
} as const

/** Пути для getFullUrl (абсолютные от корня проекта) */
export const ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests',
  panel: '/web/panel',
  createBill: '/web/create-bill',
  webhook: '/webhooks/lifepay',
  webhookLavatop: '/webhooks/lavatop',
  webhookLavatopStatus: '/webhooks/lavatop/status',
  accessInvite: '/web/access/invite',
  forbidden: '/web/forbidden',
  widgetConfig: '/api/widgets/config',
  widgetIntentLifepay: '/api/widgets/intent-lifepay',
  widgetIntentLavatop: '/api/widgets/intent-lavatop',
  widgetSettingsGet: '/api/widgets/settings-get',
  widgetSettingsSave: '/api/widgets/settings-save',
  widgetOffers: '/api/widgets/offers',
  widgetIntentByDeal: '/api/widgets/intent-by-deal',
  pluginSettingsGet: '/api/plugins/settings-get',
  pluginSettingsSave: '/api/plugins/settings-save',
  pluginSettingReveal: '/api/plugins/setting-reveal',
  pluginLavatopCatalog: '/api/plugins/lavatop-catalog',
  paymentPageConfig: '/api/payment-page/config',
  paymentPageSettingsGet: '/api/payment-page/settings-get',
  paymentPageSettingsSave: '/api/payment-page/settings-save',
  paymentPageMethodCreate: '/api/payment-page/method-create',
  paymentPageMethodDelete: '/api/payment-page/method-delete',
  paymentPageMethodRename: '/api/payment-page/method-rename',
  gatewayInvoke: '/api/gateways/invoke',
  gatewayRecentRequests: '/api/gateways/recent-requests',
  gatewayRecentWebhooks: '/api/gateways/recent-webhooks',
  gatewayAnalyticsSummary: '/api/gateways/analytics/summary',
  gatewaySearchByRequestId: '/api/gateways/search-by-request-id',
  gatewayRawRequest: '/api/gateways/raw-request',
  gatewayRawWebhook: '/api/gateways/raw-webhook',
  gatewayLogSearch: '/api/gateways/log-search',
  gatewayAnalyticsFilterSave: '/api/gateways/analytics/filter-save',
  gatewayPaymentSocket: '/api/gateways/payment-socket'
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
