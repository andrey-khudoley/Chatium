<script setup lang="ts">
type SummaryValue =
  | string
  | number
  | boolean
  | null
  | { kind: 'object'; keys: number }
  | { kind: 'array'; length: number }

export type BrokerEventRow = {
  eventId: string
  producerModule: string
  eventType: string
  eventVersion: number
  contractKey: string
  occurredAt: number
  publishedAt: number
  targetModules: string[]
  aggregateType: string
  aggregateId: string
  primarySummary: Array<{ label: string; path: string; value: SummaryValue; truncated?: boolean }>
}

defineProps<{
  events: BrokerEventRow[]
  loading?: boolean
  actionPending?: string
}>()

defineEmits<{
  (e: 'view-raw', row: BrokerEventRow): void
}>()

function renderSummaryValue(value: SummaryValue): string {
  if (value === null) return 'null'
  if (typeof value === 'object') {
    if (value.kind === 'array') return `array(${value.length})`
    return `object(${value.keys})`
  }
  return String(value)
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
          <th>Event</th>
          <th>Producer</th>
          <th>Summary</th>
          <th>Published</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="5" class="broker-empty">
            <i class="fas fa-circle-notch fa-spin"></i> Загрузка
          </td>
        </tr>
        <tr v-else-if="!events.length">
          <td colspan="5" class="broker-empty">События не найдены</td>
        </tr>
        <tr v-for="item in events" v-else :key="item.eventId">
          <td>
            <strong>{{ item.eventType }}@{{ item.eventVersion }}</strong>
            <span>{{ item.eventId }}</span>
          </td>
          <td>
            <span>{{ item.producerModule }}</span>
            <span>{{ item.aggregateType }}:{{ item.aggregateId || '—' }}</span>
          </td>
          <td>
            <div v-if="item.primarySummary.length" class="broker-summary">
              <span v-for="field in item.primarySummary" :key="field.path">
                {{ field.label }}={{ renderSummaryValue(field.value)
                }}{{ field.truncated ? '…' : '' }}
              </span>
            </div>
            <span v-else>—</span>
          </td>
          <td>{{ formatTime(item.publishedAt) }}</td>
          <td class="broker-actions">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :disabled="!!actionPending"
              @click="$emit('view-raw', item)"
            >
              <i class="fas fa-code"></i> Raw
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
