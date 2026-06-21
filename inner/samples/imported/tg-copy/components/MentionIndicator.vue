<template>
  <Transition name="mention-indicator">
    <button
      v-if="show && count > 0"
      class="mention-indicator"
      @click="$emit('click')"
      :title="title"
      :style="indicatorStyle"
    >
      <i class="fas fa-at"></i>
      <span v-if="count > 1" class="mention-count">{{ count }}</span>
    </button>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  show: Boolean,
  count: {
    type: Number,
    default: 0
  },
  bottom: {
    type: Number,
    default: 100 // Значение по умолчанию для обратной совместимости
  }
})

const emit = defineEmits(['click'])

const title = computed(() => {
  if (props.count === 1) return '1 упоминание'
  if (props.count < 5) return `${props.count} упоминания`
  return `${props.count} упоминаний`
})

// Динамический стиль для позиционирования
const indicatorStyle = computed(() => {
  return {
    bottom: `${props.bottom}px`
  }
})
</script>

<style scoped>
.mention-indicator {
  position: absolute;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-color, #008069);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  z-index: 100;
}

.mention-indicator:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.mention-indicator:active {
  transform: scale(0.95);
}

.mention-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-primary, #fff);
}

/* Анимации */
.mention-indicator-enter-active,
.mention-indicator-leave-active {
  transition: all 0.3s ease;
}

.mention-indicator-enter-from,
.mention-indicator-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .mention-indicator {
    right: 16px;
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}
</style>