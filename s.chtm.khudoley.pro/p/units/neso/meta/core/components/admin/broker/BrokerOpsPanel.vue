<script setup lang="ts">
// Контейнер broker ops-панели админки. Грузит diagnostics, переключает вкладки,
// фильтрует и оркеструет admin ops actions. Все мутации идут только через
// /api/admin/broker/* и требуют reason/comment через BrokerOpsConfirmModal.
// Raw payload не держится в общем состоянии списка — только в открытой карточке.
import { onMounted, ref, computed } from 'vue'
import BrokerModulesTable from './BrokerModulesTable.vue'
import BrokerSubscriptionsTable from './BrokerSubscriptionsTable.vue'
import BrokerEventsTable from './BrokerEventsTable.vue'
import BrokerDeliveriesTable from './BrokerDeliveriesTable.vue'
import BrokerNotificationsTable from './BrokerNotificationsTable.vue'
import BrokerOpsConfirmModal from './BrokerOpsConfirmModal.vue'
import BrokerRawPayloadViewer from './BrokerRawPayloadViewer.vue'
import { adminBrokerDiagnosticsRoute } from '../../../api/admin/broker/diagnostics'
import { adminBrokerModuleToggleRoute } from '../../../api/admin/broker/modules/toggle'
import { adminBrokerSubscriptionToggleRoute } from '../../../api/admin/broker/subscriptions/toggle'
import { adminBrokerDeliveryRequeueRoute } from '../../../api/admin/broker/deliveries/requeue'
import { adminBrokerDeliverySkipRoute } from '../../../api/admin/broker/deliveries/skip'
import { adminBrokerNotificationsRetryRoute } from '../../../api/admin/broker/notifications/retry'
import { createComponentLogger } from '../../../shared/logger'
import {
  BROKER_OPS_TABS,
  formatBrokerTs,
  type BrokerOpsTab,
  type BrokerOpsActionRequest,
  type BrokerDiagnosticsData,
  type BrokerDiagnosticsResult,
  type BrokerModuleView,
  type BrokerSubscriptionView,
  type BrokerEventView,
  type BrokerDeliveryView,
  type BrokerNotificationView
} from '../../../shared/brokerOps'

const log = createComponentLogger('BrokerOpsPanel')

declare const ctx: app.Ctx

const EMPTY: BrokerDiagnosticsData = {
  modules: [],
  subscriptions: [],
  events: [],
  deliveries: [],
  notifications: []
}

const activeTab = ref<BrokerOpsTab>('modules')
const loading = ref(false)
const error = ref('')
const actionError = ref('')
const lastUpdatedAt = ref(0)
const limit = ref(50)
const filterValue = ref('')
const data = ref<BrokerDiagnosticsData>({ ...EMPTY })

const pendingAction = ref<BrokerOpsActionRequest | null>(null)
const confirmBusy = ref(false)

const rawVisible = ref(false)
const rawEvent = ref<BrokerEventView | null>(null)

// Монотонный токен запросов: применяем результат только последнего load(),
// чтобы перекрывающиеся загрузки (смена вкладки/фильтр/refresh/reload после
// действия) не перезаписывали свежие данные устаревшим ответом.
let loadSeq = 0

const filterPlaceholder = computed(() => {
  switch (activeTab.value) {
    case 'subscriptions':
      return 'Фильтр по ключу подписки'
    case 'events':
      return 'Фильтр по типу события'
    case 'deliveries':
      return 'Статус: pending/claimed/failed/dead_letter…'
    case 'notifications':
      return 'Статус: pending/sent/failed/skipped'
    default:
      return ''
  }
})

const filterEnabled = computed(() => activeTab.value !== 'modules')

const counts = computed<Record<BrokerOpsTab, number>>(() => ({
  modules: data.value.modules.length,
  subscriptions: data.value.subscriptions.length,
  events: data.value.events.length,
  deliveries: data.value.deliveries.length,
  notifications: data.value.notifications.length
}))

const buildQuery = (): Record<string, string> => {
  const query: Record<string, string> = { limit: String(limit.value) }
  const value = filterValue.value.trim()
  if (value) {
    if (activeTab.value === 'subscriptions') query.subscriptionKey = value
    else if (activeTab.value === 'events') query.eventType = value
    else if (activeTab.value === 'deliveries') query.deliveryStatus = value
    else if (activeTab.value === 'notifications') query.notificationStatus = value
  }
  return query
}

const load = async () => {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const res = await adminBrokerDiagnosticsRoute.query(buildQuery()).run(ctx)
    if (seq !== loadSeq) return // пришёл более новый запрос — этот ответ устарел
    if (!res || typeof res !== 'object') {
      error.value = 'Некорректный ответ диагностики брокера'
      log.error('Diagnostics вернул не объект', { raw: String(res) })
      return
    }
    const result = res as BrokerDiagnosticsResult
    if (result.success) {
      data.value = {
        modules: result.modules ?? [],
        subscriptions: result.subscriptions ?? [],
        events: result.events ?? [],
        deliveries: result.deliveries ?? [],
        notifications: result.notifications ?? []
      }
      lastUpdatedAt.value = Date.now()
      log.info('Diagnostics загружены', { tab: activeTab.value, counts: counts.value })
    } else {
      error.value = result.error || 'Не удалось загрузить диагностику брокера'
      log.error('Ошибка загрузки diagnostics', error.value)
    }
  } catch (e) {
    if (seq !== loadSeq) return
    error.value = (e as Error)?.message || 'Не удалось загрузить диагностику брокера'
    log.error('Исключение при загрузке diagnostics', error.value)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

const selectTab = (tab: BrokerOpsTab) => {
  if (tab === activeTab.value) return
  activeTab.value = tab
  filterValue.value = ''
  error.value = ''
  actionError.value = ''
  log.debug('Переключение вкладки broker ops', { tab })
  load()
}

const requestModuleToggle = (m: BrokerModuleView) => {
  const enable = m.adminDisabled
  pendingAction.value = {
    kind: 'module-toggle',
    targetId: m.moduleKey,
    enabled: enable,
    danger: !enable,
    title: enable ? 'Включить модуль' : 'Отключить модуль',
    description: `${enable ? 'Включение' : 'Отключение'} модуля «${m.displayName || m.moduleKey}» (${m.moduleKey}).`
  }
}

const requestSubscriptionToggle = (s: BrokerSubscriptionView) => {
  const enable = s.adminDisabled
  pendingAction.value = {
    kind: 'subscription-toggle',
    targetId: s.subscriptionKey,
    enabled: enable,
    danger: !enable,
    title: enable ? 'Включить подписку' : 'Отключить подписку',
    description: `${enable ? 'Включение' : 'Отключение'} подписки «${s.displayName || s.subscriptionKey}» (${s.subscriptionKey}).`
  }
}

const requestRequeue = (d: BrokerDeliveryView) => {
  pendingAction.value = {
    kind: 'delivery-requeue',
    targetId: d.deliveryId,
    title: 'Requeue доставки',
    description: `Повторная постановка доставки ${d.deliveryId} (статус ${d.status}) в очередь.`
  }
}

const requestSkip = (d: BrokerDeliveryView) => {
  pendingAction.value = {
    kind: 'delivery-skip',
    targetId: d.deliveryId,
    danger: true,
    title: 'Skip доставки',
    description: `Пропуск poison-доставки ${d.deliveryId} (статус ${d.status}). Доставка не будет обработана потребителем.`
  }
}

const requestNotificationRetry = (n: BrokerNotificationView) => {
  pendingAction.value = {
    kind: 'notification-retry',
    targetId: n.notificationId,
    title: 'Retry уведомления',
    description: `Повтор уведомления ${n.notificationId} для подписки ${n.subscriptionKey}.`
  }
}

const runAction = async (
  action: BrokerOpsActionRequest,
  reason: string
): Promise<BrokerDiagnosticsResult> => {
  switch (action.kind) {
    case 'module-toggle':
      return (await adminBrokerModuleToggleRoute.run(ctx, {
        moduleKey: action.targetId,
        enabled: action.enabled === true,
        reason
      })) as BrokerDiagnosticsResult
    case 'subscription-toggle':
      return (await adminBrokerSubscriptionToggleRoute.run(ctx, {
        subscriptionKey: action.targetId,
        enabled: action.enabled === true,
        reason
      })) as BrokerDiagnosticsResult
    case 'delivery-requeue':
      return (await adminBrokerDeliveryRequeueRoute.run(ctx, {
        deliveryId: action.targetId,
        reason
      })) as BrokerDiagnosticsResult
    case 'delivery-skip':
      return (await adminBrokerDeliverySkipRoute.run(ctx, {
        deliveryId: action.targetId,
        reason
      })) as BrokerDiagnosticsResult
    case 'notification-retry':
      return (await adminBrokerNotificationsRetryRoute.run(ctx, {
        notificationId: action.targetId,
        reason
      })) as BrokerDiagnosticsResult
    default:
      return { success: false, error: 'Неизвестное действие' }
  }
}

const confirmAction = async (reason: string) => {
  const action = pendingAction.value
  if (!action) return
  confirmBusy.value = true
  actionError.value = ''
  try {
    const result = await runAction(action, reason)
    if (result?.success) {
      log.notice('Ops-действие выполнено', { kind: action.kind, targetId: action.targetId })
      pendingAction.value = null
      await load()
    } else {
      actionError.value = result?.error || 'Действие не выполнено'
      pendingAction.value = null
      log.error('Ops-действие отклонено', { kind: action.kind, error: actionError.value })
    }
  } catch (e) {
    actionError.value = (e as Error)?.message || 'Действие не выполнено'
    pendingAction.value = null
    log.error('Исключение при ops-действии', { kind: action.kind, error: actionError.value })
  } finally {
    confirmBusy.value = false
  }
}

const cancelAction = () => {
  pendingAction.value = null
  actionError.value = ''
}

const openRaw = (ev: BrokerEventView) => {
  rawEvent.value = ev
  rawVisible.value = true
  log.info('Открыт raw payload', { eventId: ev.eventId })
}

const closeRaw = () => {
  rawVisible.value = false
}

onMounted(() => {
  log.info('Broker ops-панель смонтирована')
  load()
})
</script>

<template>
  <section class="ap-card brk-panel ap-card--stagger-3">
    <div class="ap-card-hd">
      <h2><i class="fas fa-network-wired ap-icon-hd"></i> Брокер событий</h2>
      <div class="brk-hd-right">
        <span v-if="lastUpdatedAt" class="ap-log-ct">{{ formatBrokerTs(lastUpdatedAt) }}</span>
        <button type="button" class="ap-btn ap-btn--sm" :disabled="loading" @click="load">
          <i class="fas" :class="loading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'"></i>
          Обновить
        </button>
      </div>
    </div>

    <div class="brk-tabs">
      <button
        v-for="t in BROKER_OPS_TABS"
        :key="t.key"
        type="button"
        class="ap-flt brk-tab"
        :class="{ active: activeTab === t.key }"
        @click="selectTab(t.key)"
      >
        <i :class="t.icon"></i> {{ t.label }}
        <span class="brk-tab-ct">{{ counts[t.key] }}</span>
      </button>
    </div>

    <div class="brk-toolbar">
      <input
        v-if="filterEnabled"
        v-model="filterValue"
        type="text"
        class="ap-input brk-filter"
        :placeholder="filterPlaceholder"
        @keyup.enter="load"
      />
      <div class="brk-toolbar-right">
        <label class="brk-limit-label">
          Лимит
          <input
            v-model.number="limit"
            type="number"
            min="1"
            max="200"
            class="ap-input brk-limit"
          />
        </label>
        <button v-if="filterEnabled" type="button" class="ap-btn ap-btn--sm" @click="load">
          <i class="fas fa-filter"></i> Применить
        </button>
      </div>
    </div>

    <p v-if="error" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ error }}</p>
    <p v-if="actionError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ actionError }}
    </p>

    <div class="brk-body">
      <BrokerModulesTable
        v-if="activeTab === 'modules'"
        :modules="data.modules"
        @toggle="requestModuleToggle"
      />
      <BrokerSubscriptionsTable
        v-else-if="activeTab === 'subscriptions'"
        :subscriptions="data.subscriptions"
        @toggle="requestSubscriptionToggle"
      />
      <BrokerEventsTable
        v-else-if="activeTab === 'events'"
        :events="data.events"
        @open-raw="openRaw"
      />
      <BrokerDeliveriesTable
        v-else-if="activeTab === 'deliveries'"
        :deliveries="data.deliveries"
        @requeue="requestRequeue"
        @skip="requestSkip"
      />
      <BrokerNotificationsTable
        v-else
        :notifications="data.notifications"
        @retry="requestNotificationRetry"
      />
    </div>

    <BrokerOpsConfirmModal
      :visible="!!pendingAction"
      :title="pendingAction?.title ?? ''"
      :description="pendingAction?.description ?? ''"
      :danger="pendingAction?.danger"
      :busy="confirmBusy"
      @confirm="confirmAction"
      @cancel="cancelAction"
    />

    <BrokerRawPayloadViewer :visible="rawVisible" :event="rawEvent" @close="closeRaw" />
  </section>
</template>
