<template>
  <button class="icon-btn" :title="title" @click="$emit('click')">
    <span v-html="icon"></span>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps<{ icon?: string; title?: string }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<style scoped>
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--fg);
  cursor: pointer;
  flex: none;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.icon-btn:hover {
  border-color: var(--line-2);
  background: var(--elevated);
}
</style>
