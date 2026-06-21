/**
 * Репозиторий партнёров (partners).
 * getOrCreatePartner — создание или получение по (campaignId, tgId);
 * getPartnerById — чтение.
 */

import type { PartnerRow, PartnerStats, TelegramUser } from '../../shared/types'
import Partners from '../../tables/partners.table'

const DEFAULT_STATS: PartnerStats = {
  registrations: 0,
  orders: 0,
  payments: 0,
  paymentsSum: 0,
  earnings: 0,
  pendingEarnings: 0
}

function fullNameFromTgUser(tg: TelegramUser): string {
  const first = tg.first_name || ''
  const last = tg.last_name || ''
  return [first, last].filter(Boolean).join(' ').trim() || 'Партнёр'
}

/**
 * Создаёт партнёра или возвращает существующего по campaignId и tgId.
 * При создании заполняет username, fullName из Telegram и начальные stats.
 */
export async function getOrCreatePartner(
  ctx: app.Ctx,
  campaignId: string,
  tgUser: TelegramUser
): Promise<{ partner: PartnerRow; isNew: boolean }> {
  const tgId = String(tgUser.id)
  const existing = await Partners.findOneBy(ctx, {
    campaignId,
    tgId
  })
  if (existing) {
    const updated = await Partners.update(ctx, {
      id: existing.id,
      username: tgUser.username ?? existing.username,
      fullName: fullNameFromTgUser(tgUser) || existing.fullName
    })
    return { partner: updated as PartnerRow, isNew: false }
  }
  const created = await Partners.create(ctx, {
    campaignId,
    tgId,
    username: tgUser.username ?? undefined,
    fullName: fullNameFromTgUser(tgUser),
    stats: DEFAULT_STATS
  })
  return { partner: created as PartnerRow, isNew: true }
}

/**
 * Возвращает партнёра по id или null.
 */
export async function getPartnerById(ctx: app.Ctx, partnerId: string): Promise<PartnerRow | null> {
  const row = await Partners.findById(ctx, partnerId)
  return row as PartnerRow | null
}

export interface ListPartnersInput {
  limit?: number
  offset?: number
  sortBy?: 'fullName' | 'id'
  order?: 'asc' | 'desc'
}

/**
 * Список партнёров кампании с пагинацией и сортировкой.
 */
export async function listPartners(
  ctx: app.Ctx,
  campaignId: string,
  opts: ListPartnersInput = {}
): Promise<{ partners: PartnerRow[]; total: number }> {
  const limit = Math.min(opts.limit ?? 20, 100)
  const offset = opts.offset ?? 0
  const order = opts.order ?? 'desc'
  const sortKey = opts.sortBy === 'fullName' ? 'fullName' : 'id'
  const [partners, total] = await Promise.all([
    Partners.findAll(ctx, {
      where: { campaignId },
      order: [{ [sortKey]: order }],
      limit,
      offset
    }),
    Partners.countBy(ctx, { campaignId })
  ])
  return { partners: partners as PartnerRow[], total }
}

export interface UpdatePartnerStatsInput {
  registrations?: number
  orders?: number
  payments?: number
  paymentsSum?: number
}

/**
 * Инкрементирует счётчики статистики партнёра (для фичи 5 — события рефералов).
 */
export async function updatePartnerStats(
  ctx: app.Ctx,
  partnerId: string,
  update: UpdatePartnerStatsInput
): Promise<void> {
  const partner = await Partners.findById(ctx, partnerId)
  if (!partner) return
  const current = (partner.stats as PartnerStats) || DEFAULT_STATS
  const next: PartnerStats = {
    registrations: current.registrations + (update.registrations ?? 0),
    orders: current.orders + (update.orders ?? 0),
    payments: current.payments + (update.payments ?? 0),
    paymentsSum: current.paymentsSum + (update.paymentsSum ?? 0),
    earnings: current.earnings,
    pendingEarnings: current.pendingEarnings
  }
  await Partners.update(ctx, {
    id: partnerId,
    stats: next
  })
}
