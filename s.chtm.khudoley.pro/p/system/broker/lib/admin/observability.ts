import { BrokerModules, type BrokerModulesRow } from '../../tables/modules.table'
import { BrokerEvents } from '../../tables/events.table'
import { BrokerDeliveries } from '../../tables/deliveries.table'
import { getLogLevel } from '../log/settings'
import type { BrokerLogLevelSetting } from '../log/settings'

/*
  lib/admin/observability.ts — агрегаты панели наблюдаемости (§5.11, волна 2.5).
  Только чтение: statusCore/metricsCore не мутируют состояние и не содержат
  веток с бизнес-решением — логов здесь нет (тот же принцип, что у readLogs,
  lib/log/read-logs.ts, которая тоже не логирует свои чтения).
*/

export type AdminDeliveryStatusCounts = {
  pending: number
  claimed: number
  acked: number
  dead: number
}

/** Подмножество BrokerModules для админ-панели — БЕЗ authTokenHash/metadata (секрет-гигиена). */
export type AdminModuleRow = {
  moduleKey: string
  displayName: string | null
  source: 'internal' | 'external'
  status: 'onModeration' | 'active' | 'disabled'
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
  pendingPublishTypes: string[] | null
  pendingSubscribeTypes: string[] | null
  claimTimeoutMs: number | null
}

export type AdminStatusResult = {
  fanoutBacklog: number
  deliveriesByStatus: AdminDeliveryStatusCounts
  oldestPendingAgeMs: number | null
  modules: AdminModuleRow[]
  /** Реестр модулей аккаунта целиком (countBy без фильтра) — сверка с modules.length видна усечение потолком findAll. */
  modulesTotal: number
  logLevel: BrokerLogLevelSetting
}

export type AdminMetricsResult = {
  eventsTotal: number
  events24h: number
  eventsByType24h: Array<{ eventType: string; count: number }>
  deliveriesByStatus: AdminDeliveryStatusCounts
  deadRatio: number
  activeModulesCount: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 4 параллельных countBy (не select-агрегация) — контракт плана: гарантия совпадения с «прямыми countBy» из приёмки (admin_status). */
async function countDeliveriesByStatus(ctx: RichUgcCtx): Promise<AdminDeliveryStatusCounts> {
  const [pending, claimed, acked, dead] = await Promise.all([
    BrokerDeliveries.countBy(ctx, { status: 'pending' }),
    BrokerDeliveries.countBy(ctx, { status: 'claimed' }),
    BrokerDeliveries.countBy(ctx, { status: 'acked' }),
    BrokerDeliveries.countBy(ctx, { status: 'dead' })
  ])
  return { pending, claimed, acked, dead }
}

function toAdminModuleRow(row: BrokerModulesRow): AdminModuleRow {
  return {
    moduleKey: row.moduleKey,
    displayName: row.displayName ?? null,
    source: row.source,
    status: row.status,
    allowedPublishTypes: row.allowedPublishTypes,
    allowedSubscribeTypes: row.allowedSubscribeTypes,
    pendingPublishTypes: row.pendingPublishTypes ?? null,
    pendingSubscribeTypes: row.pendingSubscribeTypes ?? null,
    claimTimeoutMs: row.claimTimeoutMs ?? null
  }
}

/**
 * Статус-панель (§5.11 п.2): backlog fan-out, доставки по статусам, возраст
 * старейшей pending, реестр модулей целиком, текущий log_level.
 */
export async function statusCore(ctx: RichUgcCtx): Promise<AdminStatusResult> {
  const fanoutBacklog = await BrokerEvents.countBy(ctx, { dispatchedAt: null })
  const deliveriesByStatus = await countDeliveriesByStatus(ctx)

  const oldestPendingRows = await BrokerDeliveries.findAll(ctx, {
    where: { status: 'pending' },
    order: [{ createdAt: 'asc' }],
    limit: 1
  })
  const oldestPendingAgeMs = oldestPendingRows[0]
    ? Date.now() - oldestPendingRows[0].createdAt.getTime()
    : null

  // Не «реестр целиком» — первые 1000 (потолок findAll). modulesTotal (countBy
  // без фильтра, ниже) даёт видимость усечения на панели: modulesTotal > modules.length.
  const moduleRows = await BrokerModules.findAll(ctx, {
    limit: 1000,
    order: [{ moduleKey: 'asc' }]
  })
  const modules = moduleRows.map(toAdminModuleRow)
  const modulesTotal = await BrokerModules.countBy(ctx)

  const logLevel = await getLogLevel(ctx)

  return { fanoutBacklog, deliveriesByStatus, oldestPendingAgeMs, modules, modulesTotal, logLevel }
}

/**
 * Панель метрик (§5.11 п.3): события всего/за 24ч, разбивка по eventType за
 * 24ч (select-агрегация, 008-heap.md «Агрегации и вычисления»), доставки по
 * статусам, доля dead, число активных модулей.
 */
export async function metricsCore(ctx: RichUgcCtx): Promise<AdminMetricsResult> {
  const eventsTotal = await BrokerEvents.countBy(ctx)
  const since24h = new Date(Date.now() - DAY_MS)
  const events24h = await BrokerEvents.countBy(ctx, { createdAt: { $gte: since24h } })

  const byTypeRows = await BrokerEvents.select({ et: 'eventType', cnt: { $count: ['id'] } })
    .where({ createdAt: { $gte: since24h } })
    .group('et')
    .order([{ cnt: 'desc' }])
    .limit(20)
    .run(ctx)
  const eventsByType24h = byTypeRows.map((r) => ({ eventType: r.et, count: r.cnt }))

  const deliveriesByStatus = await countDeliveriesByStatus(ctx)
  const deliveriesTotal =
    deliveriesByStatus.pending +
    deliveriesByStatus.claimed +
    deliveriesByStatus.acked +
    deliveriesByStatus.dead
  const deadRatio = deliveriesTotal > 0 ? deliveriesByStatus.dead / deliveriesTotal : 0

  const activeModulesCount = await BrokerModules.countBy(ctx, { status: 'active' })

  return {
    eventsTotal,
    events24h,
    eventsByType24h,
    deliveriesByStatus,
    deadRatio,
    activeModulesCount
  }
}
