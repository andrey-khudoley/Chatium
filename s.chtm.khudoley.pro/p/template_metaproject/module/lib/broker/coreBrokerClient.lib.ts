import { runAppFunction } from '@app/app'
import { PROJECT_ROOT as MODULE_KEY } from '../../config/routes'
import { BROKER_EVENT_CONTRACTS, SAMPLE_NOTE_EVENT_TYPE } from '../../contracts/brokerEvents'

const CORE_BROKER_TARGET_APP = 'p/template_metaproject/core'
const MODULE_AUTH_TOKEN = 'template-module-token'

export type CoreBrokerResult = { success: boolean; [key: string]: unknown }

export type CoreBrokerEventRequest = {
  eventType: string
  eventVersion: number
  occurredAt?: number
  targetModules?: string[]
  aggregateType?: string
  aggregateId?: string
  correlationId?: string
  causationId?: string
  idempotencyKey?: string
  payload: unknown
  metadata?: Record<string, unknown>
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeTargetModules(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  )
  return items.length ? items : undefined
}

export async function registerCoreBrokerModule(ctx: app.Ctx): Promise<CoreBrokerResult> {
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/modules/register', {
    moduleKey: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: {
      module: {
        moduleKey: MODULE_KEY,
        displayName: 'Template Module',
        kind: 'domain',
        enabled: true,
        allowedPublishTypes: ['sample.*'],
        allowedSubscribeTypes: [],
        metadata: { template: true }
      },
      eventContracts: BROKER_EVENT_CONTRACTS.map((contract) => ({
        ...contract,
        sourceRef: { ...contract.sourceRef },
        display: contract.display ? { ...contract.display } : undefined,
        examples: contract.examples ? [...contract.examples] : []
      }))
    }
  })
}

export async function publishCoreBrokerEvent(
  ctx: app.Ctx,
  request: CoreBrokerEventRequest
): Promise<CoreBrokerResult> {
  await registerCoreBrokerModule(ctx)
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/publish', {
    producerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request
  })
}

export async function publishSampleNote(
  ctx: app.Ctx,
  request: {
    noteId?: unknown
    title?: unknown
    body?: unknown
    authorId?: unknown
    targetModules?: unknown
  }
): Promise<CoreBrokerResult> {
  const noteId = normalizeString(request.noteId, makeId('note'))
  const title = normalizeString(request.title, 'Sample note')
  const body = normalizeString(request.body)
  const authorId = normalizeString(request.authorId, 'admin')
  const occurredAt = Date.now()

  return publishCoreBrokerEvent(ctx, {
    eventType: SAMPLE_NOTE_EVENT_TYPE,
    eventVersion: 1,
    occurredAt,
    targetModules: normalizeTargetModules(request.targetModules),
    aggregateType: 'sample.note',
    aggregateId: noteId,
    idempotencyKey: `sample-note:${noteId}`,
    payload: {
      noteId,
      title,
      body,
      createdAt: occurredAt,
      authorId
    },
    metadata: { template: true, sample: true }
  })
}
