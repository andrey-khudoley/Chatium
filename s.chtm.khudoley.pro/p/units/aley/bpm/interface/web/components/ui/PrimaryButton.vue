<template>
  <button class="primary-btn" @click="$emit('click')">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineEmits<{ (e: 'click'): void }>()
</script>

<style scoped>
.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--accent);
  color: var(--accent-fg);
  border: none;
  border-radius: 4px;
  padding: 9px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.12s;
}
.primary-btn:hover {
  filter: brightness(1.08);
}
</style>
