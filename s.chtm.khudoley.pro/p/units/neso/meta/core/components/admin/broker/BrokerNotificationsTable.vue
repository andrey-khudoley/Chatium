<script setup lang="ts">
// Презентационная таблица notification attempts с действием retry (failed/skipped).
import {
  formatBrokerTs,
  notificationStatusClass,
  isNotificationRetryable,
  type BrokerNotificationView
} from '../../../shared/brokerOps'

defineProps<{ notifications: BrokerNotificationView[] }>()

defineEmits<{ (e: 'retry', notification: BrokerNotificationView): void }>()
</script>

<template>
  <div class="brk-table-scroll custom-scrollbar">
    <table class="brk-table">
      <thead>
        <tr>
          <th>Уведомление</th>
          <th>Потребитель</th>
          <th>Режим</th>
          <th>Статус</th>
          <th>Попыток</th>
          <th>След. попытка</th>
          <th class="brk-th-act">Действие</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!notifications.length">
          <td colspan="7" class="brk-empty">Уведомлений нет</td>
        </tr>
        <tr v-for="n in notifications" :key="n.notificationId">
          <td>
            <div class="brk-cell-sub">{{ n.notificationId }}</div>
            <div class="brk-cell-sub">{{ n.subscriptionKey }}</div>
            <div v-if="n.lastError" class="brk-cell-err" :title="n.lastError">
              {{ n.lastError }}
            </div>
          </td>
          <td>{{ n.consumerModule }}</td>
          <td>
            <span class="brk-st brk-st--info">{{ n.mode }}</span>
          </td>
          <td>
            <span class="brk-st" :class="notificationStatusClass(n.status)">{{ n.status }}</span>
          </td>
          <td class="brk-num">{{ n.attempts }}</td>
          <td class="brk-cell-sub">{{ formatBrokerTs(n.nextAttemptAt) }}</td>
          <td class="brk-th-act">
            <button
              v-if="isNotificationRetryable(n.status)"
              type="button"
              class="ap-btn ap-btn--sm"
              @click="$emit('retry', n)"
            >
              <i class="fas fa-redo"></i> Retry
            </button>
            <span v-else class="brk-cell-sub">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
