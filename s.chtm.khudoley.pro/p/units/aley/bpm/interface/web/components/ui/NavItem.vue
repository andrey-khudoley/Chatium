<template>
  <div :class="['nav-item', { active }]" @click="$emit('click')">
    <span class="nav-icon" v-html="icon"></span>
    <span class="nav-label">{{ label }}</span>
    <span v-if="count !== undefined && count > 0" class="nav-count">{{ count }}</span>
    <span v-if="dot" class="nav-dot"></span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  active?: boolean
  count?: number
  dot?: boolean
}>()
defineEmits<{ (e: 'click'): void }>()
</script>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--fg2);
  font-size: 13px;
  font-weight: 500;
  transition:
    background 0.12s,
    color 0.12s;
}
.nav-item:hover {
  background: var(--surface-2);
  color: var(--fg);
}
.nav-item.active {
  background: var(--surface-2);
  color: var(--fg);
  font-weight: 600;
}
.nav-icon {
  flex: none;
  width: 17px;
  height: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-icon :deep(svg) {
  display: block;
}
.nav-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 1px 6px;
}
.nav-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex: none;
  animation: softpulse 2.2s infinite;
}
</style>
