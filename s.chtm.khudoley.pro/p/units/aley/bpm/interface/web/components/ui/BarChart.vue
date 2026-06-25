<template>
  <div class="bar-chart" :style="{ height: height + 'px' }">
    <div v-for="bar in bars" :key="bar.label" class="bar-col">
      <div
        class="bar-fill"
        :style="{
          height: (bar.value / maxVal) * 100 + '%',
          background: barBg || 'var(--accent-soft)',
          borderTopColor: barLine || 'var(--accent)'
        }"
      ></div>
      <span class="bar-label">{{ bar.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  bars: { label: string; value: number }[]
  height?: number
  barBg?: string
  barLine?: string
}>()
const maxVal = computed(() => Math.max(...props.bars.map((b) => b.value), 1))
</script>

<style scoped>
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 9px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
  justify-content: flex-end;
}
.bar-fill {
  width: 100%;
  max-width: 30px;
  border-top: 2px solid;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}
.bar-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg3);
  white-space: nowrap;
}
</style>
