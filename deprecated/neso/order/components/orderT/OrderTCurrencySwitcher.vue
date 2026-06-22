<template>
  <div class="order-t-currency-switcher">
    <button
      v-for="c in currencies"
      :key="c"
      type="button"
      class="order-t-currency-option"
      :class="{ active: modelValue === c }"
      @click="$emit('update:modelValue', c)"
    >
      {{ c }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  currencies: readonly string[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.order-t-currency-switcher {
  display: flex;
  width: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.order-t-currency-option {
  flex: 1;
  padding: 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  border: none;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.order-t-currency-option:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.order-t-currency-option:hover {
  background: var(--color-button-light);
}

.order-t-currency-option.active {
  background: var(--color-primary);
  color: #fff;
}
</style>
