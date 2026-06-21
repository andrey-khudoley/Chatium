<template>
  <article
    class="api-operation"
    :class="{ 'api-operation--expanded': isExpanded }"
    @click="emit('toggle')"
  >
    <header class="api-operation__header">
      <span
        class="method-badge"
        :class="methodBadgeClass"
      >
        {{ operation.method }}
      </span>
      <code class="api-operation__path">{{ operation.path }}</code>
      <p class="api-operation__summary">{{ operation.summary || 'Без краткого описания' }}</p>
      <i class="fas fa-chevron-down api-operation__chevron" :class="{ 'is-rotated': isExpanded }"></i>
    </header>

    <div v-show="isExpanded" class="api-operation__details" @click.stop>
      <p v-if="operation.description" class="operation-description">{{ operation.description }}</p>

      <section v-if="operation.parameters.length" class="operation-block">
        <h4 class="operation-block__title">Параметры</h4>
        <div class="table-wrapper">
          <table class="params-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Где</th>
                <th>Тип</th>
                <th>Обязательный</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in operation.parameters" :key="p.name">
                <td data-label="Имя" class="params-cell params-cell--name">{{ p.name }}</td>
                <td data-label="Где" class="params-cell">{{ p.in }}</td>
                <td data-label="Тип" class="params-cell params-cell--type">{{ p.schema?.type ?? '—' }}</td>
                <td data-label="Обязательный" class="params-cell">{{ p.required ? 'да' : '—' }}</td>
                <td data-label="Описание" class="params-cell params-cell--description">{{ p.description || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="operation.requestBody" class="operation-block">
        <h4 class="operation-block__title">Тело запроса</h4>
        <SchemaView :schema="operation.requestBody" :schemas="schemas" />
      </section>

      <section v-if="operation.responses.length" class="operation-block">
        <h4 class="operation-block__title">Ответы</h4>
        <div class="responses-list">
          <article v-for="r in operation.responses" :key="r.statusCode" class="response-card">
            <div class="response-card__head">
              <span class="status-badge" :class="responseBadgeClass(r.statusCode)">
                {{ r.statusCode }}
              </span>
              <span class="response-card__text">{{ r.description || 'Без описания' }}</span>
            </div>
            <SchemaView v-if="r.schema" :schema="r.schema" :schemas="schemas" class="response-schema" />
          </article>
        </div>
      </section>

      <section v-if="operation.security" class="operation-security">
        <strong>Авторизация:</strong> {{ operation.security }}
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SchemaView from './SchemaView.vue'
import type { ApiOperation as ApiOperationType, SchemaObject } from '../lib/openapi.lib'

const props = defineProps<{
  operation: ApiOperationType
  isExpanded: boolean
  schemas: Record<string, SchemaObject>
}>()
const emit = defineEmits<{ toggle: [] }>()

const methodBadgeClass = computed(() => {
  const method = props.operation?.method ?? 'GET'
  const map: Record<string, string> = {
    GET: 'method-badge--get',
    POST: 'method-badge--post',
    PUT: 'method-badge--put',
    DELETE: 'method-badge--delete',
    PATCH: 'method-badge--patch'
  }
  return map[method] ?? 'method-badge--patch'
})

function responseBadgeClass(statusCode: string): string {
  if (/^2/.test(statusCode)) return 'status-badge--success'
  if (/^3/.test(statusCode)) return 'status-badge--redirect'
  if (/^4/.test(statusCode)) return 'status-badge--warn'
  if (/^5/.test(statusCode)) return 'status-badge--error'
  return 'status-badge--neutral'
}
</script>

<style scoped>
.api-operation {
  border: 1px solid var(--color-border-soft);
  border-radius: 1rem;
  background: var(--color-surface-strong);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.api-operation:hover {
  cursor: pointer;
  border-color: #c4d5ec;
  box-shadow: 0 16px 30px -26px rgba(17, 46, 89, 0.82);
}

.api-operation--expanded {
  border-color: #b7cdea;
  box-shadow: 0 20px 34px -28px rgba(17, 46, 89, 0.85);
}

.api-operation__header {
  display: grid;
  grid-template-columns: auto minmax(230px, 1.5fr) minmax(220px, 2fr) auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.78rem 0.88rem;
}

.method-badge {
  border-radius: 999px;
  padding: 0.22rem 0.56rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: fit-content;
}

.method-badge--get {
  background: #daf5e8;
  color: #0d7b47;
}

.method-badge--post {
  background: #dfeeff;
  color: #0f5fb5;
}

.method-badge--put {
  background: #fff1d6;
  color: #b36700;
}

.method-badge--delete {
  background: #ffe2e2;
  color: #b12828;
}

.method-badge--patch {
  background: #ecf0f7;
  color: #4f5d73;
}

.api-operation__path {
  margin: 0;
  font-size: 0.83rem;
  color: #0e4578;
  word-break: break-word;
}

.api-operation__summary {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.api-operation__chevron {
  color: #7d8fa9;
  font-size: 0.74rem;
  transition: transform 0.2s ease;
}

.api-operation__chevron.is-rotated {
  transform: rotate(180deg);
}

.api-operation__details {
  border-top: 1px solid var(--color-border-soft);
  padding: 0.8rem 0.88rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.operation-description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.operation-block {
  border: 1px solid var(--color-border-soft);
  border-radius: 0.85rem;
  background: #fafcff;
  padding: 0.72rem;
}

.operation-block__title {
  margin: 0 0 0.45rem;
  color: var(--color-text);
  font-size: 0.86rem;
  font-weight: 800;
}

.table-wrapper {
  overflow-x: auto;
}

.params-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.params-table th,
.params-table td {
  text-align: left;
  border-bottom: 1px solid var(--color-border-soft);
  padding: 0.42rem 0.45rem;
  vertical-align: top;
}

.params-table th {
  color: #4a5f7c;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.params-table tbody tr:last-child td {
  border-bottom: none;
}

.params-cell--name {
  font-family: var(--font-mono);
  color: #17375b;
}

.params-cell--type {
  font-family: var(--font-mono);
  color: #0d5fc0;
}

.params-cell--description {
  color: var(--color-text-secondary);
}

.responses-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.response-card {
  border: 1px solid var(--color-border-soft);
  border-radius: 0.8rem;
  background: #ffffff;
  padding: 0.55rem 0.62rem;
}

.response-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.response-card__text {
  color: var(--color-text-secondary);
  font-size: 0.86rem;
}

.response-schema {
  margin-top: 0.45rem;
}

.status-badge {
  border-radius: 999px;
  padding: 0.16rem 0.45rem;
  font-size: 0.72rem;
  font-family: var(--font-mono);
  font-weight: 700;
}

.status-badge--success {
  background: #daf5e8;
  color: #0d7b47;
}

.status-badge--redirect {
  background: #e9e7ff;
  color: #4f40c2;
}

.status-badge--warn {
  background: #fff4d9;
  color: #af6a00;
}

.status-badge--error {
  background: #ffe4e4;
  color: #b33a3a;
}

.status-badge--neutral {
  background: #ecf0f7;
  color: #4f5d73;
}

.operation-security {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.operation-security strong {
  color: var(--color-text);
}

@media (max-width: 980px) {
  .api-operation__header {
    grid-template-columns: auto 1fr auto;
  }

  .api-operation__summary {
    grid-column: 1 / -1;
    font-size: 0.86rem;
    margin-top: -0.1rem;
  }
}

@media (max-width: 760px) {
  .params-table thead {
    display: none;
  }

  .params-table,
  .params-table tbody,
  .params-table tr,
  .params-table td {
    display: block;
    width: 100%;
  }

  .params-table tr {
    border: 1px solid var(--color-border-soft);
    border-radius: 0.7rem;
    margin-bottom: 0.45rem;
    padding: 0.5rem 0.55rem;
    background: #ffffff;
  }

  .params-table tr:last-child {
    margin-bottom: 0;
  }

  .params-table td {
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.28rem 0;
    text-align: right;
  }

  .params-table td::before {
    content: attr(data-label);
    color: #5a7192;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.68rem;
    font-weight: 700;
    text-align: left;
  }
}

@media (max-width: 620px) {
  .api-operation {
    border-radius: 0.8rem;
  }

  .api-operation__header {
    grid-template-columns: auto 1fr auto;
    gap: 0.5rem;
    padding: 0.66rem 0.7rem;
  }

  .api-operation__path {
    font-size: 0.78rem;
  }

  .api-operation__details {
    padding: 0.7rem;
  }

  .operation-block {
    padding: 0.58rem;
  }
}
</style>
