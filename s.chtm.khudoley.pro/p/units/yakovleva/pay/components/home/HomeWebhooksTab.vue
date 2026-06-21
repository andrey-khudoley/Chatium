<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Журнал входящих webhook</h2>
      <span class="updated-since muted">{{ updatedSinceTs(lastUpdatedTs) }}</span>
      <button type="button" class="btn-mini head-action" @click="$emit('refresh')" title="Обновить">
        <i class="fas fa-rotate"></i>
      </button>
    </header>
    <div class="filter-pills" role="tablist">
      <button
        v-for="f in filters"
        :key="f.id"
        :class="['pill', { active: currentFilter === f.id }]"
        type="button"
        @click="$emit('update:filter', f.id)"
      >
        {{ f.label }}
        <span class="pill-count">{{ countFor(f.id) }}</span>
      </button>
    </div>
    <div v-if="filteredWebhooks.length > 0" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Время</th>
            <th title="Гейтвей: lifepay / lavatop">GW</th>
            <th>number</th>
            <th>orderNumber</th>
            <th>токен</th>
            <th>dup</th>
            <th>сумма</th>
            <th>type</th>
            <th>статус</th>
            <th>raw</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in filteredWebhooks" :key="w.id" :class="rowClassWebhook(w)">
            <td>{{ formatTime(w.processedAt) }}</td>
            <td>
              <span class="gateway-badge" :class="'gateway-' + (w.gatewayId || 'unknown')">
                {{ w.gatewayId || '—' }}
              </span>
            </td>
            <td>{{ w.number }}</td>
            <td>{{ w.orderNumber }}</td>
            <td :class="w.tokenValid ? 'cell-ok' : 'cell-warn'">
              {{ w.tokenValid ? '✓' : '✗' }}
            </td>
            <td>
              <span v-if="w.duplicate" class="dup-badge">дубль</span>
            </td>
            <td>{{ w.amount }}</td>
            <td>{{ w.type }}</td>
            <td :class="w.status === 'success' ? 'cell-ok' : 'cell-err'">{{ w.status }}</td>
            <td>
              <button
                class="btn-mini"
                @click="$emit('open-raw', 'webhook', w.id)"
                title="Полное тело webhook"
              >
                <i class="fas fa-code"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <i class="fas fa-inbox empty-icon"></i>
      <p class="empty-title">Под фильтр ничего не подходит</p>
      <p class="empty-hint">
        <button class="link-button" @click="$emit('update:filter', 'all')">Сбросить фильтр</button>
      </p>
    </div>
  </section>
</template>

<script>
// Презентация вкладки «Webhook»: журнал webhook_log с pill-фильтром.
// Данные приходят пропом filteredWebhooks (отфильтрованы в orchestrator'е),
// действия — через emit. CSS глобальный (sbpHomeCss*).
import { formatTime, rowClassWebhook, updatedSince } from '../../shared/sbpHomeFormat'

export default {
  name: 'HomeWebhooksTab',
  props: {
    filteredWebhooks: { type: Array, default: () => [] },
    filters: { type: Array, required: true },
    currentFilter: { type: String, default: 'all' },
    counts: {
      type: Object,
      default: () => ({ all: 0, success: 0, fail: 0, invalid: 0 })
    },
    lastUpdatedTs: { type: Number, default: 0 },
    now: { type: Number, default: 0 }
  },
  emits: ['refresh', 'update:filter', 'open-raw'],
  methods: {
    formatTime,
    rowClassWebhook,
    updatedSinceTs(ts) {
      return updatedSince(this.now, ts)
    },
    countFor(id) {
      const c = this.counts || {}
      return typeof c[id] === 'number' ? c[id] : 0
    }
  }
}
</script>
