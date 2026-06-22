import { runAppFunction } from '@app/app'
import { PROJECT_ROOT as MODULE_KEY } from '../../config/routes'
import {
  BROKER_EVENT_CONTRACTS,
  GETCOURSE_RAW_EVENT_ACCEPTED_EVENT_TYPE
} from '../../contracts/brokerEvents'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/broker/coreBrokerClient.lib'
const CORE_BROKER_TARGET_APP = 'p/units/neso/meta/core'
const MODULE_AUTH_TOKEN = 'neso-meta-getcourse-interface-token'

const WEB_MODULE_KEY = 'p/units/neso/meta/interfaces/web'
export const WEB_CHECKOUT_SUBMITTED_EVENT_TYPE = 'web.checkout.submitted'
const CHECKOUT_SUBSCRIPTION_NAME = 'web-checkout-submitted-listener'
export const CHECKOUT_SUBSCRIPTION_KEY = `${MODULE_KEY}:${CHECKOUT_SUBSCRIPTION_NAME}`

// ---------------------------------------------------------------------------
// Точка подмены runAppFunction (инъекция для тестов)
// ---------------------------------------------------------------------------

// Собственная упрощённая сигнатура (по образцу RequestFn в gcGatewayClient): системная
// перегрузка runAppFunction не выводит R и ломает типизацию ответа/моков в тестах.
type RunAppFn = (ctx: app.Ctx, targetApp: string, path: string, params?: unknown) => Promise<any>
let _runAppFn: RunAppFn = runAppFunction as unknown as RunAppFn
export function _setRunAppFn(fn: RunAppFn): void {
  _runAppFn = fn
}
export function _resetRunAppFn(): void {
  _runAppFn = runAppFunction as unknown as RunAppFn
}

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

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

export type ClaimedDelivery = {
  deliveryId: string
  claimToken: string
  subscriptionKey: string
  event: {
    eventId: string
    producerModule: string
    eventType: string
    eventVersion: number
    occurredAt: number
    publishedAt: number
    payload: unknown
    correlationId?: string
    metadata?: Record<string, unknown>
  }
}

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Регистрация модуля
// ---------------------------------------------------------------------------

export async function registerCoreBrokerModule(ctx: app.Ctx): Promise<CoreBrokerResult> {
  return _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/modules/register', {
    moduleKey: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: {
      module: {
        moduleKey: MODULE_KEY,
        displayName: 'GetCourse Interface',
        kind: 'interface',
        enabled: true,
        allowedPublishTypes: ['getcourse.*'],
        allowedSubscribeTypes: ['web.checkout.*'],
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

// ---------------------------------------------------------------------------
// Регистрация подписки на web.checkout.submitted
// ---------------------------------------------------------------------------

export async function registerCoreBrokerSubscription(ctx: app.Ctx): Promise<CoreBrokerResult> {
  await registerCoreBrokerModule(ctx)
  return _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/subscriptions/register', {
    consumerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: {
      subscriptions: [
        {
          name: CHECKOUT_SUBSCRIPTION_NAME,
          displayName: 'Web checkout submitted listener',
          enabled: true,
          sourceModules: [WEB_MODULE_KEY],
          eventTypes: [WEB_CHECKOUT_SUBMITTED_EVENT_TYPE],
          targetedOnly: false,
          notification: { mode: 'none' },
          delivery: {
            maxBatchSize: 10,
            ackTimeoutMs: 300000,
            retryPolicy: {
              maxAttempts: 5,
              initialDelayMs: 60000,
              backoffMultiplier: 2
            }
          },
          metadata: { interface: 'getcourse', feature: 'web-checkout' }
        }
      ]
    }
  })
}

// ---------------------------------------------------------------------------
// Poll доставок
// ---------------------------------------------------------------------------

export async function pollCoreBrokerDeliveries(
  ctx: app.Ctx,
  limit = 10
): Promise<{ success: boolean; deliveries: ClaimedDelivery[] }> {
  // Предусловие cold-start (§6.2): подписка должна быть зарегистрирована заранее
  // (registerCoreBrokerSubscription вызывается один раз из processCheckoutSubmittedDeliveries,
  // а не на каждый poll — чтобы не гнать register в горячем drain-цикле).
  const result = await _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/poll', {
    consumerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: { subscriptionKey: CHECKOUT_SUBSCRIPTION_KEY, limit }
  })
  const success = !!result && result.success === true
  // null-guard: при недоступности ядра result может быть null/не-объект
  const deliveries: ClaimedDelivery[] =
    result && Array.isArray(result.deliveries) ? (result.deliveries as ClaimedDelivery[]) : []
  if (!success) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] pollCoreBrokerDeliveries: poll вернул success:false`,
      payload: { code: result?.code, error: result?.error }
    })
  }
  return { success, deliveries }
}

// ---------------------------------------------------------------------------
// Ack доставок
// ---------------------------------------------------------------------------

export async function ackCoreBrokerDeliveries(
  ctx: app.Ctx,
  items: Array<{ deliveryId: string; claimToken: string }>
): Promise<CoreBrokerResult> {
  if (items.length === 0) return { success: true }
  const result = (await _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/ack', {
    consumerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: { items }
  })) as CoreBrokerResult | null
  if (!result || result.success !== true) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] ackCoreBrokerDeliveries: ack вернул success:false`,
      payload: { count: items.length }
    })
  }
  return result ?? { success: false }
}

// ---------------------------------------------------------------------------
// Fail доставок
// ---------------------------------------------------------------------------

export async function failCoreBrokerDeliveries(
  ctx: app.Ctx,
  items: Array<{ deliveryId: string; claimToken: string; error: unknown }>
): Promise<CoreBrokerResult> {
  if (items.length === 0) return { success: true }
  const result = (await _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/fail', {
    consumerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: { items }
  })) as CoreBrokerResult | null
  if (!result || result.success !== true) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] failCoreBrokerDeliveries: fail вернул success:false`,
      payload: { count: items.length }
    })
  }
  return result ?? { success: false }
}

// ---------------------------------------------------------------------------
// Публикация события
// ---------------------------------------------------------------------------

export async function publishCoreBrokerEvent(
  ctx: app.Ctx,
  request: CoreBrokerEventRequest
): Promise<CoreBrokerResult> {
  await registerCoreBrokerModule(ctx)
  return _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/publish', {
    producerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request
  })
}

// ---------------------------------------------------------------------------
// Публикация raw GC события
// ---------------------------------------------------------------------------

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
