<template>
  <div class="seg-ctrl">
    <button
      v-for="opt in options"
      :key="opt.value"
      :class="['seg-btn', { active: modelValue === opt.value }]"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  options: { value: string; label: string }[]
  modelValue: string
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<style scoped>
.seg-ctrl {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
}
.seg-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 3px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--fg2);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.14s,
    color 0.14s;
}
.seg-btn:hover {
  color: var(--fg);
}
.seg-btn.active {
  background: var(--elevated);
  color: var(--fg);
  font-weight: 600;
}
</style>
