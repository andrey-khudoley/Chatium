<script>
// Презентация вкладок журналов главной панели: «Входящие запросы клиентов»
// (kind='requests') и «Исходящие вызовы к GetCourse» (kind='upstream'). Структура
// одинакова, различаются колонки/тексты. Данные — из HomePage; CSS глобальный.
import {
  formatTime,
  updatedSince,
  rowClassRequest,
  rowClassUpstream
} from '../../shared/gcHomeFormat'

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
      return this.isRequests ? 'Входящие запросы клиентов' : 'Исходящие вызовы к GetCourse'
    },
    refreshTitle() {
      return 'Обновить'
    },
    emptyIcon() {
      return this.isRequests ? 'fas fa-inbox empty-icon' : 'fas fa-tower-broadcast empty-icon'
    },
    emptyTitle() {
      if (this.isRequests) {
        return this.hasFilter ? 'За выбранный период записей нет' : 'Запросов пока нет'
      }
      return this.hasFilter ? 'За выбранный период вызовов нет' : 'Вызовов GetCourse пока нет'
    },
    emptyHint() {
      return this.isRequests
        ? 'Сюда попадут все обращения клиентов к /v1/{op}.'
        : 'Сюда попадут все исходящие запросы к GetCourse.'
    }
  },
  methods: {
    formatTime,
    rowClass(row) {
      return this.isRequests ? rowClassRequest(row) : rowClassUpstream(row)
    },
    updatedSince() {
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
      <span class="updated-since muted">{{ updatedSince() }}</span>
      <button
        type="button"
        class="btn-mini head-action"
        @click="$emit('refresh')"
        :title="refreshTitle"
      >
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
            <th>контур</th>
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
            <th>HTTP GC</th>
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
              <td>{{ row.contour || '—' }}</td>
              <td>{{ row.method }}</td>
              <td>{{ row.clientHttpStatus }}</td>
              <td>{{ row.errorCode || '—' }}</td>
            </template>
            <template v-else>
              <td>{{ row.upstreamKind }}</td>
              <td>{{ row.gcHttpStatus || '—' }}</td>
              <td>{{ row.semanticRule || '—' }}</td>
            </template>
            <td>{{ row.durationMs }}</td>
            <td>
              <button
                class="btn-mini"
                @click="$emit('open-raw', isRequests ? 'request' : 'upstream', row.id)"
                :title="isRequests ? 'Полное тело запроса' : 'Полное тело ответа GetCourse'"
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
