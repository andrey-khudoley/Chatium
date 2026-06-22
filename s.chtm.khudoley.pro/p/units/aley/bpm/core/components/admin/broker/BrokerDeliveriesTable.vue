<script setup lang="ts">
export type BrokerDeliveryRow = {
  deliveryId: string
  eventId: string
  subscriptionKey: string
  consumerModule: string
  eventType: string
  eventVersion: number
  status: string
  attempts: number
  availableAt: number
  claimedUntil: number
  lastError: string
  updatedAt: number
}

defineProps<{
  deliveries: BrokerDeliveryRow[]
  loading?: boolean
  actionPending?: string
}>()

defineEmits<{
  (e: 'inspect-event', row: BrokerDeliveryRow): void
  (e: 'requeue', row: BrokerDeliveryRow): void
  (e: 'skip', row: BrokerDeliveryRow): void
}>()

function canRequeue(row: BrokerDeliveryRow): boolean {
  return row.status === 'failed' || row.status === 'dead_letter'
}

function canSkip(row: BrokerDeliveryRow): boolean {
  return row.status !== 'acked' && row.status !== 'skipped'
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
          <th>Delivery</th>
          <th>Consumer</th>
          <th>Status</th>
          <th>Timing</th>
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
        <tr v-else-if="!deliveries.length">
          <td colspan="6" class="broker-empty">Deliveries не найдены</td>
        </tr>
        <tr v-for="item in deliveries" v-else :key="item.deliveryId">
          <td>
            <strong>{{ item.eventType }}@{{ item.eventVersion }}</strong>
            <span>{{ item.deliveryId }}</span>
            <span>{{ item.eventId }}</span>
          </td>
          <td>
            <span>{{ item.consumerModule }}</span>
            <span>{{ item.subscriptionKey }}</span>
          </td>
          <td>
            <span
              class="broker-pill"
              :class="{
                'broker-pill--ok': item.status === 'acked',
                'broker-pill--warn': item.status === 'failed' || item.status === 'claimed',
                'broker-pill--off': item.status === 'dead_letter' || item.status === 'skipped'
              }"
            >
              {{ item.status }} · #{{ item.attempts }}
            </span>
          </td>
          <td>
            <span>available {{ formatTime(item.availableAt) }}</span>
            <span>claim until {{ formatTime(item.claimedUntil) }}</span>
          </td>
          <td>{{ item.lastError || '—' }}</td>
          <td class="broker-actions">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :disabled="!!actionPending"
              @click="$emit('inspect-event', item)"
            >
              <i class="fas fa-bolt"></i> Event
            </button>
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :disabled="!!actionPending || !canRequeue(item)"
              @click="$emit('requeue', item)"
            >
              <i class="fas fa-redo"></i> Requeue
            </button>
            <button
              type="button"
              class="ap-btn ap-btn--sm ap-btn--danger"
              :disabled="!!actionPending || !canSkip(item)"
              @click="$emit('skip', item)"
            >
              <i class="fas fa-forward"></i> Skip
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
