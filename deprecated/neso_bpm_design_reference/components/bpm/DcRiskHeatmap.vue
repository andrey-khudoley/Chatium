<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
  xLabels: string[]
  yLabels: string[]
  matrix: number[][]
}>()

function tone(value: number): string {
  if (value >= 5) return 'extreme'
  if (value === 4) return 'high'
  if (value === 3) return 'medium'
  if (value === 2) return 'low'
  return 'minimal'
}

function cellValue(y: number, x: number): number {
  return props.matrix[y]?.[x] ?? 1
}
</script>

<template>
  <section class="dc-risk-heatmap">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-risk-heatmap__table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th v-for="x in xLabels" :key="x">{{ x }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(y, yIndex) in yLabels" :key="y">
            <th>{{ y }}</th>
            <td
              v-for="(x, xIndex) in xLabels"
              :key="`${y}-${x}`"
              :class="`tone-${tone(cellValue(yIndex, xIndex))}`"
            >
              {{ cellValue(yIndex, xIndex) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="dc-risk-heatmap__legend">
      <span class="tone-minimal">minimal</span>
      <span class="tone-low">low</span>
      <span class="tone-medium">medium</span>
      <span class="tone-high">high</span>
      <span class="tone-extreme">extreme</span>
    </div>
  </section>
</template>

<style scoped>
.dc-risk-heatmap {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 84%, transparent);
  display: grid;
  gap: 10px;
}

.dc-risk-heatmap header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-risk-heatmap header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-risk-heatmap__table-wrap {
  overflow: auto;
}

.dc-risk-heatmap table {
  width: 100%;
  border-collapse: collapse;
  min-width: 460px;
}

.dc-risk-heatmap th,
.dc-risk-heatmap td {
  border: 1px solid color-mix(in srgb, var(--border-soft) 72%, transparent);
  text-align: center;
  height: 38px;
  font-size: 0.69rem;
}

.dc-risk-heatmap th {
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
  color: var(--text-tertiary);
  font-weight: 600;
  padding: 0 8px;
}

.dc-risk-heatmap td {
  font-family: var(--font-mono);
}

.dc-risk-heatmap td.tone-minimal,
.dc-risk-heatmap__legend .tone-minimal {
  background: color-mix(in srgb, var(--status-success) 26%, transparent);
}

.dc-risk-heatmap td.tone-low,
.dc-risk-heatmap__legend .tone-low {
  background: color-mix(in srgb, var(--status-info) 26%, transparent);
}

.dc-risk-heatmap td.tone-medium,
.dc-risk-heatmap__legend .tone-medium {
  background: color-mix(in srgb, var(--status-warning) 26%, transparent);
}

.dc-risk-heatmap td.tone-high,
.dc-risk-heatmap__legend .tone-high {
  background: color-mix(in srgb, var(--status-danger) 26%, transparent);
}

.dc-risk-heatmap td.tone-extreme,
.dc-risk-heatmap__legend .tone-extreme {
  background: color-mix(in srgb, var(--status-danger) 42%, transparent);
}

.dc-risk-heatmap__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dc-risk-heatmap__legend span {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.62rem;
  border: 1px solid color-mix(in srgb, var(--border-soft) 72%, transparent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
