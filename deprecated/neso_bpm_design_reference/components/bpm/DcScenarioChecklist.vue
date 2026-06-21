<script setup lang="ts">
import type { ScenarioChecklistItem } from '../../shared/bpmScenarios'

defineProps<{
  title: string
  items: ScenarioChecklistItem[]
}>()
</script>

<template>
  <section class="dc-scenario-checklist">
    <h3>{{ title }}</h3>

    <ul>
      <li v-for="item in items" :key="item.id" :class="`state-${item.state}`">
        <span class="dc-scenario-checklist__dot" aria-hidden="true"></span>
        <span>{{ item.label }}</span>
        <strong>
          {{ item.state === 'done' ? 'Done' : item.state === 'active' ? 'In Progress' : 'Pending' }}
        </strong>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.dc-scenario-checklist {
  padding: 10px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-2) 82%, transparent);
}

.dc-scenario-checklist h3 {
  margin: 0;
  font-size: 0.84rem;
}

.dc-scenario-checklist ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.dc-scenario-checklist li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  padding: 8px;
  font-size: 0.72rem;
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.dc-scenario-checklist__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.dc-scenario-checklist li strong {
  font-size: 0.63rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dc-scenario-checklist li.state-done {
  border-color: color-mix(in srgb, var(--status-success) 42%, var(--border-soft));
}

.dc-scenario-checklist li.state-done .dc-scenario-checklist__dot,
.dc-scenario-checklist li.state-done strong {
  color: var(--status-success);
  background: var(--status-success);
}

.dc-scenario-checklist li.state-active {
  border-color: color-mix(in srgb, var(--status-warning) 42%, var(--border-soft));
}

.dc-scenario-checklist li.state-active .dc-scenario-checklist__dot,
.dc-scenario-checklist li.state-active strong {
  color: var(--status-warning);
  background: var(--status-warning);
}

.dc-scenario-checklist li.state-todo {
  border-color: color-mix(in srgb, var(--status-info) 42%, var(--border-soft));
}

.dc-scenario-checklist li.state-todo .dc-scenario-checklist__dot,
.dc-scenario-checklist li.state-todo strong {
  color: var(--status-info);
  background: var(--status-info);
}

@media (max-width: 980px) {
  .dc-scenario-checklist li {
    grid-template-columns: auto 1fr;
  }

  .dc-scenario-checklist li strong {
    grid-column: 1 / -1;
    padding-left: 16px;
  }
}
</style>
