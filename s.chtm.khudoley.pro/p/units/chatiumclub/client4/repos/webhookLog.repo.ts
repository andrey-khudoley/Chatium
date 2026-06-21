import WebhookLog, { type WebhookLogRow } from '../tables/webhookLog.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/webhookLog.repo'

export type WebhookStatus =
  | 'queued'
  | 'delivered'
  | 'already_processed'
  | 'invalid_token'
  | 'error'
  | 'user_not_found'

export type WebhookLogCreateData = {
  gcEventId?: string
  eventType: string
  email?: string
  activityId?: string
  activityName?: string
  tokenValid: boolean
  reactionOk: boolean
  reactionErrorCode?: string
  gatewayRequestId?: string
  status: WebhookStatus
}

export async function create(ctx: app.Ctx, data: WebhookLogCreateData): Promise<WebhookLogRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: {
      gcEventId: data.gcEventId ?? '',
      eventType: data.eventType,
      tokenValid: data.tokenValid,
      reactionOk: data.reactionOk,
      status: data.status
    }
  })
  const row = await WebhookLog.create(ctx, {
    gcEventId: data.gcEventId ?? '',
    eventType: data.eventType,
    email: data.email ?? '',
    activityId: data.activityId ?? '',
    activityName: data.activityName ?? '',
    tokenValid: data.tokenValid,
    reactionOk: data.reactionOk,
    reactionErrorCode: data.reactionErrorCode ?? '',
    gatewayRequestId: data.gatewayRequestId ?? '',
    status: data.status,
    receivedAt: Date.now()
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { id: row.id }
  })
  return row
}

export async function findByGcEventId(
  ctx: app.Ctx,
  gcEventId: string
): Promise<WebhookLogRow | null> {
  if (!gcEventId) return null
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByGcEventId entry`,
    payload: { gcEventId }
  })
  const rows = await WebhookLog.findAll(ctx, {
    where: { gcEventId },
    order: [{ receivedAt: 'desc' }],
    limit: 1
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByGcEventId exit`,
    payload: { gcEventId, found: rows.length > 0 }
  })
  return rows[0] ?? null
}

export async function findRecent(ctx: app.Ctx, limit: number = 50): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent entry`,
    payload: { limit }
  })
  const rows = await WebhookLog.findAll(ctx, {
    order: [{ receivedAt: 'desc' }],
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
  return WebhookLog.countBy(ctx, {})
}
