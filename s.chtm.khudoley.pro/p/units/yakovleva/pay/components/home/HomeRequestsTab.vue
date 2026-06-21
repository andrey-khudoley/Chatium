<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Журнал исходящих запросов</h2>
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
    <div v-if="filteredRequests.length > 0" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Время</th>
            <th title="Гейтвей: lifepay / lavatop">GW</th>
            <th>requestId</th>
            <th>op</th>
            <th>HTTP</th>
            <th>статус</th>
            <th>errorCode</th>
            <th>lpRule</th>
            <th>ms</th>
            <th>raw</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRequests" :key="r.id" :class="rowClassRequest(r)">
            <td>{{ formatTime(r.requestedAt) }}</td>
            <td>
              <span class="gateway-badge" :class="'gateway-' + (r.gatewayId || 'unknown')">
                {{ r.gatewayId || '—' }}
              </span>
            </td>
            <td class="cell-id">
              <code>{{ r.requestId }}</code>
              <button
                v-if="r.requestId"
                class="btn-mini"
                @click="$emit('lookup', r.requestId)"
                title="Найти детали"
              >
                <i class="fas fa-magnifying-glass"></i>
              </button>
              <button
                v-if="r.requestId"
                class="btn-mini"
                @click="$emit('copy-text', r.requestId)"
                title="Скопировать"
              >
                <i class="far fa-copy"></i>
              </button>
            </td>
            <td>{{ r.op }}</td>
            <td>{{ r.clientHttpStatus }}</td>
            <td :class="r.ok ? 'cell-ok' : 'cell-err'">
              {{ r.ok ? '✓' : '✗' }}
            </td>
            <td>{{ r.errorCode || '—' }}</td>
            <td>{{ r.lpSemanticRule || '—' }}</td>
            <td>{{ r.durationMs }}</td>
            <td>
              <button
                class="btn-mini"
                @click="$emit('open-raw', 'request', r.id)"
                title="Полное тело ответа"
              >
                <i class="fas fa-code"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <i class="fas fa-filter empty-icon"></i>
      <p class="empty-title">Под фильтр ничего не подходит</p>
      <p class="empty-hint">
        <button class="link-button" @click="$emit('update:filter', 'all')">Сбросить фильтр</button>
        или
        <button class="link-button" @click="$emit('set-tab', 'createRequest')">
          создать запрос
        </button>
      </p>
    </div>
  </section>
</template>

<script>
// Презентация вкладки «Запросы»: журнал исходящих request_log с pill-фильтром.
// Источник данных и фильтрация — в orchestrator'е (computed filteredRequests);
// сюда приходят уже отфильтрованные строки. Действия — через emit.
// CSS глобальный (sbpHomeCss*); никаких <style scoped>.
import { formatTime, rowClassRequest, updatedSince } from '../../shared/sbpHomeFormat'

export default {
  name: 'HomeRequestsTab',
  props: {
    filteredRequests: { type: Array, default: () => [] },
    filters: { type: Array, required: true },
    currentFilter: { type: String, default: 'all' },
    counts: { type: Object, default: () => ({ all: 0, ok: 0, err: 0 }) },
    lastUpdatedTs: { type: Number, default: 0 },
    now: { type: Number, default: 0 }
  },
  emits: ['refresh', 'update:filter', 'lookup', 'copy-text', 'open-raw', 'set-tab'],
  methods: {
    formatTime,
    rowClassRequest,
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
