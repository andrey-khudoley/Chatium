<script>
// Презентация вкладки «Обзор» домашней панели (KPI + превью последних запросов/вызовов).
// Данные приходят из HomePage через пропсы; переход на другие вкладки — через emit set-tab.
// CSS глобальный (классы .kpi-*, .panel-section, .data-table — инжектятся на главной странице).
import {
  formatKpi,
  formatPercent,
  formatTime,
  updatedSince,
  isRequestOk,
  isUpstreamOk,
  rowClassRequest,
  rowClassUpstream
} from '../../shared/gcHomeFormat'

export default {
  name: 'HomeOverviewTab',
  props: {
    counts: { type: Object, required: true },
    periodLabel: { type: String, default: '' },
    recentRequestsPreview: { type: Array, default: () => [] },
    recentUpstreamPreview: { type: Array, default: () => [] },
    lastUpdated: { type: Object, required: true },
    now: { type: Number, default: 0 },
    hasFilter: { type: Boolean, default: false }
  },
  emits: ['set-tab'],
  methods: {
    formatKpi,
    formatPercent,
    formatTime,
    isRequestOk,
    isUpstreamOk,
    rowClassRequest,
    rowClassUpstream,
    updatedSince(ts) {
      return updatedSince(this.now, ts)
    }
  }
}
</script>

<template>
  <div>
    <section class="admin-summary" aria-label="Сводка для администратора">
      <h2 class="summary-title">
        <span class="prompt">›</span> Сводка для администратора
        <span class="summary-period">{{ periodLabel }}</span>
      </h2>
      <section class="kpi-grid" aria-label="Ключевые метрики">
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-paper-plane"></i></div>
          <div class="kpi-label">Запросов</div>
          <div class="kpi-value">{{ formatKpi(counts.totalRequests) }}</div>
        </article>
        <article class="kpi-card kpi-hero kpi-success">
          <div class="kpi-icon"><i class="fas fa-circle-check"></i></div>
          <div class="kpi-label">Успешных</div>
          <div class="kpi-value">{{ formatPercent(counts.okShare) }}</div>
        </article>
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-gauge-high"></i></div>
          <div class="kpi-label">p95 latency</div>
          <div class="kpi-value">
            {{ formatKpi(counts.p95DurationMs) }} <span class="kpi-unit">мс</span>
          </div>
        </article>
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-tower-broadcast"></i></div>
          <div class="kpi-label">Вызовов к GetCourse</div>
          <div class="kpi-value">{{ formatKpi(counts.upstreamTotal) }}</div>
        </article>
      </section>

      <section class="kpi-grid kpi-grid-secondary" aria-label="Дополнительные метрики">
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-stopwatch"></i> avg latency</div>
          <div class="stat-value">
            {{ formatKpi(counts.avgDurationMs) }} <span class="stat-unit">мс</span>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-bug"></i> Top errorCode</div>
          <div class="stat-value small">
            {{ counts.topErrorCode || '—' }}
            <span v-if="counts.topErrorCount" class="stat-unit">({{ counts.topErrorCount }})</span>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-shield-halved"></i> upstream success</div>
          <div class="stat-value">{{ formatPercent(counts.upstreamOkShare) }}</div>
        </article>
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-circle-xmark"></i> Ошибок ответа</div>
          <div class="stat-value">{{ formatKpi(counts.totalErrors) }}</div>
        </article>
      </section>
    </section>

    <section class="feed-grid">
      <article class="panel-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Последние входящие запросы</h2>
          <span class="updated-since muted">{{ updatedSince(lastUpdated.requests) }}</span>
          <button type="button" class="btn-mini head-action" @click="$emit('set-tab', 'requests')">
            Все <i class="fas fa-arrow-right"></i>
          </button>
        </header>
        <div v-if="recentRequestsPreview.length > 0" class="table-wrapper">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>op</th>
                <th>HTTP</th>
                <th>статус</th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in recentRequestsPreview" :key="r.id" :class="rowClassRequest(r)">
                <td>{{ formatTime(r.requestedAt) }}</td>
                <td>{{ r.op }}</td>
                <td>{{ r.clientHttpStatus }}</td>
                <td :class="isRequestOk(r) ? 'cell-ok' : 'cell-err'">
                  <span v-if="isRequestOk(r)">✓ ok</span>
                  <span v-else>✗ {{ r.errorCode || 'err' }}</span>
                </td>
                <td>{{ r.durationMs }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <i class="fas fa-inbox empty-icon"></i>
          <p class="empty-title">
            {{ hasFilter ? 'За выбранный период записей нет' : 'Запросов пока нет' }}
          </p>
          <p class="empty-hint">Сюда попадут все обращения клиентов к /v1/&#123;op&#125;.</p>
        </div>
      </article>

      <article class="panel-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Последние вызовы к GetCourse</h2>
          <span class="updated-since muted">{{ updatedSince(lastUpdated.upstream) }}</span>
          <button type="button" class="btn-mini head-action" @click="$emit('set-tab', 'upstream')">
            Все <i class="fas fa-arrow-right"></i>
          </button>
        </header>
        <div v-if="recentUpstreamPreview.length > 0" class="table-wrapper">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>op</th>
                <th>kind</th>
                <th>HTTP</th>
                <th>статус</th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in recentUpstreamPreview" :key="u.id" :class="rowClassUpstream(u)">
                <td>{{ formatTime(u.sentAt) }}</td>
                <td>{{ u.op }}</td>
                <td>{{ u.upstreamKind }}</td>
                <td>{{ u.gcHttpStatus || '—' }}</td>
                <td :class="isUpstreamOk(u) ? 'cell-ok' : 'cell-err'">
                  {{ isUpstreamOk(u) ? '✓ ok' : '✗ err' }}
                </td>
                <td>{{ u.durationMs }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <i class="fas fa-tower-broadcast empty-icon"></i>
          <p class="empty-title">
            {{ hasFilter ? 'За выбранный период вызовов нет' : 'Вызовов GetCourse пока нет' }}
          </p>
          <p class="empty-hint">Сюда попадут все исходящие запросы к GetCourse.</p>
        </div>
      </article>
    </section>
  </div>
</template>
