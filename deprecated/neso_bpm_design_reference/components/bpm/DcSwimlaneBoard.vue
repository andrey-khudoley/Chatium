<script setup lang="ts">
import type { SwimlaneItem, SwimlaneLane } from '../../shared/bpmVueExportedTypes'

defineProps<{
  title: string
  subtitle?: string
  lanes: SwimlaneLane[]
}>()
</script>

<template>
  <section class="dc-swimlane-board">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-swimlane-board__grid">
      <article
        v-for="lane in lanes"
        :key="lane.id"
        class="dc-swimlane-board__lane"
        :class="`tone-${lane.tone}`"
      >
        <div class="dc-swimlane-board__lane-head">
          <h4>{{ lane.title }}</h4>
          <span>{{ lane.items.length }}</span>
        </div>

        <div class="dc-swimlane-board__items">
          <article v-for="item in lane.items" :key="item.id" class="dc-swimlane-board__item">
            <p class="mono">{{ item.id }}</p>
            <strong>{{ item.title }}</strong>
            <div class="dc-swimlane-board__meta">
              <span>{{ item.owner }}</span>
              <span>{{ item.eta }}</span>
            </div>
            <em>{{ item.tag }}</em>
          </article>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.dc-swimlane-board {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 82%, transparent);
  display: grid;
  gap: 10px;
}

.dc-swimlane-board header h3 {
  margin: 0;
  font-size: 0.88rem;
}

.dc-swimlane-board header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-swimlane-board__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.dc-swimlane-board__lane {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  padding: 8px;
  display: grid;
  gap: 7px;
  background: color-mix(in srgb, var(--surface-2) 86%, transparent);
}

.dc-swimlane-board__lane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dc-swimlane-board__lane-head h4 {
  margin: 0;
  font-size: 0.74rem;
}

.dc-swimlane-board__lane-head span {
  font-size: 0.68rem;
  color: var(--text-tertiary);
}

.dc-swimlane-board__items {
  display: grid;
  gap: 6px;
}

.dc-swimlane-board__item {
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--border-soft) 78%, transparent);
  padding: 7px;
  display: grid;
  gap: 3px;
  background: color-mix(in srgb, var(--surface-3) 86%, transparent);
}

.dc-swimlane-board__item p {
  margin: 0;
  font-size: 0.63rem;
  color: var(--text-tertiary);
}

.dc-swimlane-board__item strong {
  font-size: 0.73rem;
}

.dc-swimlane-board__meta {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.dc-swimlane-board__meta span {
  font-size: 0.66rem;
  color: var(--text-secondary);
}

.dc-swimlane-board__item em {
  font-style: normal;
  font-size: 0.63rem;
  color: var(--text-tertiary);
}

.dc-swimlane-board__lane.tone-info {
  border-color: color-mix(in srgb, var(--status-info) 42%, var(--border-soft));
}

.dc-swimlane-board__lane.tone-warning {
  border-color: color-mix(in srgb, var(--status-warning) 42%, var(--border-soft));
}

.dc-swimlane-board__lane.tone-danger {
  border-color: color-mix(in srgb, var(--status-danger) 42%, var(--border-soft));
}

.dc-swimlane-board__lane.tone-success {
  border-color: color-mix(in srgb, var(--status-success) 42%, var(--border-soft));
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 1280px) {
  .dc-swimlane-board__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dc-swimlane-board__grid {
    grid-template-columns: 1fr;
  }
}
</style>
