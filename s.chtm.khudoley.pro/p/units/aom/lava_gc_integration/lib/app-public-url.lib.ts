import { getFullUrl } from '../config/routes'

/**
 * Абсолютный URL до маршрута приложения (для исходящего `request()` к своему же UGC).
 * Берёт origin/host из `ctx.req.headers` текущего запроса.
 *
 * @param pathFromProjectRoot путь от корня проекта, например `api/integrations/lava/payment-link`
 */
export function getAbsoluteUrlForAppPath(
  ctx: { req?: { headers?: Record<string, string | string[] | undefined> } },
  pathFromProjectRoot: string
): string {
  const headers = ctx.req?.headers
  const originRaw = headers?.origin ?? headers?.Origin
  const origin = typeof originRaw === 'string' ? originRaw.trim() : ''
  const hostRaw = headers?.host ?? headers?.Host
  const host = typeof hostRaw === 'string' ? hostRaw.trim() : ''
  const base = origin || (host ? `https://${host}` : '')
  if (!base) return ''
  const rel = getFullUrl(pathFromProjectRoot)
  return `${base}${rel}`
}
