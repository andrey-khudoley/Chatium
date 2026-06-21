<script>
// Вкладка «Исходящие вызовы к Lava.Top»: таблица журнала upstream-вызовов.
// Презентация; данные пропсами, обновление и raw — эмитами. CSS глобальный.
import { formatTime, rowClassUpstream, updatedSince } from '../../shared/lavatopHomeFormat'

export default {
  name: 'HomeUpstreamTab',
  props: {
    upstream: { type: Array, default: () => [] },
    lastUpdatedTs: { type: Number, default: 0 },
    now: { type: Number, default: 0 },
    hasFilter: { type: Boolean, default: false }
  },
  emits: ['refresh', 'open-raw'],
  methods: {
    formatTime,
    rowClassUpstream,
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
      <h2>Исходящие вызовы к Lava.Top</h2>
      <span class="updated-since muted">{{ updatedSince(lastUpdatedTs) }}</span>
      <button type="button" class="btn-mini head-action" @click="$emit('refresh')" title="Обновить">
        <i class="fas fa-rotate"></i>
      </button>
    </header>
    <div v-if="upstream.length > 0" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>requestId</th>
            <th>op</th>
            <th>kind</th>
            <th>HTTP LP</th>
            <th>semanticRule</th>
            <th>ms</th>
            <th>raw</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in upstream" :key="u.id" :class="rowClassUpstream(u)">
            <td>{{ formatTime(u.sentAt) }}</td>
            <td>
              <code>{{ u.requestId }}</code>
            </td>
            <td>{{ u.op }}</td>
            <td>{{ u.upstreamKind }}</td>
            <td>{{ u.lpHttpStatus || '—' }}</td>
            <td>{{ u.semanticRule || '—' }}</td>
            <td>{{ u.durationMs }}</td>
            <td>
              <button
                class="btn-mini"
                @click="$emit('open-raw', 'upstream', u.id)"
                title="Полное тело ответа Lava.Top"
              >
                <i class="fas fa-code"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <i class="fas fa-tower-broadcast empty-icon"></i>
      <p class="empty-title">
        {{ hasFilter ? 'За выбранный период вызовов нет' : 'Вызовов Lava.Top пока нет' }}
      </p>
      <p class="empty-hint">Сюда попадут все исходящие запросы к Lava.Top.</p>
    </div>
  </section>
</template>
