<script setup lang="ts">
export type BrokerNotificationRow = {
  notificationId: string
  consumerModule: string
  subscriptionKey: string
  deliveryIds: string[]
  mode: string
  status: string
  attempts: number
  nextAttemptAt: number
  lastError: string
  updatedAt: number
}

defineProps<{
  notifications: BrokerNotificationRow[]
  loading?: boolean
  actionPending?: string
}>()

defineEmits<{
  (e: 'retry', row: BrokerNotificationRow): void
}>()

function canRetry(row: BrokerNotificationRow): boolean {
  return row.status === 'failed' || row.status === 'skipped'
}

function formatTime(value: number): string {
  return value ? new Date(value).toLocaleString() : '—'
}
</script>

<template>
  <div class="broker-table-wrap">
    <table class="broker-table">
      <thead>
        <tr>
          <th>Notification</th>
          <th>Consumer</th>
          <th>Status</th>
          <th>Deliveries</th>
          <th>Error</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="6" class="broker-empty">
            <i class="fas fa-circle-notch fa-spin"></i> Загрузка
          </td>
        </tr>
        <tr v-else-if="!notifications.length">
          <td colspan="6" class="broker-empty">Notifications не найдены</td>
        </tr>
        <tr v-for="item in notifications" v-else :key="item.notificationId">
          <td>
            <strong>{{ item.mode }}</strong>
            <span>{{ item.notificationId }}</span>
          </td>
          <td>
            <span>{{ item.consumerModule }}</span>
            <span>{{ item.subscriptionKey }}</span>
          </td>
          <td>
            <span
              class="broker-pill"
              :class="{
                'broker-pill--ok': item.status === 'sent',
                'broker-pill--warn': item.status === 'failed' || item.status === 'pending',
                'broker-pill--off': item.status === 'skipped'
              }"
            >
              {{ item.status }} · #{{ item.attempts }}
            </span>
            <span>next {{ formatTime(item.nextAttemptAt) }}</span>
          </td>
          <td>{{ item.deliveryIds.join(', ') || '—' }}</td>
          <td>{{ item.lastError || '—' }}</td>
          <td class="broker-actions">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :disabled="!!actionPending || !canRetry(item)"
              @click="$emit('retry', item)"
            >
              <i class="fas fa-redo"></i> Retry
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
