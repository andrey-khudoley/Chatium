<script setup lang="ts">
import type { DecisionNode } from '../../shared/bpmVueExportedTypes'

defineProps<{
  title: string
  subtitle?: string
  nodes: DecisionNode[]
}>()
</script>

<template>
  <section class="dc-decision-tree">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <ol>
      <li v-for="node in nodes" :key="node.id" :class="`severity-${node.severity}`">
        <div class="dc-decision-tree__node-id mono">{{ node.id }}</div>
        <div class="dc-decision-tree__body">
          <p class="dc-decision-tree__condition">{{ node.condition }}</p>
          <p class="dc-decision-tree__action">{{ node.action }}</p>
          <span>{{ node.owner }}</span>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.dc-decision-tree {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-2) 84%, transparent);
}

.dc-decision-tree header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-decision-tree header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-decision-tree ol {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 7px;
}

.dc-decision-tree li {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  padding: 7px;
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 8px;
  position: relative;
  background: color-mix(in srgb, var(--surface-3) 86%, transparent);
}

.dc-decision-tree li::before {
  content: '';
  position: absolute;
  left: 37px;
  top: -8px;
  bottom: -8px;
  width: 1px;
  background: color-mix(in srgb, var(--border-soft) 72%, transparent);
}

.dc-decision-tree li:first-child::before {
  top: 12px;
}

.dc-decision-tree li:last-child::before {
  bottom: 12px;
}

.dc-decision-tree__node-id {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  font-size: 0.64rem;
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--surface-2) 82%, transparent);
}

.dc-decision-tree__body {
  display: grid;
  gap: 3px;
}

.dc-decision-tree__condition {
  margin: 0;
  font-size: 0.71rem;
}

.dc-decision-tree__action {
  margin: 0;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.dc-decision-tree__body span {
  font-size: 0.64rem;
  color: var(--text-tertiary);
}

.dc-decision-tree li.severity-medium {
  border-color: color-mix(in srgb, var(--status-info) 44%, var(--border-soft));
}

.dc-decision-tree li.severity-high {
  border-color: color-mix(in srgb, var(--status-warning) 44%, var(--border-soft));
}

.dc-decision-tree li.severity-critical {
  border-color: color-mix(in srgb, var(--status-danger) 48%, var(--border-soft));
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 760px) {
  .dc-decision-tree li {
    grid-template-columns: 1fr;
  }

  .dc-decision-tree li::before {
    display: none;
  }
}
</style>
