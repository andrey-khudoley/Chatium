<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { adminBrokerDiagnosticsRoute } from '../../../api/admin/broker/diagnostics'
import { adminBrokerEventRawRoute } from '../../../api/admin/broker/events/raw'
import { adminBrokerModuleToggleRoute } from '../../../api/admin/broker/modules/toggle'
import { adminBrokerSubscriptionToggleRoute } from '../../../api/admin/broker/subscriptions/toggle'
import { adminBrokerDeliveryRequeueRoute } from '../../../api/admin/broker/deliveries/requeue'
import { adminBrokerDeliverySkipRoute } from '../../../api/admin/broker/deliveries/skip'
import { adminBrokerNotificationsRetryRoute } from '../../../api/admin/broker/notifications/retry'
import { createComponentLogger } from '../../../shared/logger'
import BrokerModulesTable, { type BrokerModuleRow } from './BrokerModulesTable.vue'
import BrokerSubscriptionsTable, {
  type BrokerSubscriptionRow
} from './BrokerSubscriptionsTable.vue'
import BrokerEventsTable, { type BrokerEventRow } from './BrokerEventsTable.vue'
import BrokerDeliveriesTable, { type BrokerDeliveryRow } from './BrokerDeliveriesTable.vue'
import BrokerNotificationsTable, {
  type BrokerNotificationRow
} from './BrokerNotificationsTable.vue'
import BrokerOpsConfirmModal from './BrokerOpsConfirmModal.vue'
import BrokerRawPayloadViewer from './BrokerRawPayloadViewer.vue'
import {
  BROKER_TABS,
  DELIVERY_STATUSES,
  NOTIFICATION_STATUSES,
  type BrokerDiagnosticsResult,
  type BrokerTab,
  type ConfirmAction
} from './brokerOpsPanelModel'

declare const ctx: app.Ctx

const log = createComponentLogger('BrokerOpsPanel')

const tabs = BROKER_TABS
const deliveryStatuses = DELIVERY_STATUSES
const notificationStatuses = NOTIFICATION_STATUSES

const activeTab = ref<BrokerTab>('modules')
const loading = ref(false)
const error = ref('')
const actionError = ref('')
const actionPending = ref('')
const diagnosticsRequestId = ref(0)

const modules = ref<BrokerModuleRow[]>([])
const subscriptions = ref<BrokerSubscriptionRow[]>([])
const events = ref<BrokerEventRow[]>([])
const deliveries = ref<BrokerDeliveryRow[]>([])
const notifications = ref<BrokerNotificationRow[]>([])

const filters = reactive({
  moduleKey: '',
  eventType: '',
  eventId: '',
  subscriptionKey: '',
  deliveryStatus: '',
  notificationStatus: '',
  limit: 50
})

const confirmAction = ref<ConfirmAction | null>(null)
const rawOpen = ref(false)
const rawLoading = ref(false)
const rawError = ref('')
const rawEventId = ref('')
const rawPayload = ref<unknown>(null)
const rawMetadata = ref<unknown>(null)
const rawRequestId = ref(0)

const confirmTitle = computed(() => {
  const action = confirmAction.value
  if (!action) return ''
  if (action.kind === 'module-toggle') return action.enabled ? 'Enable module' : 'Stop module'
  if (action.kind === 'subscription-toggle') {
    return action.enabled ? 'Enable subscription' : 'Stop subscription'
  }
  if (action.kind === 'event-raw') return 'Open raw payload'
  if (action.kind === 'delivery-requeue') return 'Requeue delivery'
  if (action.kind === 'delivery-skip') return 'Skip delivery'
  return 'Retry notification'
})

const confirmDetails = computed(() => {
  const action = confirmAction.value
  if (!action) return ''
  if (action.kind === 'module-toggle') return action.row.moduleKey
  if (action.kind === 'subscription-toggle') return action.row.subscriptionKey
  if (action.kind === 'event-raw') return action.row.eventId
  if (action.kind === 'delivery-requeue' || action.kind === 'delivery-skip') {
    return action.row.deliveryId
  }
  return action.row.notificationId
})

const confirmLabel = computed(() => {
  const action = confirmAction.value
  if (!action) return 'OK'
  if (action.kind === 'event-raw') return 'Open'
  if (action.kind === 'delivery-skip') return 'Skip'
  if (action.kind === 'delivery-requeue') return 'Requeue'
  if (action.kind === 'notification-retry') return 'Retry'
  return action.enabled ? 'Enable' : 'Stop'
})

const confirmInitialReason = ''

function setData(data: BrokerDiagnosticsResult) {
  modules.value = data.modules || []
  subscriptions.value = data.subscriptions || []
  events.value = data.events || []
  deliveries.value = data.deliveries || []
  notifications.value = data.notifications || []
}

function buildQuery(): Record<string, string | string[] | undefined> {
  const query: Record<string, string | string[] | undefined> = { limit: String(filters.limit) }
  if (filters.moduleKey.trim()) query.moduleKey = filters.moduleKey.trim()
  if (filters.eventType.trim()) query.eventType = filters.eventType.trim()
  if (filters.eventId.trim()) query.eventId = filters.eventId.trim()
  if (filters.subscriptionKey.trim()) query.subscriptionKey = filters.subscriptionKey.trim()
  if (filters.deliveryStatus) query.deliveryStatus = filters.deliveryStatus
  if (filters.notificationStatus) query.notificationStatus = filters.notificationStatus
  return query
}

async function loadDiagnostics() {
  const requestId = diagnosticsRequestId.value + 1
  diagnosticsRequestId.value = requestId
  loading.value = true
  error.value = ''
  try {
    const data = (await adminBrokerDiagnosticsRoute
      .query(buildQuery())
      .run(ctx)) as BrokerDiagnosticsResult
    if (diagnosticsRequestId.value !== requestId) return
    if (data?.success === false) {
      error.value = data.error || 'Broker diagnostics error'
      return
    }
    setData(data)
  } catch (e) {
    if (diagnosticsRequestId.value !== requestId) return
    error.value = e instanceof Error ? e.message : String(e)
    log.error('Broker diagnostics load failed', error.value)
  } finally {
    if (diagnosticsRequestId.value === requestId) loading.value = false
  }
}

function openConfirm(action: ConfirmAction) {
  actionError.value = ''
  confirmAction.value = action
}

function openModuleToggle(row: BrokerModuleRow, enabled: boolean) {
  openConfirm({ kind: 'module-toggle', row, enabled })
}

function openSubscriptionToggle(row: BrokerSubscriptionRow, enabled: boolean) {
  openConfirm({ kind: 'subscription-toggle', row, enabled })
}

function openEventRaw(row: BrokerEventRow) {
  openConfirm({ kind: 'event-raw', row })
}

function openDeliveryRequeue(row: BrokerDeliveryRow) {
  openConfirm({ kind: 'delivery-requeue', row })
}

async function openDeliveryEvent(row: BrokerDeliveryRow) {
  filters.eventId = row.eventId
  filters.eventType = ''
  activeTab.value = 'events'
  await loadDiagnostics()
}

function openDeliverySkip(row: BrokerDeliveryRow) {
  openConfirm({ kind: 'delivery-skip', row })
}

function openNotificationRetry(row: BrokerNotificationRow) {
  openConfirm({ kind: 'notification-retry', row })
}

function closeConfirm() {
  if (!actionPending.value) confirmAction.value = null
}

function closeRaw() {
  rawRequestId.value += 1
  rawOpen.value = false
  rawLoading.value = false
  rawEventId.value = ''
  rawPayload.value = null
  rawMetadata.value = null
  rawError.value = ''
}

async function applyConfirm(reason: string) {
  if (actionPending.value) return
  const action = confirmAction.value
  if (!action) return
  actionPending.value = action.kind
  actionError.value = ''
  try {
    let result:
      | { success?: boolean; error?: string; payload?: unknown; metadata?: unknown }
      | undefined
    if (action.kind === 'module-toggle') {
      result = (await adminBrokerModuleToggleRoute.run(ctx, {
        moduleKey: action.row.moduleKey,
        enabled: action.enabled,
        reason
      })) as { success?: boolean; error?: string }
    } else if (action.kind === 'subscription-toggle') {
      result = (await adminBrokerSubscriptionToggleRoute.run(ctx, {
        subscriptionKey: action.row.subscriptionKey,
        enabled: action.enabled,
        reason
      })) as { success?: boolean; error?: string }
    } else if (action.kind === 'event-raw') {
      const requestId = rawRequestId.value + 1
      rawRequestId.value = requestId
      rawLoading.value = true
      rawOpen.value = true
      rawEventId.value = action.row.eventId
      rawPayload.value = null
      rawMetadata.value = null
      rawError.value = ''
      result = (await adminBrokerEventRawRoute.run(ctx, {
        eventId: action.row.eventId,
        reason
      })) as { success?: boolean; error?: string; payload?: unknown; metadata?: unknown }
      if (rawRequestId.value !== requestId || rawEventId.value !== action.row.eventId) return
      if (result?.success !== false) {
        rawPayload.value = result?.payload ?? null
        rawMetadata.value = result?.metadata ?? null
      }
    } else if (action.kind === 'delivery-requeue') {
      result = (await adminBrokerDeliveryRequeueRoute.run(ctx, {
        deliveryId: action.row.deliveryId,
        reason
      })) as { success?: boolean; error?: string }
    } else if (action.kind === 'delivery-skip') {
      result = (await adminBrokerDeliverySkipRoute.run(ctx, {
        deliveryId: action.row.deliveryId,
        reason
      })) as { success?: boolean; error?: string }
    } else {
      result = (await adminBrokerNotificationsRetryRoute.run(ctx, {
        notificationId: action.row.notificationId,
        reason
      })) as { success?: boolean; error?: string }
    }
    if (result?.success === false) {
      actionError.value = result.error || 'Broker action failed'
      rawError.value = action.kind === 'event-raw' ? actionError.value : ''
      return
    }
    confirmAction.value = null
    if (action.kind !== 'event-raw') await loadDiagnostics()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : String(e)
    rawError.value = action.kind === 'event-raw' ? actionError.value : ''
    log.error('Broker action failed', { kind: action.kind, error: actionError.value })
  } finally {
    if (action.kind !== 'event-raw' || rawEventId.value === action.row.eventId) {
      rawLoading.value = false
    }
    actionPending.value = ''
  }
}

onMounted(loadDiagnostics)
</script>

<template>
  <section class="ap-card ap-card--stagger-3 broker-panel">
    <div class="ap-card-hd">
      <h2><i class="fas fa-network-wired ap-icon-hd"></i> Broker ops</h2>
      <button type="button" class="ap-btn ap-btn--sm" :disabled="loading" @click="loadDiagnostics">
        <i v-if="loading" class="fas fa-circle-notch fa-spin"></i>
        <i v-else class="fas fa-rotate"></i>
        Refresh
      </button>
    </div>

    <div class="broker-filters">
      <input v-model="filters.moduleKey" class="ap-input" type="text" placeholder="moduleKey" />
      <input v-model="filters.eventType" class="ap-input" type="text" placeholder="eventType" />
      <input v-model="filters.eventId" class="ap-input" type="text" placeholder="eventId" />
      <input
        v-model="filters.subscriptionKey"
        class="ap-input"
        type="text"
        placeholder="subscriptionKey"
      />
      <select v-model="filters.deliveryStatus" class="ap-input">
        <option v-for="status in deliveryStatuses" :key="`delivery-${status}`" :value="status">
          {{ status || 'delivery status' }}
        </option>
      </select>
      <select v-model="filters.notificationStatus" class="ap-input">
        <option
          v-for="status in notificationStatuses"
          :key="`notification-${status}`"
          :value="status"
        >
          {{ status || 'notification status' }}
        </option>
      </select>
      <button type="button" class="ap-btn" :disabled="loading" @click="loadDiagnostics">
        <i class="fas fa-filter"></i> Apply
      </button>
    </div>

    <p v-if="error" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ error }}</p>

    <div class="broker-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="ap-flt"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <i :class="tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <BrokerModulesTable
      v-if="activeTab === 'modules'"
      :modules="modules"
      :loading="loading"
      :action-pending="actionPending"
      @toggle="openModuleToggle"
    />
    <BrokerSubscriptionsTable
      v-else-if="activeTab === 'subscriptions'"
      :subscriptions="subscriptions"
      :loading="loading"
      :action-pending="actionPending"
      @toggle="openSubscriptionToggle"
    />
    <BrokerEventsTable
      v-else-if="activeTab === 'events'"
      :events="events"
      :loading="loading"
      :action-pending="actionPending"
      @view-raw="openEventRaw"
    />
    <BrokerDeliveriesTable
      v-else-if="activeTab === 'deliveries'"
      :deliveries="deliveries"
      :loading="loading"
      :action-pending="actionPending"
      @inspect-event="openDeliveryEvent"
      @requeue="openDeliveryRequeue"
      @skip="openDeliverySkip"
    />
    <BrokerNotificationsTable
      v-else
      :notifications="notifications"
      :loading="loading"
      :action-pending="actionPending"
      @retry="openNotificationRetry"
    />

    <BrokerOpsConfirmModal
      :open="!!confirmAction"
      :title="confirmTitle"
      :details="confirmDetails"
      :confirm-label="confirmLabel"
      :initial-reason="confirmInitialReason"
      :require-reason="true"
      :pending="!!actionPending"
      :error="actionError"
      @cancel="closeConfirm"
      @confirm="applyConfirm"
    />
    <BrokerRawPayloadViewer
      :open="rawOpen"
      :event-id="rawEventId"
      :payload="rawPayload"
      :metadata="rawMetadata"
      :loading="rawLoading"
      :error="rawError"
      @close="closeRaw"
    />
  </section>
</template>
