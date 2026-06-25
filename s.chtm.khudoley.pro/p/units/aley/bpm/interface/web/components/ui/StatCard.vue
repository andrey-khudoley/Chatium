<template>
  <div class="statcard card-stat" data-deco="corner corner2" @click="$emit('click')">
    <div class="stat-head">
      <span class="stat-label">{{ label }}</span>
      <span class="stat-dot" :style="{ background: dot || 'var(--fg3)' }"></span>
    </div>
    <span class="deco-val" :style="{ fontSize: '36px', color: valueColor || 'var(--fg)' }">{{
      value
    }}</span>
    <div class="deco-foot" :style="{ color: trendColor || 'var(--fg3)' }">{{ trend }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  dot?: string
  trend?: string
  trendColor?: string
  valueColor?: string
}>()
defineEmits<{ (e: 'click'): void }>()
</script>

<style scoped>
.card-stat {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 15px 16px 13px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg2);
}
.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
</style>
