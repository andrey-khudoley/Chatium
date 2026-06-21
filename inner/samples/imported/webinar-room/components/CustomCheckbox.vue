<template>
  <label
    class="custom-checkbox"
    :class="{ 'custom-checkbox--checked': modelValue, 'custom-checkbox--disabled': disabled }"
    @click="handleClick"
  >
    <span class="custom-checkbox__indicator">
      <svg class="custom-checkbox__icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6L5 8.5L9.5 3.5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <span v-if="labelHtml || $slots.default" class="custom-checkbox__label">
      <span v-if="labelHtml" v-html="labelHtml"></span>
      <slot v-else />
    </span>
  </label>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  labelHtml: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

function handleClick(event) {
  // Если клик по ссылке или внутри ссылки, пропускаем переключение
  if (event.target.tagName === 'A' || event.target.closest('a')) {
    return
  }
  event.preventDefault()
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.custom-checkbox {
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-checkbox__indicator {
  position: relative;
  width: 20px;
  height: 20px;
  min-width: 20px;
  margin-top: 1px;
  border-radius: 6px;
  border: 2px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.custom-checkbox:hover:not(.custom-checkbox--disabled) .custom-checkbox__indicator {
  border-color: var(--wr-border-hover);
  background: var(--wr-input-focus-bg);
}

.custom-checkbox--checked .custom-checkbox__indicator {
  border-color: #f8005b;
  background: #f8005b;
}

.custom-checkbox--checked:hover:not(.custom-checkbox--disabled) .custom-checkbox__indicator {
  border-color: #d6004d;
  background: #d6004d;
}

.custom-checkbox__icon {
  color: transparent;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: scale(0);
}

.custom-checkbox--checked .custom-checkbox__icon {
  color: #fff;
  transform: scale(1);
}

.custom-checkbox__label {
  font-size: 14px;
  color: var(--wr-text-primary);
  line-height: 1.4;
}

.custom-checkbox__label :deep(a) {
  color: #f8005b;
  text-decoration: underline;
  transition: opacity 0.2s ease;
}

.custom-checkbox__label :deep(a):hover {
  opacity: 0.8;
}
</style>
