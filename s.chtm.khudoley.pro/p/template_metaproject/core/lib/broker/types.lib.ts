import type { BrokerModulesRow } from '../../tables/brokerModules.table'
import type { BrokerSubscriptionsRow } from '../../tables/brokerSubscriptions.table'
import type { BrokerEventsRow } from '../../tables/brokerEvents.table'
import type { BrokerDeliveriesRow } from '../../tables/brokerDeliveries.table'
import type { BrokerNotificationAttemptsRow } from '../../tables/brokerNotificationAttempts.table'

export type BrokerErrorCode =
  | 'invalid_request'
  | 'invalid_filter'
  | 'not_found'
  | 'broker_disabled'
  | 'module_not_registered'
  | 'module_disabled'
  | 'forbidden_event_type'
  | 'subscription_not_registered'
  | 'subscription_disabled'
  | 'contract_not_registered'
  | 'contract_owner_mismatch'
  | 'contract_version_conflict'
  | 'contract_retired'
  | 'invalid_contract_schema'
  | 'invalid_event_payload'
  | 'delivery_not_claimed'
  | 'invalid_claim_token'
  | 'delivery_not_requeueable'
  | 'delivery_not_skippable'
  | 'notification_not_found'
  | 'notification_not_retryable'
  | 'raw_payload_unavailable'
  | 'admin_reason_required'

export type BrokerErrorResult = {
  success: false
  code: BrokerErrorCode
  error: string
  details?: Record<string, unknown>
}

export type BrokerOk<T extends Record<string, unknown> = Record<string, unknown>> = {
  success: true
} & T

export type BrokerResult<T extends Record<string, unknown> = Record<string, unknown>> =
  | BrokerOk<T>
  | BrokerErrorResult

export type RetryPolicy = {
  maxAttempts: number
  initialDelayMs: number
  backoffMultiplier: number
}

export type PublishEventRequest = {
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

export type BrokerEventContractManifest = {
  eventType: string
  eventVersion: number
  status?: 'active' | 'deprecated' | 'retired'
  description: string
  payloadSchemaFormat: 'json-schema-subset-v1'
  payloadSchema: Record<string, unknown>
  sourceRef: {
    moduleKey: string
    path: 'contracts/brokerEvents.ts'
    exportName: string
    docsPath?: string
  }
  display?: {
    summaryFields?: Array<{
      path: string
      label: string
      maxLength?: number
    }>
  }
  examples?: unknown[]
  metadata?: Record<string, unknown>
}

export type RegisterBrokerModuleRequest = {
  module: {
    moduleKey: string
    displayName: string
    kind: 'core' | 'interface' | 'domain' | 'worker' | 'external'
    enabled: boolean
    allowedPublishTypes: string[]
    allowedSubscribeTypes: string[]
    metadata?: Record<string, unknown>
  }
  eventContracts?: BrokerEventContractManifest[]
}

export type RegisterBrokerSubscriptionsRequest = {
  consumerModule?: string
  subscriptions: Array<{
    name: string
    displayName: string
    enabled: boolean
    sourceModules?: string[]
    eventTypes?: string[]
    targetedOnly?: boolean
    notification?: {
      mode: 'none' | 'internal' | 'socket' | 'both'
      handlerKey?: string
      socketKey?: string
      batchWindowMs?: number
    }
    delivery?: {
      maxBatchSize?: number
      ackTimeoutMs?: number
      retryPolicy?: Partial<RetryPolicy>
    }
    metadata?: Record<string, unknown>
  }>
}

export type AckDeliveryItem = { deliveryId: string; claimToken: string }
export type FailDeliveryItem = AckDeliveryItem & { error: unknown }
export type AckDeliveriesRequest = AckDeliveryItem | { items: AckDeliveryItem[] }
export type FailDeliveriesRequest = FailDeliveryItem | { items: FailDeliveryItem[] }

export type DeliveryActionResult = {
  deliveryId: string
  success: boolean
  status?: 'acked' | 'failed' | 'dead_letter'
  code?: 'delivery_not_claimed' | 'invalid_claim_token' | 'invalid_request'
  error?: string
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
    contractKey: string
    schemaHash: string
    occurredAt: number
    publishedAt: number
    payload: unknown
    metadata?: Record<string, unknown>
  }
}

export type RetryBrokerNotificationsRequest = {
  notificationId?: string
  filters?: {
    consumerModule?: string
    subscriptionKey?: string
    mode?: 'internal' | 'socket'
    status?: Array<'failed' | 'skipped'>
    limit?: number
  }
  reason?: string
}

export type NotificationRetryResult = {
  notificationId: string
  success: boolean
  status?: 'pending'
  code?: 'notification_not_found' | 'notification_not_retryable' | 'invalid_request'
  error?: string
}

export type BrokerModuleSafe = {
  moduleKey: string
  displayName: string
  kind: string
  enabled: boolean
  declaredEnabled: boolean
  adminDisabled: boolean
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
  createdAt: number
  updatedAt: number
}

export type BrokerSubscriptionSafe = {
  subscriptionKey: string
  consumerModule: string
  displayName: string
  enabled: boolean
  declaredEnabled: boolean
  adminDisabled: boolean
  adminDisabledAt: number
  adminDisableReason: string
  sourceModules: string[]
  eventTypes: string[]
  targetedOnly: boolean
  notificationMode: 'none' | 'internal' | 'socket' | 'both'
  notificationBatchWindowMs: number
  handlerKeyConfigured: boolean
  socketKeyConfigured: boolean
  maxBatchSize: number
  ackTimeoutMs: number
  retryPolicy: RetryPolicy
  createdAt: number
  updatedAt: number
}

export type BrokerPrimarySummaryItem = {
  label: string
  path: string
  value:
    | string
    | number
    | boolean
    | null
    | { kind: 'object'; keys: number }
    | { kind: 'array'; length: number }
  truncated?: boolean
}

export type BrokerEventSafe = {
  eventId: string
  producerModule: string
  eventType: string
  eventVersion: number
  contractKey: string
  schemaHash: string
  occurredAt: number
  publishedAt: number
  targetModules: string[]
  aggregateType: string
  aggregateId: string
  correlationId: string
  causationId: string
  primarySummary: BrokerPrimarySummaryItem[]
}

export type BrokerDeliverySafe = {
  deliveryId: string
  eventId: string
  subscriptionKey: string
  consumerModule: string
  eventPublishedAt: number
  eventType: string
  eventVersion: number
  contractKey: string
  schemaHash: string
  producerModule: string
  aggregateType: string
  aggregateId: string
  status: string
  attempts: number
  availableAt: number
  claimedAt: number
  claimedUntil: number
  lastError: string
  ackedAt: number
  createdAt: number
  updatedAt: number
}

export type BrokerNotificationAttemptSafe = {
  notificationId: string
  consumerModule: string
  subscriptionKey: string
  deliveryIds: string[]
  mode: 'internal' | 'socket'
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  attempts: number
  nextAttemptAt: number
  lastError: string
  createdAt: number
  updatedAt: number
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function asRetryPolicy(value: unknown): RetryPolicy {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    maxAttempts: typeof raw.maxAttempts === 'number' ? raw.maxAttempts : 5,
    initialDelayMs: typeof raw.initialDelayMs === 'number' ? raw.initialDelayMs : 60000,
    backoffMultiplier: typeof raw.backoffMultiplier === 'number' ? raw.backoffMultiplier : 2
  }
}

export function toModuleSafe(row: BrokerModulesRow): BrokerModuleSafe {
  const declaredEnabled = row.enabled === true
  const adminDisabled = row.adminDisabled === true
  return {
    moduleKey: row.moduleKey,
    displayName: row.displayName,
    kind: row.kind,
    enabled: declaredEnabled && !adminDisabled,
    declaredEnabled,
    adminDisabled,
    allowedPublishTypes: asStringArray(row.allowedPublishTypes),
    allowedSubscribeTypes: asStringArray(row.allowedSubscribeTypes),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export function toSubscriptionSafe(row: BrokerSubscriptionsRow): BrokerSubscriptionSafe {
  const declaredEnabled = row.enabled === true
  const adminDisabled = row.adminDisabled === true
  return {
    subscriptionKey: row.subscriptionKey,
    consumerModule: row.consumerModule,
    displayName: row.displayName,
    enabled: declaredEnabled && !adminDisabled,
    declaredEnabled,
    adminDisabled,
    adminDisabledAt: row.adminDisabledAt,
    adminDisableReason: row.adminDisableReason,
    sourceModules: asStringArray(row.sourceModules),
    eventTypes: asStringArray(row.eventTypes),
    targetedOnly: row.targetedOnly === true,
    notificationMode: row.notificationMode as BrokerSubscriptionSafe['notificationMode'],
    notificationBatchWindowMs: row.notificationBatchWindowMs,
    handlerKeyConfigured: !!row.notificationHandlerKey,
    socketKeyConfigured: !!row.notificationSocketKey,
    maxBatchSize: row.maxBatchSize,
    ackTimeoutMs: row.ackTimeoutMs,
    retryPolicy: asRetryPolicy(row.retryPolicy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export function toEventSafe(
  row: BrokerEventsRow,
  primarySummary: BrokerPrimarySummaryItem[]
): BrokerEventSafe {
  return {
    eventId: row.eventId,
    producerModule: row.producerModule,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    contractKey: row.contractKey,
    schemaHash: row.schemaHash,
    occurredAt: row.occurredAt,
    publishedAt: row.publishedAt,
    targetModules: asStringArray(row.targetModules),
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    correlationId: row.correlationId,
    causationId: row.causationId,
    primarySummary
  }
}

export function toDeliverySafe(row: BrokerDeliveriesRow): BrokerDeliverySafe {
  return {
    deliveryId: row.deliveryId,
    eventId: row.eventId,
    subscriptionKey: row.subscriptionKey,
    consumerModule: row.consumerModule,
    eventPublishedAt: row.eventPublishedAt,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    contractKey: row.contractKey,
    schemaHash: row.schemaHash,
    producerModule: row.producerModule,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    status: row.status,
    attempts: row.attempts,
    availableAt: row.availableAt,
    claimedAt: row.claimedAt,
    claimedUntil: row.claimedUntil,
    lastError: row.lastError,
    ackedAt: row.ackedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

export function toNotificationSafe(
  row: BrokerNotificationAttemptsRow
): BrokerNotificationAttemptSafe {
  return {
    notificationId: row.notificationId,
    consumerModule: row.consumerModule,
    subscriptionKey: row.subscriptionKey,
    deliveryIds: asStringArray(row.deliveryIds),
    mode: row.mode as BrokerNotificationAttemptSafe['mode'],
    status: row.status as BrokerNotificationAttemptSafe['status'],
    attempts: row.attempts,
    nextAttemptAt: row.nextAttemptAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}
