// @shared
/**
 * Разбор ответа HTML-маршрута при интеграционных проверках из браузера.
 * Не полагаться только на response.ok (см. inner/docs/048-chatium-http-response-probes.md).
 */

function headerGet(headers: Headers, name: string): string | null {
  return headers.get(name)
}

function looksLikeHtml(text: string): boolean {
  const t = text.slice(0, 4000).toLowerCase()
  return (
    t.includes('<!doctype') ||
    t.includes('<html') ||
    t.includes('__ugc_workspace') ||
    t.includes('перенаправление на страницу входа')
  )
}

export type PageRouteEvaluation = { ok: boolean; detail: string }

/**
 * Оценка после fetch (лучше с `redirect: 'manual'` для первого ответа, либо после follow — финальный status + body).
 */
export function evaluatePageRouteResponse(
  statusCode: number,
  bodyText: string,
  headers: Headers
): PageRouteEvaluation {
  const loc = headerGet(headers, 'location')
  if (statusCode >= 200 && statusCode < 300) {
    if (looksLikeHtml(bodyText)) {
      return { ok: true, detail: `HTTP ${statusCode}, HTML` }
    }
    const trimmed = bodyText.trim()
    if (trimmed.startsWith('{')) {
      try {
        const j = JSON.parse(trimmed) as { success?: boolean; statusCode?: number; reason?: string }
        if (j.success === false) {
          return {
            ok: false,
            detail: `HTTP ${statusCode}, JSON: ${String(j.reason ?? 'success:false').slice(0, 160)}`
          }
        }
        if (typeof j.statusCode === 'number' && j.statusCode >= 400) {
          return { ok: false, detail: `HTTP ${statusCode}, JSON statusCode ${j.statusCode}` }
        }
      } catch {
        /* не JSON */
      }
    }
    return { ok: true, detail: `HTTP ${statusCode}, ${bodyText.length} B` }
  }
  if (statusCode >= 300 && statusCode < 400 && loc) {
    return { ok: true, detail: `HTTP ${statusCode} → ${loc}` }
  }
  if (statusCode >= 400 && statusCode < 500) {
    return { ok: false, detail: `HTTP ${statusCode}${loc ? ` ${loc}` : ''}` }
  }
  if (statusCode >= 500) {
    return { ok: false, detail: `HTTP ${statusCode}` }
  }
  return { ok: false, detail: `HTTP ${statusCode}` }
}
