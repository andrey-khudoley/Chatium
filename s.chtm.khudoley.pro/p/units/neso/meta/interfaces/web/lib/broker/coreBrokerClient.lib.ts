import { runAppFunction } from '@app/app'
import { PROJECT_ROOT as MODULE_KEY } from '../../config/routes'
import {
  BROKER_EVENT_CONTRACTS,
  WEB_CHECKOUT_SUBMITTED_EVENT_TYPE
} from '../../contracts/brokerEvents'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/broker/coreBrokerClient.lib'
const CORE_BROKER_TARGET_APP = 'p/units/neso/meta/core'
const MODULE_AUTH_TOKEN = 'neso-meta-web-interface-token'

const GETCOURSE_MODULE_KEY = 'p/units/neso/meta/interfaces/getcourse'
export const GETCOURSE_ORDER_CREATED_EVENT_TYPE = 'getcourse.order.created'
const ORDER_CREATED_SUBSCRIPTION_NAME = 'getcourse-order-created-listener'
export const ORDER_CREATED_SUBSCRIPTION_KEY = `${MODULE_KEY}:${ORDER_CREATED_SUBSCRIPTION_NAME}`

// ---------------------------------------------------------------------------
// Точка подмены runAppFunction (инъекция для тестов)
// ---------------------------------------------------------------------------

// Собственная упрощённая сигнатура: системная перегрузка runAppFunction не выводит R
// и ломает типизацию ответа/моков в тестах.
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
// Регистрация модуля
// ---------------------------------------------------------------------------

export async function registerCoreBrokerModule(ctx: app.Ctx): Promise<CoreBrokerResult> {
  return _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/modules/register', {
    moduleKey: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: {
      module: {
        moduleKey: MODULE_KEY,
        displayName: 'NeSo Meta Web Interface',
        kind: 'interface',
        enabled: true,
        allowedPublishTypes: ['web.checkout.*'],
        allowedSubscribeTypes: ['getcourse.order.*'],
        metadata: { interface: 'web' }
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
// Регистрация подписки на getcourse.order.created
// ---------------------------------------------------------------------------

export async function registerCoreBrokerSubscription(ctx: app.Ctx): Promise<CoreBrokerResult> {
  await registerCoreBrokerModule(ctx)
  return _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/subscriptions/register', {
    consumerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: {
      subscriptions: [
        {
          name: ORDER_CREATED_SUBSCRIPTION_NAME,
          displayName: 'GetCourse order created listener',
          enabled: true,
          sourceModules: [GETCOURSE_MODULE_KEY],
          eventTypes: [GETCOURSE_ORDER_CREATED_EVENT_TYPE],
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
          metadata: { interface: 'web', feature: 'checkout' }
        }
      ]
    }
  })
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
// Poll доставок
// ---------------------------------------------------------------------------

export async function pollCoreBrokerDeliveries(
  ctx: app.Ctx,
  limit = 10
): Promise<{ success: boolean; deliveries: ClaimedDelivery[] }> {
  const result = await _runAppFn(ctx, CORE_BROKER_TARGET_APP, '/broker/poll', {
    consumerModule: MODULE_KEY,
    authToken: MODULE_AUTH_TOKEN,
    request: { subscriptionKey: ORDER_CREATED_SUBSCRIPTION_KEY, limit }
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
// Ping getcourse /checkout/process — cold-start best-effort
// ---------------------------------------------------------------------------

/**
 * Вызывает getcourse-интерфейс /checkout/process через _runAppFn (мокабельно).
 * Best-effort cold-start: GetCourse Interface должен забрать web.checkout.submitted
 * из брокера и создать сделку. Ошибка не пробрасывается — только логируется.
 * Caller обязан обернуть в try/catch.
 */
export async function pingGetCourseProcess(ctx: app.Ctx): Promise<void> {
  await _runAppFn(ctx, GETCOURSE_MODULE_KEY, '/checkout/process', {})
}

// Реэкспорт для удобства использования в submit
export { WEB_CHECKOUT_SUBMITTED_EVENT_TYPE }
