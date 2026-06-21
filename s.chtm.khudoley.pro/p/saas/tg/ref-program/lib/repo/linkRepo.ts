/**
 * Репозиторий партнёрских ссылок (partner_links).
 * getOrCreatePartnerLink — создание или получение по (campaign, partner, page);
 * getPartnerLinks, findLinkByPublicSlug — чтение.
 */

import { generateLinkSlug } from '../core/refGenerator'
import PartnerLinks from '../../tables/partner_links.table'

/**
 * Находит существующую ссылку по (campaignId, partnerId, pageId) или создаёт новую с publicSlug.
 * Возвращает запись партнёрской ссылки.
 */
export async function getOrCreatePartnerLink(
  ctx: app.Ctx,
  campaignId: string,
  partnerId: string,
  pageId: string
): Promise<typeof PartnerLinks.T> {
  const existing = await PartnerLinks.findOneBy(ctx, {
    campaignId,
    partnerId,
    pageId
  })
  if (existing) {
    return existing
  }
  const publicSlug = generateLinkSlug()
  return PartnerLinks.create(ctx, {
    campaignId,
    partnerId,
    pageId,
    publicSlug
  })
}

/**
 * Возвращает список партнёрских ссылок партнёра.
 */
export async function getPartnerLinks(
  ctx: app.Ctx,
  partnerId: string
): Promise<Array<typeof PartnerLinks.T>> {
  return PartnerLinks.findAll(ctx, {
    where: { partnerId },
    limit: 1000
  })
}

/**
 * Находит партнёрскую ссылку по publicSlug (для роута редиректа).
 */
export async function findLinkByPublicSlug(
  ctx: app.Ctx,
  publicSlug: string
): Promise<typeof PartnerLinks.T | null> {
  return PartnerLinks.findOneBy(ctx, { publicSlug })
}

/**
 * Возвращает список партнёрских ссылок кампании.
 */
export async function getCampaignLinks(
  ctx: app.Ctx,
  campaignId: string
): Promise<Array<typeof PartnerLinks.T>> {
  return PartnerLinks.findAll(ctx, {
    where: { campaignId },
    limit: 1000
  })
}
