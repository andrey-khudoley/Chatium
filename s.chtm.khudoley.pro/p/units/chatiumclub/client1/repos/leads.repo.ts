import Leads, { type LeadsRow } from '../tables/leads.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/leads.repo'

/**
 * Репозиторий лидов App A — слой работы с Heap-таблицей `Leads`.
 * Только CRUD; бизнес-логика — в `lib/leadFlow.lib.ts`.
 */
export type LeadCreateData = {
  email: string
  name: string
  phone: string
  utmSource?: string
  utmCampaign?: string
  landingId?: string
  addUserOk: boolean
  addUserErrorCode?: string
  createDealOk: boolean
  createDealErrorCode?: string
  gatewayRequestId?: string
}

export async function create(ctx: app.Ctx, data: LeadCreateData): Promise<LeadsRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: {
      email: data.email,
      name: data.name,
      addUserOk: data.addUserOk,
      createDealOk: data.createDealOk,
      gatewayRequestId: data.gatewayRequestId ?? null
    }
  })
  const row = await Leads.create(ctx, {
    email: data.email,
    name: data.name,
    phone: data.phone,
    utmSource: data.utmSource ?? '',
    utmCampaign: data.utmCampaign ?? '',
    landingId: data.landingId ?? '',
    addUserOk: data.addUserOk,
    addUserErrorCode: data.addUserErrorCode ?? '',
    createDealOk: data.createDealOk,
    createDealErrorCode: data.createDealErrorCode ?? '',
    gatewayRequestId: data.gatewayRequestId ?? '',
    createdAt: Date.now()
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { id: row.id }
  })
  return row
}

export async function findRecent(ctx: app.Ctx, limit: number = 50): Promise<LeadsRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent entry`,
    payload: { limit }
  })
  // Тип `order` схлопывается в `never` из-за специфики выводимых типов Heap для
  // многополевой таблицы — оборачиваем приведением, выражение остаётся валидным
  // согласно документации (см. inner/docs/008-heap.md).
  const rows = await Leads.findAll(ctx, {
    order: [{ createdAt: 'desc' }] as any,
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent exit`,
    payload: { count: rows.length }
  })
  return rows
}

export async function countAll(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countAll entry`,
    payload: {}
  })
  const count = await Leads.countBy(ctx, {})
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] countAll exit`,
    payload: { count }
  })
  return count
}
