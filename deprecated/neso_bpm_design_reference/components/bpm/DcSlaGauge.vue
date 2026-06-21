<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  value: number
  target?: number
  trend?: string
  description?: string
}>()

const normalized = computed(() => Math.max(0, Math.min(100, props.value)))
const target = computed(() => Math.max(0, Math.min(100, props.target ?? 85)))
const angle = computed(() => `${(normalized.value / 100) * 360}deg`)

const stateClass = computed(() => {
  if (normalized.value < 55) return 'danger'
  if (normalized.value < 75) return 'warning'
  return 'good'
})
</script>

<template>
  <section class="dc-sla-gauge" :class="`state-${stateClass}`">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-sla-gauge__dial-wrap">
      <div class="dc-sla-gauge__dial" :style="{ '--gauge-angle': angle }">
        <div class="dc-sla-gauge__inner">
          <strong>{{ normalized }}%</strong>
          <span>SLA confidence</span>
        </div>
      </div>

      <div class="dc-sla-gauge__meta">
        <p>
          <span>Target</span>
          <strong>{{ target }}%</strong>
        </p>
        <p>
          <span>Trend</span>
          <strong>{{ trend || 'stable' }}</strong>
        </p>
      </div>
    </div>

    <p v-if="description" class="dc-sla-gauge__description">{{ description }}</p>
  </section>
</template>

<style scoped>
.dc-sla-gauge {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-2) 84%, transparent);
  display: grid;
  gap: 10px;
}

.dc-sla-gauge header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-sla-gauge header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-sla-gauge__dial-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.dc-sla-gauge__dial {
  width: 134px;
  height: 134px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(
    var(--accent) var(--gauge-angle),
    color-mix(in srgb, var(--border-soft) 72%, transparent) 0deg
  );
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--border-soft) 76%, transparent),
    var(--shadow-sm);
  position: relative;
}

.dc-sla-gauge__dial::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: radial-gradient(
      circle at 35% 30%,
      color-mix(in srgb, var(--accent-soft) 62%, transparent),
      transparent 60%
    ),
    color-mix(in srgb, var(--surface-1) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-soft) 68%, transparent);
}

.dc-sla-gauge__inner {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
}

.dc-sla-gauge__inner strong {
  font-size: 1.45rem;
  line-height: 1;
}

.dc-sla-gauge__inner span {
  margin-top: 3px;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dc-sla-gauge__meta {
  display: grid;
  gap: 8px;
}

.dc-sla-gauge__meta p {
  margin: 0;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
}

.dc-sla-gauge__meta span {
  font-size: 0.68rem;
  color: var(--text-tertiary);
}

.dc-sla-gauge__meta strong {
  font-size: 0.78rem;
}

.dc-sla-gauge__description {
  margin: 0;
  font-size: 0.73rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.dc-sla-gauge.state-danger .dc-sla-gauge__dial {
  background: conic-gradient(
    var(--status-danger) var(--gauge-angle),
    color-mix(in srgb, var(--border-soft) 72%, transparent) 0deg
  );
}

.dc-sla-gauge.state-warning .dc-sla-gauge__dial {
  background: conic-gradient(
    var(--status-warning) var(--gauge-angle),
    color-mix(in srgb, var(--border-soft) 72%, transparent) 0deg
  );
}

.dc-sla-gauge.state-good .dc-sla-gauge__dial {
  background: conic-gradient(
    var(--status-success) var(--gauge-angle),
    color-mix(in srgb, var(--border-soft) 72%, transparent) 0deg
  );
}

@media (max-width: 700px) {
  .dc-sla-gauge__dial-wrap {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .dc-sla-gauge__meta {
    width: 100%;
  }
}
</style>
