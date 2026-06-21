import { runAppFunction } from '@app/app'
import { BROKER_EVENT_CONTRACTS, SAMPLE_MODULE_KEY } from '../contracts/brokerEvents'

const TEMPLATE_BROKER_APP = 'p/units/neso/meta/core'
const SAMPLE_SUBSCRIPTION_NAME = 'sample-note-reader'
const SAMPLE_MODULE_AUTH_TOKEN = 'template-sample-module-token'
export const SAMPLE_SUBSCRIPTION_KEY = `${SAMPLE_MODULE_KEY}:${SAMPLE_SUBSCRIPTION_NAME}`

export type TemplateBrokerResult = { success: boolean; [key: string]: unknown }

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

export async function registerSampleBrokerModule(ctx: app.Ctx): Promise<TemplateBrokerResult> {
  return runAppFunction(ctx, TEMPLATE_BROKER_APP, '/broker/modules/register', {
    moduleKey: SAMPLE_MODULE_KEY,
    authToken: SAMPLE_MODULE_AUTH_TOKEN,
    request: {
      module: {
        moduleKey: SAMPLE_MODULE_KEY,
        displayName: 'Template Sample Module',
        kind: 'domain',
        enabled: true,
        allowedPublishTypes: ['sample.*'],
        allowedSubscribeTypes: ['sample.*'],
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

export async function registerSampleBrokerSubscription(
  ctx: app.Ctx
): Promise<TemplateBrokerResult> {
  await registerSampleBrokerModule(ctx)
  return runAppFunction(ctx, TEMPLATE_BROKER_APP, '/broker/subscriptions/register', {
    consumerModule: SAMPLE_MODULE_KEY,
    authToken: SAMPLE_MODULE_AUTH_TOKEN,
    request: {
      subscriptions: [
        {
          name: SAMPLE_SUBSCRIPTION_NAME,
          displayName: 'Sample note reader',
          enabled: true,
          sourceModules: [SAMPLE_MODULE_KEY],
          eventTypes: ['sample.note.created'],
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
          metadata: { template: true }
        }
      ]
    }
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
): Promise<TemplateBrokerResult> {
  await registerSampleBrokerSubscription(ctx)
  const noteId = normalizeString(request.noteId, makeId('note'))
  const title = normalizeString(request.title, 'Sample note')
  const body = normalizeString(request.body)
  const authorId = normalizeString(request.authorId, 'admin')
  const targetModules = Array.isArray(request.targetModules)
    ? request.targetModules.filter(
        (item): item is string => typeof item === 'string' && item.trim() !== ''
      )
    : undefined

  return runAppFunction(ctx, TEMPLATE_BROKER_APP, '/broker/publish', {
    producerModule: SAMPLE_MODULE_KEY,
    authToken: SAMPLE_MODULE_AUTH_TOKEN,
    request: {
      eventType: 'sample.note.created',
      eventVersion: 1,
      occurredAt: Date.now(),
      targetModules,
      aggregateType: 'sample.note',
      aggregateId: noteId,
      idempotencyKey: `sample-note:${noteId}`,
      payload: {
        noteId,
        title,
        body,
        createdAt: Date.now(),
        authorId
      },
      metadata: { template: true, sampleModule: true }
    }
  })
}

export async function pollSampleDeliveries(
  ctx: app.Ctx,
  request: { limit?: unknown }
): Promise<TemplateBrokerResult> {
  await registerSampleBrokerSubscription(ctx)
  const rawLimit = Number(request.limit)
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 10
  return runAppFunction(ctx, TEMPLATE_BROKER_APP, '/broker/poll', {
    consumerModule: SAMPLE_MODULE_KEY,
    authToken: SAMPLE_MODULE_AUTH_TOKEN,
    request: { subscriptionKey: SAMPLE_SUBSCRIPTION_KEY, limit }
  })
}

export async function ackSampleDeliveries(
  ctx: app.Ctx,
  request: { deliveryId?: unknown; claimToken?: unknown; items?: unknown }
): Promise<TemplateBrokerResult> {
  await registerSampleBrokerSubscription(ctx)
  return runAppFunction(ctx, TEMPLATE_BROKER_APP, '/broker/ack', {
    consumerModule: SAMPLE_MODULE_KEY,
    authToken: SAMPLE_MODULE_AUTH_TOKEN,
    request
  })
}

export async function failSampleDeliveries(
  ctx: app.Ctx,
  request: { deliveryId?: unknown; claimToken?: unknown; error?: unknown; items?: unknown }
): Promise<TemplateBrokerResult> {
  await registerSampleBrokerSubscription(ctx)
  return runAppFunction(ctx, TEMPLATE_BROKER_APP, '/broker/fail', {
    consumerModule: SAMPLE_MODULE_KEY,
    authToken: SAMPLE_MODULE_AUTH_TOKEN,
    request
  })
}
