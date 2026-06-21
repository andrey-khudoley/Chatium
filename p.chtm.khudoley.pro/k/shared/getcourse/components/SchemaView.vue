<template>
  <div class="schema-view">
    <template v-if="!schema">
      <span class="schema-muted">Нет схемы</span>
    </template>

    <template v-else-if="depth > maxDepth">
      <span class="schema-muted">…вложенный объект</span>
    </template>

    <template v-else-if="schema.oneOfLabel">
      <div class="schema-one-of">{{ schema.oneOfLabel }}</div>
      <SchemaView
        v-if="schema.properties && Object.keys(schema.properties).length"
        :schema="{ ...schema, oneOfLabel: undefined }"
        :schemas="schemas"
        :depth="depth"
        :max-depth="maxDepth"
      />
    </template>

    <template v-else-if="schema.type === 'object' && schema.properties && Object.keys(schema.properties).length">
      <div class="schema-table-wrap">
        <table class="schema-table">
          <thead>
            <tr>
              <th>Поле</th>
              <th>Тип</th>
              <th>Описание</th>
              <th>Пример</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(prop, key) in schema.properties"
              :key="key"
            >
              <td data-label="Поле" class="schema-cell schema-cell--name">
                <span class="schema-name">{{ prop.name }}</span>
                <span v-if="schema.required && schema.required.includes(prop.name)" class="schema-flag schema-flag--required">
                  required
                </span>
                <span v-if="prop.nullable" class="schema-flag">nullable</span>
              </td>
              <td data-label="Тип" class="schema-cell schema-cell--type">{{ prop.type }}</td>
              <td data-label="Описание" class="schema-cell schema-cell--description">{{ prop.description || '—' }}</td>
              <td data-label="Пример" class="schema-cell schema-cell--example">{{ formatExample(prop.example) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="schema.type === 'array' && schema.items">
      <div class="schema-array-label">Массив:</div>
      <SchemaView
        :schema="schema.items"
        :schemas="schemas"
        :depth="depth + 1"
        :max-depth="maxDepth"
      />
    </template>

    <template v-else>
      <div class="schema-scalar">
        <span class="schema-type">{{ schema.type }}</span>
        <span v-if="schema.description" class="schema-description">{{ schema.description }}</span>
        <span v-if="schema.example != null" class="schema-example">{{ formatExample(schema.example) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SchemaObject } from '../lib/openapi.lib'

withDefaults(
  defineProps<{
    schema: SchemaObject | null
    schemas: Record<string, SchemaObject>
    depth?: number
    maxDepth?: number
  }>(),
  { depth: 0, maxDepth: 3 }
)

function formatExample(val: unknown): string {
  if (val == null) return '—'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
</script>

<style scoped>
.schema-view {
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.schema-muted {
  color: #7285a3;
}

.schema-one-of {
  margin-bottom: 0.35rem;
  color: #5e7293;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.schema-table-wrap {
  overflow-x: auto;
}

.schema-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.schema-table th,
.schema-table td {
  border-bottom: 1px solid var(--color-border-soft);
  text-align: left;
  padding: 0.42rem 0.45rem;
  vertical-align: top;
}

.schema-table th {
  color: #4b607f;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.schema-table tbody tr:nth-child(even) {
  background: #f8fbff;
}

.schema-table tbody tr:last-child td {
  border-bottom: none;
}

.schema-cell--name {
  color: var(--color-text);
}

.schema-name {
  font-family: var(--font-mono);
}

.schema-flag {
  display: inline-flex;
  align-items: center;
  margin-left: 0.4rem;
  border-radius: 999px;
  padding: 0.04rem 0.33rem;
  background: #edf2fa;
  color: #6e7f99;
  font-size: 0.62rem;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.schema-flag--required {
  background: #ffe9e9;
  color: #bc3939;
}

.schema-cell--type {
  color: #0d5fc0;
  font-family: var(--font-mono);
}

.schema-cell--description {
  color: var(--color-text-secondary);
}

.schema-cell--example {
  color: #6f7f95;
  font-family: var(--font-mono);
  font-size: 0.76rem;
}

.schema-array-label {
  margin-bottom: 0.35rem;
  color: var(--color-text-secondary);
}

.schema-scalar {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.schema-type {
  color: #0d5fc0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
}

.schema-description {
  color: var(--color-text-secondary);
}

.schema-example {
  font-family: var(--font-mono);
  color: #6f7f95;
  font-size: 0.76rem;
}

@media (max-width: 760px) {
  .schema-table thead {
    display: none;
  }

  .schema-table,
  .schema-table tbody,
  .schema-table tr,
  .schema-table td {
    display: block;
    width: 100%;
  }

  .schema-table tr {
    border: 1px solid var(--color-border-soft);
    border-radius: 0.72rem;
    padding: 0.45rem 0.55rem;
    margin-bottom: 0.45rem;
    background: #ffffff;
  }

  .schema-table tr:last-child {
    margin-bottom: 0;
  }

  .schema-table td {
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.28rem 0;
    text-align: right;
  }

  .schema-table td::before {
    content: attr(data-label);
    color: #5a7192;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.66rem;
    font-weight: 700;
    text-align: left;
  }
}
</style>
