<script>
// Вкладка «Вебхуки Lava.Top»: журнал входящих вебхуков и статус их форварда.
// Презентация; данные пропсами, обновление и reforward — эмитами. CSS глобальный.
import {
  formatTime,
  isWebhookOk,
  rowClassWebhook,
  updatedSince
} from '../../shared/lavatopHomeFormat'

export default {
  name: 'HomeWebhooksTab',
  props: {
    webhooks: { type: Array, default: () => [] },
    lastUpdatedTs: { type: Number, default: 0 },
    now: { type: Number, default: 0 },
    hasFilter: { type: Boolean, default: false }
  },
  emits: ['refresh', 'reforward'],
  methods: {
    formatTime,
    isWebhookOk,
    rowClassWebhook,
    updatedSince(ts) {
      return updatedSince(this.now, ts)
    }
  }
}
</script>

<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Вебхуки Lava.Top</h2>
      <span class="updated-since muted">{{ updatedSince(lastUpdatedTs) }}</span>
      <button type="button" class="btn-mini head-action" @click="$emit('refresh')" title="Обновить">
        <i class="fas fa-rotate"></i>
      </button>
    </header>
    <div v-if="webhooks.length > 0" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>Тип</th>
            <th>contractId</th>
            <th>Форвард URL</th>
            <th>HTTP</th>
            <th>Статус</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in webhooks" :key="w.id" :class="rowClassWebhook(w)">
            <td>{{ formatTime(w.created_at) }}</td>
            <td>{{ w.event_type }}</td>
            <td>
              <code>{{ w.lava_contract_id }}</code>
            </td>
            <td>{{ w.forward_url || '—' }}</td>
            <td>{{ w.forward_status_code || '—' }}</td>
            <td :class="isWebhookOk(w) ? 'cell-ok' : 'cell-err'">
              <span v-if="isWebhookOk(w)">✓ доставлен</span>
              <span v-else>✗ {{ w.processing_error || w.forward_error || '—' }}</span>
            </td>
            <td>
              <button class="btn-mini" @click="$emit('reforward', w.id)" title="Переслать повторно">
                <i class="fas fa-paper-plane"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <i class="fas fa-bell empty-icon"></i>
      <p class="empty-title">
        {{ hasFilter ? 'За выбранный период вебхуков нет' : 'Вебхуков пока нет' }}
      </p>
      <p class="empty-hint">
        Сюда попадут вебхуки Lava.Top (payment.*, subscription.*) и статус их форварда клиенту.
      </p>
    </div>
  </section>
</template>
