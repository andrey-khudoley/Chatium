<script setup lang="ts">
// Презентационная таблица deliveries с действиями requeue/skip.
// requeue доступен для failed/dead_letter, skip — для всех, кроме acked/skipped.
import {
  formatBrokerTs,
  deliveryStatusClass,
  isRequeueable,
  isSkippable,
  type BrokerDeliveryView
} from '../../../shared/brokerOps'

defineProps<{ deliveries: BrokerDeliveryView[] }>()

defineEmits<{
  (e: 'requeue', delivery: BrokerDeliveryView): void
  (e: 'skip', delivery: BrokerDeliveryView): void
}>()
</script>

<template>
  <div class="brk-table-scroll custom-scrollbar">
    <table class="brk-table">
      <thead>
        <tr>
          <th>Доставка</th>
          <th>Подписка</th>
          <th>Событие</th>
          <th>Статус</th>
          <th>Попыток</th>
          <th>Доступна</th>
          <th class="brk-th-act">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!deliveries.length">
          <td colspan="7" class="brk-empty">Доставок нет</td>
        </tr>
        <tr v-for="d in deliveries" :key="d.deliveryId">
          <td>
            <div class="brk-cell-sub">{{ d.deliveryId }}</div>
            <div v-if="d.lastError" class="brk-cell-err" :title="d.lastError">
              {{ d.lastError }}
            </div>
          </td>
          <td>
            <div class="brk-cell-main">{{ d.subscriptionKey }}</div>
            <div class="brk-cell-sub">{{ d.consumerModule }}</div>
          </td>
          <td class="brk-cell-sub">{{ d.eventType }} v{{ d.eventVersion }}</td>
          <td>
            <span class="brk-st" :class="deliveryStatusClass(d.status)">{{ d.status }}</span>
          </td>
          <td class="brk-num">{{ d.attempts }}</td>
          <td class="brk-cell-sub">{{ formatBrokerTs(d.availableAt) }}</td>
          <td class="brk-th-act">
            <div class="brk-act-group">
              <button
                v-if="isRequeueable(d.status)"
                type="button"
                class="ap-btn ap-btn--sm"
                @click="$emit('requeue', d)"
              >
                <i class="fas fa-redo"></i> Requeue
              </button>
              <button
                v-if="isSkippable(d.status)"
                type="button"
                class="ap-btn ap-btn--sm ap-btn--danger"
                @click="$emit('skip', d)"
              >
                <i class="fas fa-forward"></i> Skip
              </button>
              <span v-if="!isRequeueable(d.status) && !isSkippable(d.status)" class="brk-cell-sub"
                >—</span
              >
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
