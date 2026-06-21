<template>
  <section class="api-section">
    <header class="api-section__header">
      <h2
        :id="'group-' + tag"
        class="api-section__title"
      >
        <i class="fas fa-folder-open" aria-hidden="true"></i>
        <span>{{ tag }}</span>
      </h2>
      <span class="api-section__count">{{ operations.length }} операций</span>
    </header>

    <div class="api-section__operations">
      <ApiOperation
        v-for="op in operations"
        :key="op.method + ':' + op.path"
        :operation="op"
        :is-expanded="expandedOperations.has(op.method + ':' + op.path)"
        :schemas="schemas"
        @toggle="$emit('toggle-operation', op.method + ':' + op.path)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import ApiOperation from './ApiOperation.vue'
import type { ApiOperation as ApiOperationType, SchemaObject } from '../lib/openapi.lib'

defineProps<{
  tag: string
  operations: ApiOperationType[]
  expandedOperations: Set<string>
  schemas: Record<string, SchemaObject>
}>()
defineEmits<{ 'toggle-operation': [key: string] }>()
</script>

<style scoped>
.api-section {
  border-radius: 1.25rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(3px);
  padding: clamp(0.8rem, 1.8vw, 1.2rem);
}

.api-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-border-soft);
  padding-bottom: 0.65rem;
  margin-bottom: 0.7rem;
}

.api-section__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1rem, 2.2vw, 1.2rem);
  font-weight: 800;
}

.api-section__title i {
  color: var(--color-accent);
  font-size: 0.9rem;
}

.api-section__count {
  border-radius: 999px;
  border: 1px solid #cfe1f4;
  background: #edf5ff;
  color: #254261;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  white-space: nowrap;
}

.api-section__operations {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

@media (max-width: 620px) {
  .api-section {
    border-radius: 1rem;
    padding: 0.7rem;
  }

  .api-section__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.45rem;
  }
}
</style>
