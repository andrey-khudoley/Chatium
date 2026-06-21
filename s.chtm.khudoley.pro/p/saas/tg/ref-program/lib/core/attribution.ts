/**
 * Атрибуция: по ref получить визит и партнёра (для eventRepo и webhook).
 */

import type { VisitRow } from '../../shared/types'
import * as visitRepo from '../repo/visitRepo'

export interface ResolveByRefResult {
  visit: VisitRow
  partnerId: string
  campaignId: string
}

/**
 * По ref находит визит и возвращает partnerId и campaignId.
 * Используется в eventRepo для привязки событий к партнёру.
 */
export async function resolveByRef(ctx: app.Ctx, ref: string): Promise<ResolveByRefResult | null> {
  const visit = await visitRepo.findVisitByRef(ctx, ref)
  if (!visit) return null
  const partnerId = visit.partnerId?.id
  const campaignId = visit.campaignId?.id
  if (!partnerId || !campaignId) return null
  return { visit, partnerId, campaignId }
}
