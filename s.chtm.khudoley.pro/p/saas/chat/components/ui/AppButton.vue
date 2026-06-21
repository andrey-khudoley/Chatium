<template>
  <button
    type="button"
    :class="['app-button', variant, { disabled: disabled || loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <i v-if="icon && !loading" :class="icon" class="app-button-icon"></i>
    <span v-if="loading" class="app-button-loading">{{ loadingText }}</span>
    <span v-else><slot /></span>
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary'].includes(v)
  },
  disabled: Boolean,
  loading: Boolean,
  loadingText: { type: String, default: '…' },
  icon: String
})
defineEmits(['click'])
</script>

<style scoped>
.app-button {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.app-button.primary {
  background: var(--c-primary);
  color: #fff;
}

.app-button.secondary {
  background: var(--c-surface);
  color: var(--c-text-primary);
  border: 1px solid var(--c-border);
}

.app-button.disabled,
.app-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.app-button-icon {
  font-size: 1em;
}

.app-button-loading {
  opacity: 0.9;
}
</style>
