<template>
  <div class="custom-radio-group" :class="[directionClass]">
    <label
      v-for="opt in parsedOptions"
      :key="opt.value"
      class="custom-radio"
      :class="{ 'custom-radio--checked': modelValue === opt.value }"
      @click="select(opt.value)"
    >
      <span class="custom-radio__indicator">
        <span class="custom-radio__dot"></span>
      </span>
      <span class="custom-radio__label">{{ opt.label }}</span>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  direction: { type: String, default: 'vertical' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const parsedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: opt.value ?? '', label: opt.label ?? String(opt.value ?? '') }
    }
    return { value: opt, label: String(opt) }
  })
})

const directionClass = computed(() =>
  props.direction === 'horizontal'
    ? 'custom-radio-group--horizontal'
    : 'custom-radio-group--vertical'
)

function select(val) {
  if (props.disabled) return
  emit('update:modelValue', val)
}
</script>

<style scoped>
.custom-radio-group--vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-radio-group--horizontal {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-radio {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  transition: all 0.2s ease;
  user-select: none;
}

.custom-radio:hover {
  border-color: var(--wr-border-hover);
  background: var(--wr-input-focus-bg);
}

.custom-radio--checked {
  border-color: #f8005b;
  background: rgba(248, 0, 91, 0.06);
}

.custom-radio--checked:hover {
  background: rgba(248, 0, 91, 0.09);
}

:global(.theme-light) .custom-radio--checked {
  background: rgba(248, 0, 91, 0.04);
}

.custom-radio__indicator {
  position: relative;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  border: 2px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.custom-radio--checked .custom-radio__indicator {
  border-color: #f8005b;
  background: transparent;
}

.custom-radio__dot {
  width: 0;
  height: 0;
  border-radius: 50%;
  background: #f8005b;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0;
}

.custom-radio--checked .custom-radio__dot {
  width: 10px;
  height: 10px;
  opacity: 1;
}

.custom-radio__label {
  font-size: 14px;
  color: var(--wr-text-primary);
  line-height: 1.3;
}

.custom-radio--checked .custom-radio__label {
  color: var(--wr-text-primary);
  font-weight: 500;
}
</style>
