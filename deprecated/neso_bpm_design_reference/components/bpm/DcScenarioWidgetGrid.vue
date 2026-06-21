<script setup lang="ts">
import type { ScenarioWidget } from '../../shared/bpmScenarios'

defineProps<{
  widgets: ScenarioWidget[]
}>()
</script>

<template>
  <section class="dc-scenario-widget-grid">
    <article
      v-for="widget in widgets"
      :key="widget.id"
      class="dc-scenario-widget"
      :class="`tone-${widget.tone}`"
    >
      <p>{{ widget.label }}</p>
      <strong>{{ widget.value }}</strong>
      <span>{{ widget.delta }}</span>
    </article>
  </section>
</template>

<style scoped>
.dc-scenario-widget-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dc-scenario-widget {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-xs);
}

.dc-scenario-widget p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.66rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

.dc-scenario-widget strong {
  display: block;
  margin-top: 7px;
  font-size: 1.08rem;
  line-height: 1.05;
}

.dc-scenario-widget span {
  display: inline-block;
  margin-top: 2px;
  font-size: 0.71rem;
}

.dc-scenario-widget.tone-success span {
  color: var(--status-success);
}

.dc-scenario-widget.tone-warning span {
  color: var(--status-warning);
}

.dc-scenario-widget.tone-danger span {
  color: var(--status-danger);
}

.dc-scenario-widget.tone-info span {
  color: var(--status-info);
}

@media (max-width: 1280px) {
  .dc-scenario-widget-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 740px) {
  .dc-scenario-widget-grid {
    grid-template-columns: 1fr;
  }
}
</style>
