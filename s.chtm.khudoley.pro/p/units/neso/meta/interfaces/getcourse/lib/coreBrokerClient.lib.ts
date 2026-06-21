import { runAppFunction } from '@app/app'
import { BROKER_EVENT_CONTRACTS, GETCOURSE_MODULE_KEY } from '../contracts/brokerEvents'

const CORE_BROKER_TARGET_APP = 'p/units/neso/meta'
const GETCOURSE_SUBSCRIPTION_NAME = 'getcourse-raw-event-reader'
const GETCOURSE_MODULE_AUTH_TOKEN = 'neso-meta-getcourse-interface-token'

export const GETCOURSE_SUBSCRIPTION_KEY = `${GETCOURSE_MODULE_KEY}:${GETCOURSE_SUBSCRIPTION_NAME}`

export type GetCourseBrokerResult = { success: boolean; [key: string]: unknown }

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizePayloadJson(request: Record<string, unknown>): string {
  const payloadJson = normalizeString(request.payloadJson)
  if (payloadJson) return payloadJson
  if (request.payload !== undefined) return JSON.stringify(request.payload)
  return '{}'
}

export async function registerGetCourseBrokerModule(ctx: app.Ctx): Promise<GetCourseBrokerResult> {
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/modules/register', {
    moduleKey: GETCOURSE_MODULE_KEY,
    authToken: GETCOURSE_MODULE_AUTH_TOKEN,
    request: {
      module: {
        moduleKey: GETCOURSE_MODULE_KEY,
        displayName: 'NESO Meta GetCourse Interface',
        kind: 'interface',
        enabled: true,
        allowedPublishTypes: ['getcourse.*'],
        allowedSubscribeTypes: ['getcourse.*'],
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

export async function registerGetCourseBrokerSubscription(
  ctx: app.Ctx
): Promise<GetCourseBrokerResult> {
  await registerGetCourseBrokerModule(ctx)
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/subscriptions/register', {
    consumerModule: GETCOURSE_MODULE_KEY,
    authToken: GETCOURSE_MODULE_AUTH_TOKEN,
    request: {
      subscriptions: [
        {
          name: GETCOURSE_SUBSCRIPTION_NAME,
          displayName: 'GetCourse raw event reader',
          enabled: true,
          sourceModules: [GETCOURSE_MODULE_KEY],
          eventTypes: ['getcourse.raw_event.accepted'],
          targetedOnly: false,
          notification: { mode: 'none' },
          delivery: {
            maxBatchSize: 10,
            ackTimeoutMs: 300000,
            retryPolicy: {
              maxAttempts: 3,
              initialDelayMs: 60000,
              backoffMultiplier: 2
            }
          },
          metadata: { interface: 'getcourse' }
        }
      ]
    }
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
): Promise<GetCourseBrokerResult> {
  await registerGetCourseBrokerSubscription(ctx)
  const rawEventId = normalizeString(request.rawEventId, makeId('gc_evt'))
  const eventType = normalizeString(request.eventType, 'unknown')
  const source = normalizeString(request.source, 'manual')
  const accountName = normalizeString(request.accountName)
  const objectId = normalizeString(request.objectId)
  const userId = normalizeString(request.userId)
  const receivedAt = Date.now()
  const payloadJson = normalizePayloadJson(request)
  const targetModules = Array.isArray(request.targetModules)
    ? request.targetModules.filter(
        (item): item is string => typeof item === 'string' && item.trim() !== ''
      )
    : undefined

  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/publish', {
    producerModule: GETCOURSE_MODULE_KEY,
    authToken: GETCOURSE_MODULE_AUTH_TOKEN,
    request: {
      eventType: 'getcourse.raw_event.accepted',
      eventVersion: 1,
      occurredAt: receivedAt,
      targetModules,
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
        receivedAt,
        payloadJson
      },
      metadata: { interface: 'getcourse', source }
    }
  })
}

export async function pollGetCourseDeliveries(
  ctx: app.Ctx,
  request: { limit?: unknown }
): Promise<GetCourseBrokerResult> {
  await registerGetCourseBrokerSubscription(ctx)
  const rawLimit = Number(request.limit)
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 10
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/poll', {
    consumerModule: GETCOURSE_MODULE_KEY,
    authToken: GETCOURSE_MODULE_AUTH_TOKEN,
    request: { subscriptionKey: GETCOURSE_SUBSCRIPTION_KEY, limit }
  })
}

export async function ackGetCourseDeliveries(
  ctx: app.Ctx,
  request: { deliveryId?: unknown; claimToken?: unknown; items?: unknown }
): Promise<GetCourseBrokerResult> {
  await registerGetCourseBrokerSubscription(ctx)
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/ack', {
    consumerModule: GETCOURSE_MODULE_KEY,
    authToken: GETCOURSE_MODULE_AUTH_TOKEN,
    request
  })
}

export async function failGetCourseDeliveries(
  ctx: app.Ctx,
  request: { deliveryId?: unknown; claimToken?: unknown; error?: unknown; items?: unknown }
): Promise<GetCourseBrokerResult> {
  await registerGetCourseBrokerSubscription(ctx)
  return runAppFunction(ctx, CORE_BROKER_TARGET_APP, '/broker/fail', {
    consumerModule: GETCOURSE_MODULE_KEY,
    authToken: GETCOURSE_MODULE_AUTH_TOKEN,
    request
  })
}
