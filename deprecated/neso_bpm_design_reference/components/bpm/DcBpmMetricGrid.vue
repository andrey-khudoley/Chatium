<script setup lang="ts">
import type { BpmMetric } from '../../shared/bpmTypes'

defineProps<{
  metrics: BpmMetric[]
}>()
</script>

<template>
  <section class="dc-bpm-metric-grid">
    <article
      v-for="item in metrics"
      :key="item.id"
      class="dc-bpm-metric-card"
      :class="`tone-${item.tone}`"
    >
      <p class="dc-bpm-metric-card__label">{{ item.label }}</p>
      <div class="dc-bpm-metric-card__row">
        <strong class="dc-bpm-metric-card__value">{{ item.value }}</strong>
        <span class="dc-bpm-metric-card__delta">{{ item.delta }}</span>
      </div>
    </article>
  </section>
</template>

<style scoped>
.dc-bpm-metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.dc-bpm-metric-card {
  position: relative;
  min-width: 0;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.dc-bpm-metric-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--accent);
  opacity: 0.72;
}

.dc-bpm-metric-card.tone-success::before {
  background: var(--status-success);
}

.dc-bpm-metric-card.tone-danger::before {
  background: var(--status-danger);
}

.dc-bpm-metric-card.tone-warning::before {
  background: var(--status-warning);
}

.dc-bpm-metric-card.tone-info::before {
  background: var(--status-info);
}

.dc-bpm-metric-card__label {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dc-bpm-metric-card__row {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.dc-bpm-metric-card__value {
  min-width: 0;
  font-size: 1.2rem;
  letter-spacing: 0;
  line-height: 1.05;
}

.dc-bpm-metric-card__delta {
  flex-shrink: 0;
  font-size: 0.73rem;
  color: var(--text-secondary);
}

.dc-bpm-metric-card.tone-success .dc-bpm-metric-card__delta {
  color: var(--status-success);
}

.dc-bpm-metric-card.tone-danger .dc-bpm-metric-card__delta {
  color: var(--status-danger);
}

.dc-bpm-metric-card.tone-warning .dc-bpm-metric-card__delta {
  color: var(--status-warning);
}

.dc-bpm-metric-card.tone-info .dc-bpm-metric-card__delta {
  color: var(--status-info);
}

@media (max-width: 1400px) {
  .dc-bpm-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .dc-bpm-metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
