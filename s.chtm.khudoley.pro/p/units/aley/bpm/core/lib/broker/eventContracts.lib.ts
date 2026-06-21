import * as contractsRepo from '../../repos/brokerEventContracts.repo'
import { BrokerSemanticError } from './errorCodes.lib'
import { validateJsonSchemaSubset } from './schemaValidation.lib'
import { isSecretLikeKey, stableHash } from './safeJson.lib'
import type { BrokerEventContractManifest } from './types.lib'

export function contractKey(eventType: string, eventVersion: number): string {
  return `${eventType}@${eventVersion}`
}

function validateDisplay(display: unknown): void {
  if (display === undefined || display === null) return
  if (typeof display !== 'object' || Array.isArray(display)) {
    throw new BrokerSemanticError('invalid_contract_schema', 'Display must be object')
  }
  const fields = (display as Record<string, unknown>).summaryFields
  if (fields === undefined) return
  if (!Array.isArray(fields)) {
    throw new BrokerSemanticError('invalid_contract_schema', 'summaryFields must be array')
  }
  for (const field of fields) {
    if (typeof field !== 'object' || field === null) {
      throw new BrokerSemanticError('invalid_contract_schema', 'summary field must be object')
    }
    const raw = field as Record<string, unknown>
    const path = typeof raw.path === 'string' ? raw.path.trim() : ''
    const label = typeof raw.label === 'string' ? raw.label.trim() : ''
    if (!path || !label || path.length > 160 || label.length > 80) {
      throw new BrokerSemanticError('invalid_contract_schema', 'Invalid summary field')
    }
    if (path.split('.').some((part) => isSecretLikeKey(part))) {
      throw new BrokerSemanticError(
        'invalid_contract_schema',
        'Summary field points to secret-like key'
      )
    }
  }
}

export async function registerManyForOwner(
  ctx: app.Ctx,
  ownerModule: string,
  contracts: BrokerEventContractManifest[] = []
): Promise<Array<{ contractKey: string; status: string; schemaHash: string }>> {
  const results: Array<{ contractKey: string; status: string; schemaHash: string }> = []
  for (const item of contracts) {
    if (
      item.sourceRef?.moduleKey !== ownerModule ||
      item.sourceRef.path !== 'contracts/brokerEvents.ts'
    ) {
      throw new BrokerSemanticError('contract_owner_mismatch', 'Contract sourceRef owner mismatch')
    }
    if (!item.sourceRef.exportName) {
      throw new BrokerSemanticError('invalid_contract_schema', 'Contract exportName is required')
    }
    if (item.payloadSchemaFormat !== 'json-schema-subset-v1') {
      throw new BrokerSemanticError('invalid_contract_schema', 'Unsupported payload schema format')
    }
    validateJsonSchemaSubset(item.payloadSchema)
    validateDisplay(item.display)
    const key = contractKey(item.eventType, item.eventVersion)
    const schemaHash = stableHash(item.payloadSchema)
    const existing = await contractsRepo.findByContractKey(ctx, key)
    if (existing && existing.ownerModule !== ownerModule) {
      throw new BrokerSemanticError(
        'contract_owner_mismatch',
        'Event type version belongs to another module'
      )
    }
    if (existing && existing.schemaHash !== schemaHash) {
      throw new BrokerSemanticError(
        'contract_version_conflict',
        'Existing contract schema is immutable',
        {
          contractKey: key
        }
      )
    }
    const row = await contractsRepo.upsert(ctx, {
      contractKey: key,
      ownerModule,
      eventType: item.eventType,
      eventVersion: item.eventVersion,
      status: item.status ?? 'active',
      payloadSchemaFormat: item.payloadSchemaFormat,
      payloadSchema: item.payloadSchema,
      schemaHash,
      sourceRef: item.sourceRef,
      display: item.display ?? {},
      examples: item.examples ?? [],
      description: item.description,
      deprecatedAt: item.status === 'deprecated' || item.status === 'retired' ? Date.now() : 0,
      metadata: item.metadata ?? {}
    })
    results.push({ contractKey: row.contractKey, status: row.status, schemaHash: row.schemaHash })
  }
  return results
}

export async function assertPublishableContract(
  ctx: app.Ctx,
  ownerModule: string,
  eventType: string,
  eventVersion: number
) {
  const row = await contractsRepo.findByTypeVersion(ctx, eventType, eventVersion)
  if (!row) {
    throw new BrokerSemanticError('contract_not_registered', 'Event contract is not registered', {
      eventType,
      eventVersion
    })
  }
  if (row.ownerModule !== ownerModule) {
    throw new BrokerSemanticError('contract_owner_mismatch', 'Event contract owner mismatch', {
      ownerModule,
      actualOwner: row.ownerModule
    })
  }
  if (row.status === 'retired') {
    throw new BrokerSemanticError('contract_retired', 'Event contract is retired')
  }
  return row
}
