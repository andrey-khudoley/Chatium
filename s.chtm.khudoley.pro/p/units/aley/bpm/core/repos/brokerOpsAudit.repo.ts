import { BrokerOpsAudit, type BrokerOpsAuditRow } from '../tables/brokerOpsAudit.table'

export type AuditCreate = {
  auditId: string
  action: string
  targetType: string
  targetId: string
  adminUserId: string
  reason: string
  before?: unknown
  after?: unknown
  metadata?: unknown
}

export async function create(ctx: app.Ctx, payload: AuditCreate): Promise<BrokerOpsAuditRow> {
  return BrokerOpsAudit.create(ctx, {
    auditId: payload.auditId,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    adminUserId: payload.adminUserId,
    reason: payload.reason,
    before: payload.before ?? null,
    after: payload.after ?? null,
    createdAt: Date.now(),
    metadata: payload.metadata ?? {}
  })
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { action?: string; targetType?: string; targetId?: string; limit?: number } = {}
): Promise<BrokerOpsAuditRow[]> {
  const where: Record<string, unknown> = {}
  if (opts.action) where.action = opts.action
  if (opts.targetType) where.targetType = opts.targetType
  if (opts.targetId) where.targetId = opts.targetId
  return BrokerOpsAudit.findAll(ctx, {
    where: Object.keys(where).length ? where : undefined,
    order: [{ createdAt: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}
