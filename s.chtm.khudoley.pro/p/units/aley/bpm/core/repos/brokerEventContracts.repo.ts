import {
  BrokerEventContracts,
  type BrokerEventContractsRow
} from '../tables/brokerEventContracts.table'

export type ContractUpsert = {
  contractKey: string
  ownerModule: string
  eventType: string
  eventVersion: number
  status: string
  payloadSchemaFormat: string
  payloadSchema: unknown
  schemaHash: string
  sourceRef: unknown
  display: unknown
  examples: unknown
  description: string
  deprecatedAt: number
  metadata: unknown
}

export async function findByContractKey(
  ctx: app.Ctx,
  contractKey: string
): Promise<BrokerEventContractsRow | null> {
  return BrokerEventContracts.findOneBy(ctx, { contractKey })
}

export async function findByTypeVersion(
  ctx: app.Ctx,
  eventType: string,
  eventVersion: number
): Promise<BrokerEventContractsRow | null> {
  const rows = await BrokerEventContracts.findAll(ctx, {
    where: { eventType, eventVersion },
    limit: 1
  })
  return rows[0] ?? null
}

export async function findActiveByOwner(
  ctx: app.Ctx,
  ownerModule: string
): Promise<BrokerEventContractsRow[]> {
  return BrokerEventContracts.findAll(ctx, {
    where: { ownerModule },
    order: [{ eventType: 'asc' }, { eventVersion: 'desc' }],
    limit: 1000
  } as any)
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { limit?: number } = {}
): Promise<BrokerEventContractsRow[]> {
  return BrokerEventContracts.findAll(ctx, {
    order: [{ updatedAt: 'desc' }],
    limit: opts.limit ?? 500
  } as any)
}

export async function upsert(
  ctx: app.Ctx,
  payload: ContractUpsert
): Promise<BrokerEventContractsRow> {
  const now = Date.now()
  const existing = await findByContractKey(ctx, payload.contractKey)
  const data = {
    ...payload,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
  if (existing) return BrokerEventContracts.update(ctx, { id: existing.id, ...data })
  return BrokerEventContracts.create(ctx, data)
}
