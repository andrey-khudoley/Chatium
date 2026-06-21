/**
 * Репозиторий визитов (visits).
 * createVisit — создание или получение по fingerprint + campaignId (только незарегистрированные); first-touch атрибуция в рамках кампании.
 * findVisitByRef, markVisitRegistered — чтение/обновление.
 */

import type { FingerprintData } from '../core/fingerprint'
import { hashFingerprintParts } from '../core/fingerprint'
import { generateUrlSafeId } from '../core/refGenerator'
import Visits from '../../tables/visits.table'

const REF_MAX_ATTEMPTS = 20

export interface CreateVisitInput {
  campaignId: string
  partnerLinkId: string
  partnerId: string
  pageId: string
  fingerprint: FingerprintData
}

export interface CreateVisitResult {
  visit: typeof Visits.T
  ref: string
  isNew: boolean
}

/**
 * Создаёт визит или возвращает существующий по fingerprintHash + campaignId среди визитов без регистрации (registeredAt: null).
 * Один и тот же пользователь (fingerprint) в рамках кампании получает один ref до первой регистрации (first-touch атрибуция).
 */
export async function createVisit(
  ctx: app.Ctx,
  data: CreateVisitInput
): Promise<CreateVisitResult> {
  const fingerprintHash = hashFingerprintParts(data.fingerprint)

  const candidates = await Visits.findAll(ctx, {
    where: { campaignId: data.campaignId, fingerprintHash },
    limit: 10
  })
  const existing = candidates.find(
    (v) => v.ref && (v.registeredAt == null || v.registeredAt === undefined)
  )
  if (existing && existing.ref) {
    return { visit: existing, ref: existing.ref, isNew: false }
  }

  let ref: string | null = null
  for (let attempt = 0; attempt < REF_MAX_ATTEMPTS; attempt++) {
    const candidate = generateUrlSafeId(8)
    const byRef = await Visits.findOneBy(ctx, { campaignId: data.campaignId, ref: candidate })
    if (!byRef) {
      ref = candidate
      break
    }
  }
  if (!ref) {
    throw new Error('visitRepo.createVisit: не удалось сгенерировать уникальный ref')
  }

  const clickedAt = new Date()
  const visit = await Visits.create(ctx, {
    campaignId: data.campaignId,
    partnerLinkId: data.partnerLinkId,
    partnerId: data.partnerId,
    pageId: data.pageId,
    ref,
    fingerprintHash,
    fingerprintParts: data.fingerprint,
    clickedAt
  })
  return { visit, ref, isNew: true }
}

/**
 * Находит визит по полю ref.
 */
export async function findVisitByRef(ctx: app.Ctx, ref: string): Promise<typeof Visits.T | null> {
  return Visits.findOneBy(ctx, { ref })
}

/**
 * Устанавливает registeredAt = now для визита с данным ref (для фичи 5).
 */
export async function markVisitRegistered(ctx: app.Ctx, ref: string): Promise<void> {
  const visit = await findVisitByRef(ctx, ref)
  if (!visit) return
  await Visits.update(ctx, {
    id: visit.id,
    registeredAt: new Date()
  })
}
