<script setup lang="ts">
import type { MilestoneItem } from '../../shared/bpmVueExportedTypes'

defineProps<{
  title: string
  subtitle?: string
  milestones: MilestoneItem[]
}>()
</script>

<template>
  <section class="dc-milestone-rail">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-milestone-rail__track">
      <article
        v-for="item in milestones"
        :key="item.id"
        class="dc-milestone-rail__item"
        :class="`state-${item.state}`"
      >
        <p class="mono">{{ item.id }}</p>
        <strong>{{ item.title }}</strong>
        <span>{{ item.date }}</span>
        <em>{{ item.owner }}</em>
      </article>
    </div>
  </section>
</template>

<style scoped>
.dc-milestone-rail {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 84%, transparent);
  display: grid;
  gap: 10px;
}

.dc-milestone-rail header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-milestone-rail header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-milestone-rail__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(190px, 1fr);
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.dc-milestone-rail__item {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  padding: 8px;
  display: grid;
  gap: 4px;
  min-height: 112px;
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
}

.dc-milestone-rail__item p {
  margin: 0;
  font-size: 0.63rem;
  color: var(--text-tertiary);
}

.dc-milestone-rail__item strong {
  font-size: 0.73rem;
  line-height: 1.32;
}

.dc-milestone-rail__item span {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.dc-milestone-rail__item em {
  margin-top: auto;
  font-style: normal;
  font-size: 0.64rem;
  color: var(--text-tertiary);
}

.dc-milestone-rail__item.state-active {
  border-color: color-mix(in srgb, var(--status-info) 44%, var(--border-soft));
}

.dc-milestone-rail__item.state-done {
  border-color: color-mix(in srgb, var(--status-success) 44%, var(--border-soft));
}

.dc-milestone-rail__item.state-risk {
  border-color: color-mix(in srgb, var(--status-danger) 48%, var(--border-soft));
}

.dc-milestone-rail__item.state-next {
  border-color: color-mix(in srgb, var(--status-warning) 44%, var(--border-soft));
}

.mono {
  font-family: var(--font-mono);
}
</style>
