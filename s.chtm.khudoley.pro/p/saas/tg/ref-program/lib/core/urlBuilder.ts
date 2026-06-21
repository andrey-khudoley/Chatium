/**
 * Построение URL (по плану 9.3).
 * substituteRef — подстановка ref в шаблон; buildPartnerLinkUrl — URL партнёрской ссылки.
 */

import { getPartnerRedirectUrl } from '../../config/routes'

/**
 * Подстановка ref в URL-шаблон (плейсхолдер {ref}).
 */
export function substituteRef(urlTemplate: string, ref: string): string {
  return urlTemplate.replace(/\{ref\}/g, ref)
}

/**
 * Построение полного URL партнёрской ссылки по slug (кликабельная ссылка для редиректа).
 */
export function buildPartnerLinkUrl(linkSlug: string): string {
  return getPartnerRedirectUrl(linkSlug)
}
