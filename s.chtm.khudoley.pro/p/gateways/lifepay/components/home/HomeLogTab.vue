<script>
// Презентация вкладок журналов главной панели: «Входящие запросы клиентов»
// (kind='requests') и «Исходящие вызовы к LifePay» (kind='upstream'). Структура
// одинакова, различаются колонки/тексты. Данные — из HomePage; CSS глобальный.
import {
  formatTime,
  updatedSince,
  rowClassRequest,
  rowClassUpstream
} from '../../shared/lifepayHomeFormat'

export default {
  name: 'HomeLogTab',
  props: {
    kind: { type: String, required: true },
    rows: { type: Array, default: () => [] },
    lastUpdatedTs: { type: Number, default: 0 },
    now: { type: Number, default: 0 },
    hasFilter: { type: Boolean, default: false }
  },
  emits: ['refresh', 'open-raw'],
  computed: {
    isRequests() {
      return this.kind === 'requests'
    },
    heading() {
      return this.isRequests ? 'Входящие запросы клиентов' : 'Исходящие вызовы к LifePay'
    },
    emptyIcon() {
      return this.isRequests ? 'fas fa-inbox empty-icon' : 'fas fa-tower-broadcast empty-icon'
    },
    emptyTitle() {
      if (this.isRequests) {
        return this.hasFilter ? 'За выбранный период записей нет' : 'Запросов пока нет'
      }
      return this.hasFilter ? 'За выбранный период вызовов нет' : 'Вызовов LifePay пока нет'
    },
    emptyHint() {
      return this.isRequests
        ? 'Сюда попадут все обращения клиентов к /api/v1/{op}.'
        : 'Сюда попадут все исходящие запросы к LifePay.'
    }
  },
  methods: {
    formatTime,
    rowClass(row) {
      return this.isRequests ? rowClassRequest(row) : rowClassUpstream(row)
    },
    updatedSinceLabel() {
      return updatedSince(this.now, this.lastUpdatedTs)
    }
  }
}
</script>

<template>
  <section class="panel-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>{{ heading }}</h2>
      <span class="updated-since muted">{{ updatedSinceLabel() }}</span>
      <button type="button" class="btn-mini head-action" @click="$emit('refresh')" title="Обновить">
        <i class="fas fa-rotate"></i>
      </button>
    </header>
    <div v-if="rows.length > 0" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr v-if="isRequests">
            <th>Время</th>
            <th>requestId</th>
            <th>op</th>
            <th>метод</th>
            <th>HTTP</th>
            <th>errorCode</th>
            <th>ms</th>
            <th>raw</th>
          </tr>
          <tr v-else>
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
          <tr v-for="row in rows" :key="row.id" :class="rowClass(row)">
            <td>{{ formatTime(isRequests ? row.requestedAt : row.sentAt) }}</td>
            <td>
              <code>{{ row.requestId }}</code>
            </td>
            <td>{{ row.op }}</td>
            <template v-if="isRequests">
              <td>{{ row.method }}</td>
              <td>{{ row.clientHttpStatus }}</td>
              <td>{{ row.errorCode || '—' }}</td>
            </template>
            <template v-else>
              <td>{{ row.upstreamKind }}</td>
              <td>{{ row.lpHttpStatus || '—' }}</td>
              <td>{{ row.semanticRule || '—' }}</td>
            </template>
            <td>{{ row.durationMs }}</td>
            <td>
              <button
                class="btn-mini"
                @click="$emit('open-raw', isRequests ? 'request' : 'upstream', row.id)"
                :title="isRequests ? 'Полное тело запроса' : 'Полное тело ответа LifePay'"
              >
                <i class="fas fa-code"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <i :class="emptyIcon"></i>
      <p class="empty-title">{{ emptyTitle }}</p>
      <p class="empty-hint">{{ emptyHint }}</p>
    </div>
  </section>
</template>
