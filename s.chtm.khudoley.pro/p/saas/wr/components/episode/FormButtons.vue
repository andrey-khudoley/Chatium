<template>
  <div v-if="forms.length > 0" class="form-buttons-row">
    <button
      v-for="form in forms"
      :key="form.id"
      class="form-btn"
      :style="{
        background: form.buttonColor
          ? `linear-gradient(135deg, ${form.buttonColor} 0%, ${darken(form.buttonColor)} 100%)`
          : ''
      }"
      @click="handleFormClick(form)"
    >
      <span class="form-btn-text">{{ form.buttonText }}</span>
    </button>
  </div>
</template>

<script setup>
import { trackFormOpened } from '../../shared/use-form-analytics'

const props = defineProps({
  forms: { type: Array, default: () => [] },
  episodeId: { type: String, default: '' }
})

const emit = defineEmits(['open-form'])

function handleFormClick(form) {
  if (props.episodeId) {
    trackFormOpened(props.episodeId, form.id, form.title, form.submitAction)
  }
  emit('open-form', form.id)
}

function darken(hex) {
  if (!hex) return '#c7004a'
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - 30)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - 30)
  const b = Math.max(0, (num & 0x0000ff) - 30)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
</script>

<style scoped>
.form-buttons-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 0.75rem;
}

@media (max-width: 1023px) {
  .form-buttons-row {
    display: none;
  }
}

@media (min-width: 640px) {
  .form-buttons-row {
    padding: 12px 0.75rem;
  }
}

.form-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  line-height: 1.2;
  white-space: nowrap;
  position: relative;
  overflow: visible;
  background: linear-gradient(135deg, #f8005b 0%, #d4004e 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(248, 0, 91, 0.3);
  animation:
    form-btn-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    form-btn-pulse 2s ease-in-out infinite 0.5s;
}

.form-btn::before,
.form-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 2px solid rgba(248, 0, 91, 0.6);
  pointer-events: none;
  animation: form-btn-wave 2.5s ease-out infinite 0.5s;
}

.form-btn::after {
  animation-delay: 1.5s;
}

@keyframes form-btn-wave {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  70% {
    opacity: 0;
    transform: scale(1.12, 1.5);
  }
  100% {
    opacity: 0;
    transform: scale(1.12, 1.5);
  }
}

@keyframes form-btn-pop {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes form-btn-pulse {
  0%,
  100% {
    box-shadow: 0 4px 16px rgba(248, 0, 91, 0.3);
  }
  50% {
    box-shadow: 0 6px 28px rgba(248, 0, 91, 0.55);
  }
}

@media (max-width: 480px) {
  .form-btn {
    flex: 1;
    justify-content: center;
    padding: 12px 14px;
    font-size: 13px;
  }
}

.form-btn-text {
  flex-shrink: 1;
  min-width: 0;
}

.form-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 6px 24px rgba(248, 0, 91, 0.5);
  transform: translateY(-1px);
}

.form-btn:hover::before,
.form-btn:hover::after {
  animation: none;
  opacity: 0;
}

.form-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(248, 0, 91, 0.3);
}
</style>
