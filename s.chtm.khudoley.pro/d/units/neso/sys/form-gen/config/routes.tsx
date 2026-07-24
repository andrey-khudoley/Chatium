// Домен воркспейса — нужен для абсолютных URL (виджет-скрипт и эндпоинт отправки
// исполняются на ЧУЖИХ доменах, откуда withProjectRoot неприменим — §5.1/§5.2 спеки).
export const DOMAIN = 's.chtm.khudoley.pro'

// PROJECT_ROOT — путь от корня воркспейса до этой копии проекта (без ведущего слеша).
// dev-копия (эта) — окружение stage (§0.1 спеки, «пара окружений stage/prod»); в
// prod-копии `p/units/neso/sys/form-gen` значение правится только при переносе кода
// в prod (правило синка воркспейсов, §0 корневого CLAUDE.md), не здесь.
export const PROJECT_ROOT = 'd/units/neso/sys/form-gen'

const BASE_PATH = `/${PROJECT_ROOT}`

// Маршруты — ОТНОСИТЕЛЬНО (через ./), по образцу d/system/broker/config/routes.tsx
export const ROUTES = {
  index: './',
  admin: './web/admin',
  submit: './api/submit',
  saveSettings: './api/admin/save-settings',
  createForm: './api/admin/create-form'
} as const

/** Абсолютные (от корня проекта) пути — для справки/консистентности с шаблоном. */
export const ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  submit: '/api/submit',
  saveSettings: '/api/admin/save-settings',
  createForm: '/api/admin/create-form'
} as const

/**
 * Формирует путь для передачи на фронтенд (Vue-компоненты, ссылки).
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

/**
 * Абсолютный URL виджет-скрипта (§5.1) — вставляется в `<script src>` на ЛЮБОЙ
 * странице, включая внешние домены, поэтому строится от DOMAIN, а не через
 * withProjectRoot (тот годится только для ссылок внутри воркспейса).
 */
export function widgetAbsoluteUrl(slug: string): string {
  // Сегмент `widget` (без `.js`): каталог с расширением в имени (`widget.js/`)
  // отклоняется sync-агентом Chatium («Directory name cannot end with .js»);
  // `.js` в `<script src>` необязателен — URL резолвится из каталога `widget/`.
  return `https://${DOMAIN}/${PROJECT_ROOT}/widget?form=${encodeURIComponent(slug)}`
}

/**
 * Абсолютный URL эндпоинта отправки (§5.2) — вызывается fetch'ем из виджета,
 * исполняемого на чужом домене, поэтому тоже абсолютный.
 */
export function submitAbsoluteUrl(): string {
  return `https://${DOMAIN}/${PROJECT_ROOT}/api/submit`
}
