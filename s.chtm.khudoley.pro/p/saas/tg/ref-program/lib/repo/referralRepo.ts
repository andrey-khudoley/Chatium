/**
 * Репозиторий рефералов (referrals).
 * createOrUpdateReferral — создание или обновление по campaignId + ref (без агрегатов).
 * incrementReferralStats — инкремент счётчиков в таблице referral_aggregates.
 * listReferrals — список рефералов с агрегатами из таблицы referral_aggregates.
 */

import { runWithExclusiveLock } from '@app/sync'
import Referrals from '../../tables/referrals.table'
import ReferralAggregates from '../../tables/referral_aggregates.table'

export interface CreateOrUpdateReferralInput {
  campaignId: string
  partnerId: string
  ref: string
  tgId?: string
  gcId?: string
  name?: string
  email?: string
  phone?: string
}

/**
 * Создаёт реферала или обновляет существующего по campaignId + ref.
 * Агрегаты не записываются (хранятся в отдельной таблице, создаются при первом инкременте).
 */
export async function createOrUpdateReferral(
  ctx: app.Ctx,
  data: CreateOrUpdateReferralInput
): Promise<typeof Referrals.T> {
  const existing = await Referrals.findOneBy(ctx, {
    campaignId: data.campaignId,
    ref: data.ref
  })
  const now = new Date()
  if (existing) {
    const updated = await Referrals.update(ctx, {
      id: existing.id,
      ...(data.tgId != null && { tgId: data.tgId }),
      ...(data.gcId != null && { gcId: data.gcId }),
      ...(data.name != null && data.name !== '' && { name: data.name }),
      ...(data.email != null && data.email !== '' && { email: data.email }),
      ...(data.phone != null && data.phone !== '' && { phone: data.phone })
    })
    return updated
  }
  return Referrals.create(ctx, {
    campaignId: data.campaignId,
    partnerId: data.partnerId,
    ref: data.ref,
    tgId: data.tgId,
    gcId: data.gcId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    registeredAt: now
  })
}

export interface IncrementReferralStatsInput {
  ordersCount?: number
  ordersSum?: number
  paymentsCount?: number
  paymentsSum?: number
}

/**
 * Инкрементирует счётчики реферала в таблице referral_aggregates.
 * Запись агрегатов создаётся лениво при первом вызове. Используется runWithExclusiveLock по referralId.
 */
export async function incrementReferralStats(
  ctx: app.Ctx,
  campaignId: string,
  ref: string,
  update: IncrementReferralStatsInput
): Promise<void> {
  const referral = await Referrals.findOneBy(ctx, { campaignId, ref })
  if (!referral) return

  const lockId = `referral-aggregates:${referral.id}`
  await runWithExclusiveLock(ctx, lockId, {}, async () => {
    let row = await ReferralAggregates.findOneBy(ctx, { referralId: referral.id })
    if (!row) {
      row = await ReferralAggregates.create(ctx, {
        referralId: referral.id,
        campaignId: referral.campaignId ?? campaignId,
        ordersCount: 0,
        ordersSum: 0,
        paymentsCount: 0,
        paymentsSum: 0
      })
    }
    const ordersCount = (row.ordersCount ?? 0) + (update.ordersCount ?? 0)
    const ordersSum = (row.ordersSum ?? 0) + (update.ordersSum ?? 0)
    const paymentsCount = (row.paymentsCount ?? 0) + (update.paymentsCount ?? 0)
    const paymentsSum = (row.paymentsSum ?? 0) + (update.paymentsSum ?? 0)
    await ReferralAggregates.update(ctx, {
      id: row.id,
      ordersCount,
      ordersSum,
      paymentsCount,
      paymentsSum
    })
  })
}

/** Реферал с подставленными агрегатами (для ответов API и списков). */
export type ReferralWithAggregates = typeof Referrals.T & {
  ordersCount: number
  ordersSum: number
  paymentsCount: number
  paymentsSum: number
}

export interface ListReferralsInput {
  partnerId?: string
  dateFrom?: string
  dateTo?: string
  minOrders?: number
  minPayments?: number
  limit?: number
  offset?: number
}

/**
 * Список рефералов кампании с агрегатами из таблицы referral_aggregates.
 * Два запроса: Referrals + ReferralAggregates по campaignId, затем merge в памяти; фильтры minOrders/minPayments по агрегатам.
 */
export async function listReferrals(
  ctx: app.Ctx,
  campaignId: string,
  opts: ListReferralsInput = {}
): Promise<{ referrals: ReferralWithAggregates[]; total: number }> {
  const limit = Math.min(opts.limit ?? 20, 100)
  const offset = opts.offset ?? 0
  const where: Record<string, unknown> = { campaignId }
  if (opts.partnerId) where.partnerId = opts.partnerId

  const hasMemoryFilters =
    opts.dateFrom != null ||
    opts.dateTo != null ||
    opts.minOrders != null ||
    opts.minPayments != null

  if (hasMemoryFilters) {
    const [rows, aggregatesList] = await Promise.all([
      Referrals.findAll(ctx, {
        where,
        order: [{ registeredAt: 'desc' }],
        limit: 2000,
        offset: 0
      }),
      ReferralAggregates.findAll(ctx, {
        where: { campaignId },
        limit: 5000
      })
    ])
    const aggByReferralId = new Map(
      aggregatesList.map((a) => {
        const rid = a.referralId as { id?: string } | string | undefined
        const key =
          typeof rid === 'object' && rid && 'id' in rid ? (rid.id ?? '') : String(rid ?? '')
        return [key, a] as const
      })
    )
    const defaultAgg = {
      ordersCount: 0,
      ordersSum: 0,
      paymentsCount: 0,
      paymentsSum: 0
    }
    let filtered = rows.map((r) => {
      const agg = aggByReferralId.get(r.id) ?? defaultAgg
      return {
        ...r,
        ordersCount: agg.ordersCount ?? 0,
        ordersSum: agg.ordersSum ?? 0,
        paymentsCount: agg.paymentsCount ?? 0,
        paymentsSum: agg.paymentsSum ?? 0
      } as ReferralWithAggregates
    })
    if (opts.dateFrom) {
      const from = new Date(opts.dateFrom).getTime()
      filtered = filtered.filter((r) =>
        r.registeredAt ? new Date(r.registeredAt).getTime() >= from : false
      )
    }
    if (opts.dateTo) {
      const to = new Date(opts.dateTo).getTime()
      filtered = filtered.filter((r) =>
        r.registeredAt ? new Date(r.registeredAt).getTime() <= to : false
      )
    }
    if (opts.minOrders != null) {
      const minOrders = opts.minOrders
      filtered = filtered.filter((r) => r.ordersCount >= minOrders)
    }
    if (opts.minPayments != null) {
      const minPayments = opts.minPayments
      filtered = filtered.filter((r) => r.paymentsCount >= minPayments)
    }
    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)
    return { referrals: paginated, total }
  }

  const [rows, total] = await Promise.all([
    Referrals.findAll(ctx, {
      where,
      order: [{ registeredAt: 'desc' }],
      limit,
      offset
    }),
    Referrals.countBy(ctx, where)
  ])
  if (rows.length === 0) {
    return { referrals: [], total }
  }
  const referralIds = rows.map((r) => r.id)
  const aggregatesList = await ReferralAggregates.findAll(ctx, {
    where: { referralId: referralIds }
  })
  const aggByReferralId = new Map(
    aggregatesList.map((a) => {
      const rid = a.referralId as { id?: string } | string | undefined
      const key = typeof rid === 'object' && rid && 'id' in rid ? (rid.id ?? '') : String(rid ?? '')
      return [key, a] as const
    })
  )
  const defaultAgg = {
    ordersCount: 0,
    ordersSum: 0,
    paymentsCount: 0,
    paymentsSum: 0
  }
  const referrals: ReferralWithAggregates[] = rows.map((r) => {
    const agg = aggByReferralId.get(r.id) ?? defaultAgg
    return {
      ...r,
      ordersCount: agg.ordersCount ?? 0,
      ordersSum: agg.ordersSum ?? 0,
      paymentsCount: agg.paymentsCount ?? 0,
      paymentsSum: agg.paymentsSum ?? 0
    } as ReferralWithAggregates
  })
  return { referrals, total }
}
