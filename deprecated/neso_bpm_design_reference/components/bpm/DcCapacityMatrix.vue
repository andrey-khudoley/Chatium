<script setup lang="ts">
import { computed } from 'vue'
import type { CapacityRow } from '../../shared/bpmVueExportedTypes'

const props = defineProps<{
  title: string
  subtitle?: string
  rows: CapacityRow[]
}>()

const normalizedRows = computed(() =>
  props.rows.map((row) => {
    const capacity = row.capacity <= 0 ? 1 : row.capacity
    const ratio = Math.max(0, Math.round((row.load / capacity) * 100))
    return { ...row, ratio }
  })
)

function tone(ratio: number): string {
  if (ratio >= 95) return 'critical'
  if (ratio >= 80) return 'warning'
  if (ratio >= 60) return 'balanced'
  return 'low'
}
</script>

<template>
  <section class="dc-capacity-matrix">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-capacity-matrix__rows">
      <article
        v-for="row in normalizedRows"
        :key="row.team"
        class="dc-capacity-matrix__row"
        :class="`tone-${tone(row.ratio)}`"
      >
        <div class="dc-capacity-matrix__head">
          <strong>{{ row.team }}</strong>
          <span>{{ row.load }} / {{ row.capacity }}</span>
        </div>

        <div class="dc-capacity-matrix__bar">
          <span :style="{ width: `${Math.min(row.ratio, 100)}%` }"></span>
        </div>

        <div class="dc-capacity-matrix__meta">
          <em>{{ row.focus }}</em>
          <b>{{ row.ratio }}%</b>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.dc-capacity-matrix {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-2) 84%, transparent);
  display: grid;
  gap: 10px;
}

.dc-capacity-matrix header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-capacity-matrix header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-capacity-matrix__rows {
  display: grid;
  gap: 7px;
}

.dc-capacity-matrix__row {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  padding: 8px;
  display: grid;
  gap: 6px;
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
}

.dc-capacity-matrix__head,
.dc-capacity-matrix__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dc-capacity-matrix__head strong {
  font-size: 0.75rem;
}

.dc-capacity-matrix__head span {
  font-size: 0.68rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.dc-capacity-matrix__bar {
  height: 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-soft) 74%, transparent);
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-1) 88%, transparent);
}

.dc-capacity-matrix__bar span {
  height: 100%;
  display: block;
  background: linear-gradient(90deg, var(--status-success), var(--status-info));
}

.dc-capacity-matrix__meta em {
  font-style: normal;
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.dc-capacity-matrix__meta b {
  font-size: 0.72rem;
}

.dc-capacity-matrix__row.tone-warning .dc-capacity-matrix__bar span {
  background: linear-gradient(
    90deg,
    var(--status-warning),
    color-mix(in srgb, var(--status-warning) 64%, var(--status-danger))
  );
}

.dc-capacity-matrix__row.tone-critical .dc-capacity-matrix__bar span {
  background: linear-gradient(
    90deg,
    var(--status-danger),
    color-mix(in srgb, var(--status-danger) 70%, #ffffff)
  );
}

.dc-capacity-matrix__row.tone-low .dc-capacity-matrix__bar span {
  background: linear-gradient(
    90deg,
    var(--status-info),
    color-mix(in srgb, var(--status-info) 60%, var(--status-success))
  );
}
</style>
