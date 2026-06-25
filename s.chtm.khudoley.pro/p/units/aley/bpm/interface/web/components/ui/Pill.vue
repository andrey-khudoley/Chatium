<template>
  <span class="pill" :style="{ color: color, background: bg, borderColor: border }">
    <span v-if="dot" class="pill-dot" :style="{ background: color }"></span>
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  color?: string
  bg?: string
  border?: string
  dot?: boolean
}>()
</script>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 20px;
  padding: 4px 11px;
  border: 1px solid transparent;
}
.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}
</style>
