<script setup lang="ts">
import type { CommandAction } from '../../shared/bpmVueExportedTypes'

defineProps<{
  title: string
  subtitle?: string
  actions: CommandAction[]
}>()
</script>

<template>
  <section class="dc-command-deck">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-command-deck__grid">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="dc-command-deck__item"
        :class="`tone-${action.tone}`"
      >
        <strong>{{ action.title }}</strong>
        <span>{{ action.description }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.dc-command-deck {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 84%, transparent);
  display: grid;
  gap: 10px;
}

.dc-command-deck header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-command-deck header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-command-deck__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.dc-command-deck__item {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-align: left;
  padding: 9px;
  display: grid;
  gap: 4px;
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
  color: var(--text-primary);
}

.dc-command-deck__item strong {
  font-size: 0.75rem;
}

.dc-command-deck__item span {
  font-size: 0.68rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.dc-command-deck__item.tone-info {
  border-color: color-mix(in srgb, var(--status-info) 44%, var(--border-soft));
}

.dc-command-deck__item.tone-warning {
  border-color: color-mix(in srgb, var(--status-warning) 44%, var(--border-soft));
}

.dc-command-deck__item.tone-danger {
  border-color: color-mix(in srgb, var(--status-danger) 46%, var(--border-soft));
}

.dc-command-deck__item.tone-success {
  border-color: color-mix(in srgb, var(--status-success) 44%, var(--border-soft));
}

@media (max-width: 820px) {
  .dc-command-deck__grid {
    grid-template-columns: 1fr;
  }
}
</style>
