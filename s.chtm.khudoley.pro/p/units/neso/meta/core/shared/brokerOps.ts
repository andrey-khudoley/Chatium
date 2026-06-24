// @shared
// Клиентские view-типы и чистые хелперы broker ops-панели админки.
// Зеркалят safe-DTO из lib/broker/types.lib (серверный контур), но объявлены
// здесь, чтобы Vue-компоненты не импортировали lib/ (платформенный инвариант).
// Логики доступа к Heap/API тут нет — только типы, форматирование и таблицы меток.

export type BrokerPrimarySummaryItemView = {
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

export type BrokerModuleView = {
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

export type BrokerSubscriptionView = {
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
  retryPolicy: { maxAttempts: number; initialDelayMs: number; backoffMultiplier: number }
  createdAt: number
  updatedAt: number
}

export type BrokerEventView = {
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
  primarySummary: BrokerPrimarySummaryItemView[]
}

export type BrokerDeliveryView = {
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

export type BrokerNotificationView = {
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

export type BrokerDiagnosticsData = {
  modules: BrokerModuleView[]
  subscriptions: BrokerSubscriptionView[]
  events: BrokerEventView[]
  deliveries: BrokerDeliveryView[]
  notifications: BrokerNotificationView[]
}

export type BrokerDiagnosticsResult = Partial<BrokerDiagnosticsData> & {
  success?: boolean
  error?: string
}

export type BrokerOpsTab = 'modules' | 'subscriptions' | 'events' | 'deliveries' | 'notifications'

export type BrokerOpsTabDef = { key: BrokerOpsTab; label: string; icon: string }

export const BROKER_OPS_TABS: BrokerOpsTabDef[] = [
  { key: 'modules', label: 'Модули', icon: 'fas fa-cubes' },
  { key: 'subscriptions', label: 'Подписки', icon: 'fas fa-rss' },
  { key: 'events', label: 'События', icon: 'fas fa-bolt' },
  { key: 'deliveries', label: 'Доставки', icon: 'fas fa-truck' },
  { key: 'notifications', label: 'Уведомления', icon: 'fas fa-bell' }
]

// Описание мутирующего действия, которое панель отправляет в confirm-модалку.
export type BrokerOpsActionKind =
  | 'module-toggle'
  | 'subscription-toggle'
  | 'delivery-requeue'
  | 'delivery-skip'
  | 'notification-retry'

export type BrokerOpsActionRequest = {
  kind: BrokerOpsActionKind
  title: string
  description: string
  targetId: string
  enabled?: boolean
  danger?: boolean
}

const TWO = (n: number): string => (n < 10 ? `0${n}` : `${n}`)

/** Форматирует unix-ms в `DD.MM.YYYY HH:mm:ss`; `0`/отрицательное → «—». */
export function formatBrokerTs(ms: number): string {
  if (!ms || ms <= 0) return '—'
  const d = new Date(ms)
  const date = `${TWO(d.getDate())}.${TWO(d.getMonth() + 1)}.${d.getFullYear()}`
  const time = `${TWO(d.getHours())}:${TWO(d.getMinutes())}:${TWO(d.getSeconds())}`
  return `${date} ${time}`
}

/** Текстовое представление значения primary summary для плотной таблицы. */
export function summaryItemText(item: BrokerPrimarySummaryItemView): string {
  const v = item.value
  if (v === null) return 'null'
  if (typeof v === 'string') return item.truncated ? `${v}…` : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v.kind === 'object') return `{…} (${v.keys})`
  return `[…] (${v.length})`
}

/** Короткое превью summary: «label=value · label=value». */
export function summaryPreview(items: BrokerPrimarySummaryItemView[], max = 3): string {
  if (!items.length) return '—'
  return items
    .slice(0, max)
    .map((it) => `${it.label}=${summaryItemText(it)}`)
    .join(' · ')
}

/** Усечение длинного идентификатора по центру для таблиц. */
export function shortId(id: string, head = 8, tail = 6): string {
  if (!id) return '—'
  if (id.length <= head + tail + 1) return id
  return `${id.slice(0, head)}…${id.slice(-tail)}`
}

/** CSS-модификатор для статуса доставки. */
export function deliveryStatusClass(status: string): string {
  if (status === 'acked') return 'brk-st--ok'
  if (status === 'failed' || status === 'dead_letter') return 'brk-st--err'
  if (status === 'skipped') return 'brk-st--muted'
  if (status === 'claimed') return 'brk-st--warn'
  return 'brk-st--info'
}

/** CSS-модификатор для статуса notification attempt. */
export function notificationStatusClass(status: string): string {
  if (status === 'sent') return 'brk-st--ok'
  if (status === 'failed') return 'brk-st--err'
  if (status === 'skipped') return 'brk-st--muted'
  return 'brk-st--warn'
}

/** Доступность requeue: только failed/dead_letter. */
export function isRequeueable(status: string): boolean {
  return status === 'failed' || status === 'dead_letter'
}

/** Доступность skip: всё, кроме уже acked/skipped. */
export function isSkippable(status: string): boolean {
  return status !== 'acked' && status !== 'skipped'
}

/** Доступность retry уведомления: failed/skipped. */
export function isNotificationRetryable(status: string): boolean {
  return status === 'failed' || status === 'skipped'
}
