<template>
  <div
    class="checkbox"
    :class="{ checked: modelValue }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <svg
      v-if="modelValue"
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="var(--accent-fg)"
      stroke-width="2.2"
    >
      <polyline points="2,6.5 5,9 10,3.5" />
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<style scoped>
.checkbox {
  width: 17px;
  height: 17px;
  border-radius: 5px;
  border: 1.5px solid var(--line-2);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.checkbox:hover {
  border-color: var(--accent);
}
.checkbox.checked {
  background: var(--accent);
  border-color: var(--accent);
}
</style>
