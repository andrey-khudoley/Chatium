import { runAppFunction } from '@app/app'
import { PROJECT_ROOT as MODULE_KEY } from '../../config/routes'
import {
  BROKER_EVENT_CONTRACTS,
  GETCOURSE_RAW_EVENT_ACCEPTED_EVENT_TYPE
} from '../../contracts/brokerEvents'

const CORE_BROKER_TARGET_APP = 'p/units/neso/meta/core'
const MODULE_AUTH_TOKEN = 'neso-meta-getcourse-interface-token'

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

function normalizePayloadJson(request: Record<string, unknown>): string {
  const payloadJson = normalizeString(request.payloadJson)
  if (payloadJson) return payloadJson
  if (request.payload !== undefined) return JSON.stringify(request.payload)
  return '{}'
}

export async function registerCoreBrokerModule(ctx: app.Ctx): Promise<CoreBrokerResult> {
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/modules/register', {
    moduleKey: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: {
      module: {
        moduleKey: MODULE_KEY,
        displayName: 'GetCourse Interface',
        kind: 'interface',
        enabled: true,
        allowedPublishTypes: ['getcourse.*'],
        allowedSubscribeTypes: [],
        metadata: { interface: 'getcourse' }
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

export async function publishGetCourseRawEvent(
  ctx: app.Ctx,
  request: {
    rawEventId?: unknown
    eventType?: unknown
    source?: unknown
    accountName?: unknown
    objectId?: unknown
    userId?: unknown
    payloadJson?: unknown
    payload?: unknown
    targetModules?: unknown
  }
): Promise<CoreBrokerResult> {
  const rawEventId = normalizeString(request.rawEventId, makeId('gc_evt'))
  const eventType = normalizeString(request.eventType, 'unknown')
  const source = normalizeString(request.source, 'manual')
  const accountName = normalizeString(request.accountName)
  const objectId = normalizeString(request.objectId)
  const userId = normalizeString(request.userId)
  const occurredAt = Date.now()
  const payloadJson = normalizePayloadJson(request)

  return publishCoreBrokerEvent(ctx, {
    eventType: GETCOURSE_RAW_EVENT_ACCEPTED_EVENT_TYPE,
    eventVersion: 1,
    occurredAt,
    targetModules: normalizeTargetModules(request.targetModules),
    aggregateType: 'getcourse.raw_event',
    aggregateId: rawEventId,
    idempotencyKey: `getcourse-raw-event:${rawEventId}`,
    payload: {
      rawEventId,
      eventType,
      source,
      accountName,
      objectId,
      userId,
      receivedAt: occurredAt,
      payloadJson
    },
    metadata: { interface: 'getcourse', source }
  })
}
