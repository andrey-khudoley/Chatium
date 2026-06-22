<script setup lang="ts">
export type BrokerSubscriptionRow = {
  subscriptionKey: string
  consumerModule: string
  displayName: string
  enabled: boolean
  declaredEnabled: boolean
  adminDisabled: boolean
  sourceModules: string[]
  eventTypes: string[]
  targetedOnly: boolean
  notificationMode: string
  maxBatchSize: number
  ackTimeoutMs: number
  handlerKeyConfigured?: boolean
  socketKeyConfigured?: boolean
  retryPolicy?: {
    maxAttempts?: number
    initialDelayMs?: number
    backoffMultiplier?: number
  }
}

defineProps<{
  subscriptions: BrokerSubscriptionRow[]
  loading?: boolean
  actionPending?: string
}>()

defineEmits<{
  (e: 'toggle', row: BrokerSubscriptionRow, enabled: boolean): void
}>()
</script>

<template>
  <div class="broker-table-wrap">
    <table class="broker-table">
      <thead>
        <tr>
          <th>Subscription</th>
          <th>Consumer</th>
          <th>Status</th>
          <th>Events</th>
          <th>Delivery</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="6" class="broker-empty">
            <i class="fas fa-circle-notch fa-spin"></i> Загрузка
          </td>
        </tr>
        <tr v-else-if="!subscriptions.length">
          <td colspan="6" class="broker-empty">Подписки не найдены</td>
        </tr>
        <tr v-for="item in subscriptions" v-else :key="item.subscriptionKey">
          <td>
            <strong>{{ item.displayName || item.subscriptionKey }}</strong>
            <span>{{ item.subscriptionKey }}</span>
          </td>
          <td>{{ item.consumerModule }}</td>
          <td>
            <span
              class="broker-pill"
              :class="item.enabled ? 'broker-pill--ok' : 'broker-pill--off'"
            >
              {{ item.enabled ? 'enabled' : item.adminDisabled ? 'admin stop' : 'disabled' }}
            </span>
          </td>
          <td>
            <span>{{ item.eventTypes.join(', ') || '*' }}</span>
            <span v-if="item.targetedOnly">targeted</span>
            <span>{{ item.sourceModules.join(', ') || 'all sources' }}</span>
          </td>
          <td>
            <span>
              {{ item.notificationMode }} · batch {{ item.maxBatchSize }} · ack
              {{ Math.round(item.ackTimeoutMs / 1000) }}s
            </span>
            <span>
              handler {{ item.handlerKeyConfigured ? 'yes' : 'no' }} · socket
              {{ item.socketKeyConfigured ? 'yes' : 'no' }}
            </span>
            <span v-if="item.retryPolicy">
              retry {{ item.retryPolicy.maxAttempts || 0 }}x ·
              {{ item.retryPolicy.initialDelayMs || 0 }}ms · x{{
                item.retryPolicy.backoffMultiplier || 1
              }}
            </span>
          </td>
          <td class="broker-actions">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :class="{ 'ap-btn--danger': item.enabled }"
              :disabled="!!actionPending"
              @click="$emit('toggle', item, !item.enabled)"
            >
              <i :class="item.enabled ? 'fas fa-ban' : 'fas fa-power-off'"></i>
              {{ item.enabled ? 'Stop' : 'Enable' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
