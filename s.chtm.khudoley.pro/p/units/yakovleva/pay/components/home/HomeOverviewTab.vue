<template>
  <div>
    <section class="manager-summary" aria-label="Сводка для менеджера">
      <h2 class="summary-title">
        <span class="prompt">›</span> Сводка для менеджера
        <span class="summary-period">{{ periodLabel }}</span>
      </h2>
      <div class="kpi-grid">
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-file-invoice"></i></div>
          <div class="kpi-label">Сформировано заказов</div>
          <div class="kpi-value">{{ formatKpiNumber(analytics?.orders?.created) }}</div>
        </article>
        <article class="kpi-card kpi-hero kpi-success">
          <div class="kpi-icon"><i class="fas fa-circle-check"></i></div>
          <div class="kpi-label">Оплачено заказов</div>
          <div class="kpi-value">{{ formatKpiNumber(analytics?.orders?.paid) }}</div>
        </article>
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-ruble-sign"></i></div>
          <div class="kpi-label">Сумма заказов</div>
          <div class="kpi-value">{{ formatMoney(analytics?.orders?.createdSum) }}</div>
        </article>
        <article class="kpi-card kpi-hero kpi-success">
          <div class="kpi-icon"><i class="fas fa-coins"></i></div>
          <div class="kpi-label">Сумма оплат</div>
          <div class="kpi-value">{{ formatMoney(analytics?.orders?.paidSum) }}</div>
        </article>
      </div>
    </section>

    <section class="admin-summary" aria-label="Сводка для администратора">
      <h2 class="summary-title">
        <span class="prompt">›</span> Сводка для администратора
        <span class="summary-period">{{ periodLabel }}</span>
      </h2>
      <section class="kpi-grid" aria-label="Ключевые метрики">
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-paper-plane"></i></div>
          <div class="kpi-label">Запросов</div>
          <div class="kpi-value">{{ formatKpiNumber(analytics?.requests?.total) }}</div>
        </article>
        <article class="kpi-card kpi-hero kpi-success">
          <div class="kpi-icon"><i class="fas fa-circle-check"></i></div>
          <div class="kpi-label">Успешных</div>
          <div class="kpi-value">{{ formatKpiPercent(analytics?.requests?.okShare) }}</div>
        </article>
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-gauge-high"></i></div>
          <div class="kpi-label">p95 latency</div>
          <div class="kpi-value">
            {{ formatKpiNumber(analytics?.requests?.p95DurationMs) }}
            <span class="kpi-unit">мс</span>
          </div>
        </article>
        <article class="kpi-card kpi-hero">
          <div class="kpi-icon"><i class="fas fa-bell"></i></div>
          <div class="kpi-label">Webhook</div>
          <div class="kpi-value">{{ formatKpiNumber(analytics?.webhooks?.total) }}</div>
        </article>
      </section>

      <section class="kpi-grid kpi-grid-secondary" aria-label="Дополнительные метрики">
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-stopwatch"></i> avg latency</div>
          <div class="stat-value">
            {{ formatKpiNumber(analytics?.requests?.avgDurationMs) }}
            <span class="stat-unit">мс</span>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-bug"></i> Top errorCode</div>
          <div class="stat-value small">
            {{ analytics?.requests?.topErrorCode || '—' }}
            <span v-if="analytics?.requests?.topErrorCount" class="stat-unit">
              ({{ analytics.requests.topErrorCount }})
            </span>
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-shield-halved"></i> webhook success</div>
          <div class="stat-value">
            {{ formatKpiPercent(analytics?.webhooks?.successShare) }}
          </div>
        </article>
        <article class="stat-card">
          <div class="stat-label"><i class="fas fa-key"></i> tokenValid</div>
          <div class="stat-value">
            {{ formatKpiPercent(analytics?.webhooks?.tokenValidShare) }}
          </div>
        </article>
      </section>
    </section>

    <section class="feed-grid">
      <article class="panel-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Последние запросы</h2>
          <span class="updated-since muted">{{ updatedSinceTs(lastUpdated.requests) }}</span>
          <button type="button" class="btn-mini head-action" @click="$emit('set-tab', 'requests')">
            Все <i class="fas fa-arrow-right"></i>
          </button>
        </header>
        <div v-if="recentRequestsPreview.length > 0" class="table-wrapper">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Время</th>
                <th title="Гейтвей: lifepay / lavatop">GW</th>
                <th>op</th>
                <th>HTTP</th>
                <th>статус</th>
                <th>ms</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in recentRequestsPreview"
                :key="r.id"
                :class="rowClassRequest(r)"
                @click="onCopyRequestId(r)"
                :title="'requestId: ' + r.requestId"
              >
                <td>{{ formatTime(r.requestedAt) }}</td>
                <td>
                  <span class="gateway-badge" :class="'gateway-' + (r.gatewayId || 'unknown')">
                    {{ r.gatewayId || '—' }}
                  </span>
                </td>
                <td class="op-cell">
                  <code class="op-code">{{ r.op }}</code>
                </td>
                <td>{{ r.clientHttpStatus }}</td>
                <td :class="r.ok ? 'cell-ok' : 'cell-err'">
                  <span v-if="r.ok">✓ ok</span>
                  <span v-else>✗ {{ r.errorCode || 'err' }}</span>
                </td>
                <td>{{ r.durationMs }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <i class="fas fa-paper-plane empty-icon"></i>
          <p class="empty-title">Запросов пока нет</p>
          <p class="empty-hint">
            Отправьте тестовый запрос во вкладке
            <button class="link-button" @click="$emit('set-tab', 'createRequest')">
              «Создать запрос»
            </button>
          </p>
        </div>
      </article>

      <article class="panel-section">
        <header class="panel-section-head">
          <span class="prompt">›</span>
          <h2>Последние webhook</h2>
          <span class="updated-since muted">{{ updatedSinceTs(lastUpdated.webhooks) }}</span>
          <button type="button" class="btn-mini head-action" @click="$emit('set-tab', 'webhooks')">
            Все <i class="fas fa-arrow-right"></i>
          </button>
        </header>
        <div v-if="recentWebhooksPreview.length > 0" class="table-wrapper">
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Время</th>
                <th title="Гейтвей: lifepay / lavatop">GW</th>
                <th>orderNumber</th>
                <th>сумма</th>
                <th>type</th>
                <th>статус</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in recentWebhooksPreview" :key="w.id" :class="rowClassWebhook(w)">
                <td>{{ formatTime(w.processedAt) }}</td>
                <td>
                  <span class="gateway-badge" :class="'gateway-' + (w.gatewayId || 'unknown')">
                    {{ w.gatewayId || '—' }}
                  </span>
                </td>
                <td>{{ w.orderNumber }}</td>
                <td>{{ w.amount }}</td>
                <td>{{ w.type }}</td>
                <td :class="w.status === 'success' ? 'cell-ok' : 'cell-err'">
                  <span v-if="!w.tokenValid" class="cell-warn">токен ✗</span>
                  <span v-else>{{ w.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <i class="fas fa-inbox empty-icon"></i>
          <p class="empty-title">Webhook ещё не приходили</p>
          <p class="empty-hint">
            Гейтвеи присылают уведомления по callbackUrl после оплаты (LifePay) или после
            подтверждения статуса (Lava.Top).
          </p>
        </div>
      </article>
    </section>
  </div>
</template>

<script>
// Презентация вкладки «Обзор»: KPI-блоки (менеджер + админ) и два превью —
// последние запросы и webhook. Данные приходят пропсами, переход на другие
// вкладки — emit set-tab, копирование requestId — emit copy-text. CSS глобальный.
import {
  formatKpiNumber,
  formatKpiPercent,
  formatMoney,
  formatTime,
  rowClassRequest,
  rowClassWebhook,
  updatedSince
} from '../../shared/sbpHomeFormat'

export default {
  name: 'HomeOverviewTab',
  props: {
    analytics: { type: Object, default: null },
    periodLabel: { type: String, default: '' },
    recentRequestsPreview: { type: Array, default: () => [] },
    recentWebhooksPreview: { type: Array, default: () => [] },
    lastUpdated: { type: Object, required: true },
    now: { type: Number, default: 0 }
  },
  emits: ['set-tab', 'copy-text'],
  methods: {
    formatKpiNumber,
    formatKpiPercent,
    formatMoney,
    formatTime,
    rowClassRequest,
    rowClassWebhook,
    updatedSinceTs(ts) {
      return updatedSince(this.now, ts)
    },
    onCopyRequestId(r) {
      if (r && r.requestId) this.$emit('copy-text', r.requestId)
    }
  }
}
</script>
