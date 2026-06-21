<template>
  <div class="app-select-row">
    <label v-if="label" :for="inputId" class="app-select-label">{{ label }}</label>
    <select
      :id="inputId"
      :value="modelValue"
      class="app-select"
      :disabled="disabled"
      @change="handleChange"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: String,
  options: Array,
  disabled: Boolean
})

const emit = defineEmits(['update:modelValue'])

function handleChange(event) {
  emit('update:modelValue', event.target.value)
}

const inputId = computed(() => `app-select-${Math.random().toString(36).slice(2, 9)}`)
</script>

<style scoped>
.app-select-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.app-select-label {
  font-weight: 500;
  color: var(--c-text-primary);
  min-width: 140px;
}

.app-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-primary);
  min-width: 120px;
}
</style>
