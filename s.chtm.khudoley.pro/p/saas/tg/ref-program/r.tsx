// @shared
/**
 * GET /r?linkId=… — страница перехода по партнёрской ссылке (фича 3).
 * Рендерит страницу с надписью «Регистрация» на время инициализации Clarity, затем редирект.
 * Запрос обрабатывается с контекстом (app.html): visitorId = ctx.user?.id ?? cookie ref_visitor — для надёжной дедупликации визитов.
 */

import { jsx } from '@app/html-jsx'
import * as linkRepo from './lib/repo/linkRepo'
import * as pageRepo from './lib/repo/pageRepo'
import * as visitRepo from './lib/repo/visitRepo'
import { computeFingerprint } from './lib/core/fingerprint'
import { generateUrlSafeId } from './lib/core/refGenerator'
import { substituteRef } from './lib/core/urlBuilder'

const COOKIE_VISITOR = 'ref_visitor'
const COOKIE_MAX_AGE_DAYS = 365
const CLARITY_DELAY_MS = 2000

/** Парсинг заголовка Cookie в объект name -> value */
function parseCookie(req: app.Req): Record<string, string> {
  const raw = (req as { headers?: Record<string, string> }).headers?.['cookie']
  if (!raw || typeof raw !== 'string') return {}
  const out: Record<string, string> = {}
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (name) out[name] = value
  }
  return out
}

/** Экранирование URL для вставки в JS-строку в атрибуте (одинарные кавычки) */
function escapeUrlForScript(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

/**
 * Роут: GET /r?linkId=<linkSlug>.
 * Рендерит HTML-страницу «Регистрация», подключает Clarity, через CLARITY_DELAY_MS перенаправляет на urlTemplate с ref.
 * URL: /p/saas/ref/r?linkId=...
 */
export const redirectRoute = app.html('/', async (ctx, req) => {
  const raw = req.query?.linkId
  const linkId = typeof raw === 'string' ? raw.trim() : undefined
  if (!linkId) {
    return (
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Ссылка не найдена</title>
        </head>
        <body>
          <p>Ссылка не найдена</p>
        </body>
      </html>
    )
  }

  const link = await linkRepo.findLinkByPublicSlug(ctx, linkId)
  if (!link) {
    return (
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Ссылка не найдена</title>
        </head>
        <body>
          <p>Ссылка не найдена</p>
        </body>
      </html>
    )
  }

  const campaignId = link.campaignId?.id
  const partnerId = link.partnerId?.id
  const pageId = link.pageId?.id
  const partnerLinkId = link.id

  if (!campaignId || !partnerId || !pageId || !partnerLinkId) {
    return (
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Ссылка не найдена</title>
        </head>
        <body>
          <p>Ссылка не найдена</p>
        </body>
      </html>
    )
  }

  const page = await pageRepo.getPageById(ctx, pageId)
  if (!page || !page.urlTemplate || typeof page.urlTemplate !== 'string') {
    return (
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Страница не найдена</title>
        </head>
        <body>
          <p>Страница не найдена</p>
        </body>
      </html>
    )
  }

  const cookies = parseCookie(req)
  const visitorIdFromContext = ctx.user?.id ?? cookies[COOKIE_VISITOR]
  let visitorId: string = visitorIdFromContext ?? ''
  if (!visitorId) {
    visitorId = generateUrlSafeId(16)
    const resp = ctx.resp as {
      cookie?: (
        name: string,
        value: string,
        opts?: { maxAge?: number; httpOnly?: boolean; sameSite?: string; path?: string }
      ) => void
    }
    if (typeof resp.cookie === 'function') {
      resp.cookie(COOKIE_VISITOR, visitorId, {
        maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      })
    }
  }

  const fingerprintResult = computeFingerprint(req)
  const fingerprintWithVisitor =
    visitorIdFromContext != null && visitorIdFromContext !== ''
      ? { ...fingerprintResult.parts, visitorId: visitorIdFromContext }
      : fingerprintResult.parts
  const { ref } = await visitRepo.createVisit(ctx, {
    campaignId,
    partnerLinkId,
    partnerId,
    pageId,
    fingerprint: fingerprintWithVisitor
  })

  const finalUrl = substituteRef(page.urlTemplate, ref)
  const finalUrlEscaped = escapeUrlForScript(finalUrl)

  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Регистрация</title>
        <script src="/s/metric/clarity.js"></script>
        <style>{`
          body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; color: #e0e0e0; font-family: system-ui, sans-serif; }
          .label { font-size: 1.25rem; letter-spacing: 0.05em; }
        `}</style>
      </head>
      <body>
        <p class="label">Регистрация</p>
        <script>{`(function(){var u='${finalUrlEscaped}';setTimeout(function(){window.location.href=u;},${CLARITY_DELAY_MS});})();`}</script>
      </body>
    </html>
  )
})
