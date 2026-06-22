import type { BrokerDeliveryRow } from './BrokerDeliveriesTable.vue'
import type { BrokerEventRow } from './BrokerEventsTable.vue'
import type { BrokerModuleRow } from './BrokerModulesTable.vue'
import type { BrokerNotificationRow } from './BrokerNotificationsTable.vue'
import type { BrokerSubscriptionRow } from './BrokerSubscriptionsTable.vue'

export type BrokerTab = 'modules' | 'subscriptions' | 'events' | 'deliveries' | 'notifications'

export type BrokerDiagnosticsResult = {
  success?: boolean
  error?: string
  modules?: BrokerModuleRow[]
  subscriptions?: BrokerSubscriptionRow[]
  events?: BrokerEventRow[]
  deliveries?: BrokerDeliveryRow[]
  notifications?: BrokerNotificationRow[]
}

export type ConfirmAction =
  | { kind: 'module-toggle'; row: BrokerModuleRow; enabled: boolean }
  | { kind: 'subscription-toggle'; row: BrokerSubscriptionRow; enabled: boolean }
  | { kind: 'event-raw'; row: BrokerEventRow }
  | { kind: 'delivery-requeue'; row: BrokerDeliveryRow }
  | { kind: 'delivery-skip'; row: BrokerDeliveryRow }
  | { kind: 'notification-retry'; row: BrokerNotificationRow }

export const BROKER_TABS: Array<{ key: BrokerTab; label: string; icon: string }> = [
  { key: 'modules', label: 'Modules', icon: 'fas fa-cubes' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'fas fa-list-check' },
  { key: 'events', label: 'Events', icon: 'fas fa-bolt' },
  { key: 'deliveries', label: 'Deliveries', icon: 'fas fa-inbox' },
  { key: 'notifications', label: 'Notifications', icon: 'fas fa-satellite-dish' }
]

export const DELIVERY_STATUSES = [
  '',
  'pending',
  'claimed',
  'acked',
  'failed',
  'dead_letter',
  'skipped'
]

export const NOTIFICATION_STATUSES = ['', 'pending', 'sent', 'failed', 'skipped']
