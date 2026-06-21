<script setup lang="ts">
import type { BpmKanbanColumn } from '../../shared/bpmTypes'
import DcBpmPanel from './DcBpmPanel.vue'

defineProps<{
  title: string
  hint: string
  columns: BpmKanbanColumn[]
}>()
</script>

<template>
  <DcBpmPanel :title="title" :hint="hint">
    <div class="dc-bpm-kanban-board">
      <article
        v-for="column in columns"
        :key="column.id"
        class="dc-bpm-kanban-column"
        :class="`tone-${column.tone}`"
      >
        <header class="dc-bpm-kanban-column__head">
          <h3>{{ column.title }}</h3>
          <span>{{ column.cards.length }}</span>
        </header>

        <div class="dc-bpm-kanban-column__cards">
          <article v-for="card in column.cards" :key="card.id" class="dc-bpm-kanban-card">
            <p class="dc-bpm-kanban-card__id mono">{{ card.id }}</p>
            <h4>{{ card.title }}</h4>
            <p>{{ card.owner }}</p>
            <span class="dc-bpm-kanban-card__sla mono">SLA {{ card.sla }}</span>
          </article>
        </div>
      </article>
    </div>
  </DcBpmPanel>
</template>

<style scoped>
.dc-bpm-kanban-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.dc-bpm-kanban-column {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  padding: 8px;
  background: color-mix(in srgb, var(--surface-2) 76%, transparent);
}

.dc-bpm-kanban-column.tone-backlog {
  background: linear-gradient(
    180deg,
    var(--kanban-backlog),
    color-mix(in srgb, var(--surface-2) 88%, transparent)
  );
}

.dc-bpm-kanban-column.tone-active {
  background: linear-gradient(
    180deg,
    var(--kanban-active),
    color-mix(in srgb, var(--surface-2) 88%, transparent)
  );
}

.dc-bpm-kanban-column.tone-review {
  background: linear-gradient(
    180deg,
    var(--kanban-review),
    color-mix(in srgb, var(--surface-2) 88%, transparent)
  );
}

.dc-bpm-kanban-column.tone-done {
  background: linear-gradient(
    180deg,
    var(--kanban-done),
    color-mix(in srgb, var(--surface-2) 88%, transparent)
  );
}

.dc-bpm-kanban-column__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dc-bpm-kanban-column__head h3 {
  margin: 0;
  font-size: 0.78rem;
}

.dc-bpm-kanban-column__head span {
  font-size: 0.68rem;
  color: var(--text-tertiary);
}

.dc-bpm-kanban-column__cards {
  display: grid;
  gap: 6px;
}

.dc-bpm-kanban-card {
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.dc-bpm-kanban-card__id {
  margin: 0 0 3px;
  font-size: 0.65rem;
  color: var(--text-tertiary);
}

.dc-bpm-kanban-card h4 {
  margin: 0;
  font-size: 0.76rem;
}

.dc-bpm-kanban-card p {
  margin: 3px 0 5px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.dc-bpm-kanban-card__sla {
  font-size: 0.65rem;
  color: var(--text-tertiary);
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 1400px) {
  .dc-bpm-kanban-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .dc-bpm-kanban-board {
    grid-template-columns: 1fr;
  }
}
</style>
