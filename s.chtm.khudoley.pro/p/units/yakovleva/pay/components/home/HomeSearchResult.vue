<template>
  <section class="panel-section search-result-section">
    <header class="panel-section-head">
      <span class="prompt">›</span>
      <h2>Результат поиска</h2>
      <code v-if="searchedQuery" class="search-query">{{ searchedQuery }}</code>
      <button type="button" class="btn-mini head-action" @click="$emit('close')" title="Закрыть">
        <i class="fas fa-xmark"></i> Закрыть
      </button>
    </header>
    <div v-if="result.request">
      <div class="table-wrapper">
        <table class="data-table data-table-vertical">
          <tbody>
            <tr>
              <th>gateway</th>
              <td>
                <span
                  class="gateway-badge"
                  :class="'gateway-' + (result.request.gatewayId || 'unknown')"
                >
                  {{ result.request.gatewayId || '— (legacy)' }}
                </span>
              </td>
            </tr>
            <tr>
              <th>requestId</th>
              <td>
                <code>{{ result.request.requestId }}</code>
              </td>
            </tr>
            <tr>
              <th>op</th>
              <td>{{ result.request.op }}</td>
            </tr>
            <tr>
              <th>orderNumber</th>
              <td>{{ result.request.orderNumber }}</td>
            </tr>
            <tr>
              <th>correlationId</th>
              <td>
                <code>{{ result.request.correlationId || '—' }}</code>
              </td>
            </tr>
            <tr>
              <th>HTTP</th>
              <td>{{ result.request.clientHttpStatus }}</td>
            </tr>
            <tr>
              <th>ok</th>
              <td :class="result.request.ok ? 'cell-ok' : 'cell-err'">
                {{ result.request.ok ? '✓ успех' : '✗ ошибка' }}
              </td>
            </tr>
            <tr>
              <th>errorCode</th>
              <td>{{ result.request.errorCode || '—' }}</td>
            </tr>
            <tr>
              <th>lpHttpStatus</th>
              <td>{{ result.request.lpHttpStatus || '—' }}</td>
            </tr>
            <tr>
              <th>lpSemanticRule</th>
              <td>{{ result.request.lpSemanticRule || '—' }}</td>
            </tr>
            <tr>
              <th>argsRedacted</th>
              <td>
                <pre class="json-block">{{
                  JSON.stringify(result.request.argsRedacted, null, 2)
                }}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 class="search-h3">Связанные webhook (по orderNumber / correlationId)</h3>
      <div v-if="result.webhooks.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Время</th>
              <th title="Гейтвей: lifepay / lavatop">GW</th>
              <th>number</th>
              <th>type</th>
              <th>status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in result.webhooks" :key="w.id" :class="rowClassWebhook(w)">
              <td>{{ formatTime(w.processedAt) }}</td>
              <td>
                <span class="gateway-badge" :class="'gateway-' + (w.gatewayId || 'unknown')">
                  {{ w.gatewayId || '—' }}
                </span>
              </td>
              <td>{{ w.number }}</td>
              <td>{{ w.type }}</td>
              <td>{{ w.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted"><i class="fas fa-circle-info"></i> Связанных webhook нет.</p>
    </div>
    <p v-else class="muted">
      <i class="fas fa-circle-exclamation"></i> По указанному requestId записей не найдено.
    </p>
  </section>
</template>

<script>
// Презентация панели «Результат поиска» по requestId. Данные приходят пропом result
// (как searchResult в orchestrator'е); закрытие — через emit close. CSS глобальный.
import { formatTime, rowClassWebhook } from '../../shared/sbpHomeFormat'

export default {
  name: 'HomeSearchResult',
  props: {
    result: { type: Object, required: true },
    searchedQuery: { type: String, default: '' }
  },
  emits: ['close'],
  methods: {
    formatTime,
    rowClassWebhook
  }
}
</script>
