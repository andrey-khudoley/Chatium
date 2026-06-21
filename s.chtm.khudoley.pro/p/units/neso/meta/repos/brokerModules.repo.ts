import { BrokerModules, type BrokerModulesRow } from '../tables/brokerModules.table'

export type ModuleUpsert = {
  moduleKey: string
  displayName: string
  kind: string
  enabled: boolean
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
  metadata?: unknown
}

export async function findByModuleKey(
  ctx: app.Ctx,
  moduleKey: string
): Promise<BrokerModulesRow | null> {
  return BrokerModules.findOneBy(ctx, { moduleKey })
}

export async function findAll(
  ctx: app.Ctx,
  opts: { limit?: number } = {}
): Promise<BrokerModulesRow[]> {
  return BrokerModules.findAll(ctx, {
    order: [{ updatedAt: 'desc' }],
    limit: opts.limit ?? 500
  } as any)
}

export async function findEnabled(ctx: app.Ctx): Promise<BrokerModulesRow[]> {
  return BrokerModules.findAll(ctx, {
    where: { enabled: true, adminDisabled: false },
    order: [{ moduleKey: 'asc' }],
    limit: 1000
  } as any)
}

export async function upsert(ctx: app.Ctx, payload: ModuleUpsert): Promise<BrokerModulesRow> {
  const now = Date.now()
  const existing = await findByModuleKey(ctx, payload.moduleKey)
  const data = {
    moduleKey: payload.moduleKey,
    displayName: payload.displayName,
    kind: payload.kind,
    enabled: payload.enabled,
    adminDisabled: existing?.adminDisabled ?? false,
    adminDisabledAt: existing?.adminDisabledAt ?? 0,
    adminDisableReason: existing?.adminDisableReason ?? '',
    allowedPublishTypes: payload.allowedPublishTypes,
    allowedSubscribeTypes: payload.allowedSubscribeTypes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    metadata: payload.metadata ?? existing?.metadata ?? {}
  }
  if (existing) return BrokerModules.update(ctx, { id: existing.id, ...data })
  return BrokerModules.create(ctx, data)
}

export async function setAdminDisabled(
  ctx: app.Ctx,
  row: BrokerModulesRow,
  disabled: boolean,
  reason: string
): Promise<BrokerModulesRow> {
  return BrokerModules.update(ctx, {
    id: row.id,
    adminDisabled: disabled,
    adminDisabledAt: disabled ? Date.now() : 0,
    adminDisableReason: disabled ? reason : '',
    updatedAt: Date.now()
  })
}
