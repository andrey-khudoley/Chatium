<script>
// Вкладка «Входящие запросы клиентов»: таблица журнала /api/v1/{op}.
// Презентация; данные пропсами, обновление и raw — эмитами. CSS глобальный.
import { formatTime, rowClassRequest, updatedSince } from '../../shared/lavatopHomeFormat'

export default {
  name: 'HomeRequestsTab',
  props: {
    requests: { type: Array, default: () => [] },
    lastUpdatedTs: { type: Number, default: 0 },
    now: { type: Number, default: 0 },
    hasFilter: { type: Boolean, default: false }
  },
  emits: ['refresh', 'open-raw'],
  methods: {
    formatTime,
    rowClassRequest,
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
      <h2>Входящие запросы клиентов</h2>
      <span class="updated-since muted">{{ updatedSince(lastUpdatedTs) }}</span>
      <button type="button" class="btn-mini head-action" @click="$emit('refresh')" title="Обновить">
        <i class="fas fa-rotate"></i>
      </button>
    </header>
    <div v-if="requests.length > 0" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>requestId</th>
            <th>op</th>
            <th>метод</th>
            <th>HTTP</th>
            <th>errorCode</th>
            <th>ms</th>
            <th>raw</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in requests" :key="r.id" :class="rowClassRequest(r)">
            <td>{{ formatTime(r.requestedAt) }}</td>
            <td>
              <code>{{ r.requestId }}</code>
            </td>
            <td>{{ r.op }}</td>
            <td>{{ r.method }}</td>
            <td>{{ r.clientHttpStatus }}</td>
            <td>{{ r.errorCode || '—' }}</td>
            <td>{{ r.durationMs }}</td>
            <td>
              <button
                class="btn-mini"
                @click="$emit('open-raw', 'request', r.id)"
                title="Полное тело запроса"
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
      <p class="empty-title">
        {{ hasFilter ? 'За выбранный период записей нет' : 'Запросов пока нет' }}
      </p>
      <p class="empty-hint">Сюда попадут все обращения клиентов к /api/v1/{op}.</p>
    </div>
  </section>
</template>
