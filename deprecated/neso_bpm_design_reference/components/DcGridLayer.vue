<script setup lang="ts">
defineProps<{
  theme?: 'dark' | 'light'
}>()
</script>

<template>
  <div class="dc-grid-layer" aria-hidden="true" />
</template>

<style scoped>
.dc-grid-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.72), transparent 94%);
}
</style>
