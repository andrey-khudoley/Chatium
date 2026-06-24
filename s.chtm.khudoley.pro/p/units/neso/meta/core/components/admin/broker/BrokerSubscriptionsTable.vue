<script setup lang="ts">
// Презентационная таблица подписок broker-а с действием enable/disable.
import { type BrokerSubscriptionView } from '../../../shared/brokerOps'

defineProps<{ subscriptions: BrokerSubscriptionView[] }>()

defineEmits<{ (e: 'toggle', subscription: BrokerSubscriptionView): void }>()

const eventTypesPreview = (types: string[]): string => {
  if (!types.length) return '*'
  if (types.length <= 2) return types.join(', ')
  return `${types.slice(0, 2).join(', ')} +${types.length - 2}`
}
</script>

<template>
  <div class="brk-table-scroll custom-scrollbar">
    <table class="brk-table">
      <thead>
        <tr>
          <th>Подписка</th>
          <th>Потребитель</th>
          <th>Состояние</th>
          <th>Типы событий</th>
          <th>Уведомления</th>
          <th class="brk-th-act">Действие</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!subscriptions.length">
          <td colspan="6" class="brk-empty">Подписки не зарегистрированы</td>
        </tr>
        <tr v-for="s in subscriptions" :key="s.subscriptionKey">
          <td>
            <div class="brk-cell-main">{{ s.displayName || s.subscriptionKey }}</div>
            <div class="brk-cell-sub">{{ s.subscriptionKey }}</div>
          </td>
          <td>{{ s.consumerModule }}</td>
          <td>
            <span class="brk-st" :class="s.enabled ? 'brk-st--ok' : 'brk-st--err'">
              {{ s.enabled ? 'активна' : 'выключена' }}
            </span>
            <span v-if="s.adminDisabled" class="brk-tag">admin off</span>
            <span v-if="s.targetedOnly" class="brk-tag">targeted</span>
          </td>
          <td class="brk-cell-sub">{{ eventTypesPreview(s.eventTypes) }}</td>
          <td>
            <span class="brk-st brk-st--info">{{ s.notificationMode }}</span>
          </td>
          <td class="brk-th-act">
            <button
              type="button"
              class="ap-btn ap-btn--sm"
              :class="{ 'ap-btn--danger': !s.adminDisabled }"
              @click="$emit('toggle', s)"
            >
              <i :class="s.adminDisabled ? 'fas fa-play' : 'fas fa-ban'"></i>
              {{ s.adminDisabled ? 'Включить' : 'Отключить' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
