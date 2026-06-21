<script setup lang="ts">
import type { BpmBottleneck, BpmChartBar, BpmChartMode } from '../../shared/bpmTypes'
import DcBpmPanel from './DcBpmPanel.vue'

const props = defineProps<{
  title: string
  hint: string
  chartModeLabel: string
  chartModes: BpmChartMode[]
  activeMode: BpmChartMode['id']
  bars: BpmChartBar[]
  bottleneckTitle: string
  bottleneckHint: string
  bottlenecks: BpmBottleneck[]
}>()

const emit = defineEmits<{
  changeMode: [mode: BpmChartMode['id']]
}>()

function onModeClick(mode: BpmChartMode['id']) {
  emit('changeMode', mode)
}
</script>

<template>
  <div class="dc-bpm-analytics-grid">
    <DcBpmPanel :title="title" :hint="hint">
      <div class="dc-bpm-analytics-panel__toolbar">
        <span class="dc-bpm-analytics-panel__toolbar-label">{{ chartModeLabel }}</span>
        <button
          v-for="mode in chartModes"
          :key="mode.id"
          type="button"
          class="dc-pill"
          :class="{ active: activeMode === mode.id }"
          @click="onModeClick(mode.id)"
        >
          {{ mode.label }}
        </button>
      </div>

      <div class="dc-bpm-analytics-panel__chart-grid">
        <article v-for="bar in bars" :key="bar.label" class="dc-bpm-analytics-panel__chart-item">
          <div class="dc-bpm-analytics-panel__chart-track">
            <span
              class="dc-bpm-analytics-panel__chart-fill"
              :style="{ height: `${bar.value}%` }"
            ></span>
          </div>
          <p class="dc-bpm-analytics-panel__chart-label">{{ bar.label }}</p>
        </article>
      </div>
    </DcBpmPanel>

    <DcBpmPanel :title="bottleneckTitle" :hint="bottleneckHint">
      <div class="dc-bpm-analytics-panel__bottleneck-list">
        <div
          v-for="row in bottlenecks"
          :key="`${row.title}-${row.value}`"
          class="dc-bpm-analytics-panel__bottleneck-row"
        >
          <span>{{ row.title }}</span>
          <span class="mono">{{ row.value }}</span>
          <span class="dc-status-chip" :class="`status-${row.tone}`">{{ row.status }}</span>
        </div>
      </div>
    </DcBpmPanel>
  </div>
</template>

<style scoped>
.dc-bpm-analytics-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.62fr) minmax(0, 1fr);
  gap: 10px;
}

.dc-bpm-analytics-panel__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  padding: 6px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 76%, transparent);
}

.dc-bpm-analytics-panel__toolbar-label {
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  text-transform: uppercase;
  padding-right: 4px;
}

.dc-pill {
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
  color: var(--text-secondary);
  font-size: 0.68rem;
  letter-spacing: 0.02em;
}

.dc-pill.active {
  color: var(--text-primary);
  border-color: var(--border-accent);
  background: color-mix(in srgb, var(--accent-soft) 78%, transparent);
  box-shadow: var(--focus-ring);
}

.dc-bpm-analytics-panel__chart-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  min-height: 170px;
  padding: 8px;
}

.dc-bpm-analytics-panel__chart-item {
  display: grid;
  gap: 6px;
  justify-items: center;
}

.dc-bpm-analytics-panel__chart-track {
  width: 100%;
  height: 130px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 74%, transparent);
  display: flex;
  align-items: flex-end;
  padding: 4px;
}

.dc-bpm-analytics-panel__chart-fill {
  width: 100%;
  border-radius: calc(var(--radius-sm) - 2px);
  background: linear-gradient(180deg, var(--chart-2), var(--chart-1));
  box-shadow: var(--glow-accent);
}

.dc-bpm-analytics-panel__chart-label {
  margin: 0;
  font-size: 0.68rem;
  color: var(--text-secondary);
}

.dc-bpm-analytics-panel__bottleneck-list {
  display: grid;
  gap: 6px;
}

.dc-bpm-analytics-panel__bottleneck-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  font-size: 0.72rem;
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.dc-status-chip {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.65rem;
  border: 1px solid transparent;
}

.status-warning {
  color: var(--status-warning);
  border-color: color-mix(in srgb, var(--status-warning) 56%, transparent);
  background: color-mix(in srgb, var(--status-warning) 20%, transparent);
}

.status-danger {
  color: var(--status-danger);
  border-color: color-mix(in srgb, var(--status-danger) 56%, transparent);
  background: color-mix(in srgb, var(--status-danger) 20%, transparent);
}

.status-success {
  color: var(--status-success);
  border-color: color-mix(in srgb, var(--status-success) 56%, transparent);
  background: color-mix(in srgb, var(--status-success) 20%, transparent);
}

.status-info {
  color: var(--status-info);
  border-color: color-mix(in srgb, var(--status-info) 56%, transparent);
  background: color-mix(in srgb, var(--status-info) 20%, transparent);
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 980px) {
  .dc-bpm-analytics-grid,
  .dc-bpm-analytics-panel__chart-grid {
    grid-template-columns: 1fr;
  }

  .dc-bpm-analytics-panel__bottleneck-row {
    grid-template-columns: 1fr;
    justify-items: start;
  }
}
</style>
