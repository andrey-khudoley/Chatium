<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  show: boolean
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

let escHandler: ((e: KeyboardEvent) => void) | null = null

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}

// Функция для форматирования текста с выделением части до ":"
const formatMessage = (text: string): string => {
  if (!text) return ''

  // Разбиваем на строки
  const lines = text.split('\n')

  return lines
    .map((line) => {
      // Ищем первое вхождение ":"
      const colonIndex = line.indexOf(':')

      if (colonIndex > 0 && colonIndex < line.length - 1) {
        // Есть ":" - выделяем часть до ":"
        const label = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim()

        return `<span class="message-label">${escapeHtml(label)}:</span> <span class="message-value">${escapeHtml(value)}</span>`
      }

      // Нет ":" - возвращаем как есть
      return escapeHtml(line)
    })
    .join('\n')
}

// Экранирование HTML для безопасности
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

const formattedMessage = computed(() => formatMessage(props.message))

onMounted(() => {
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.show) {
      cancel()
    }
  }
  window.addEventListener('keydown', escHandler)
})

onUnmounted(() => {
  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
    escHandler = null
  }
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      // Блокируем скролл фона при открытии модального окна
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click="cancel">
      <div class="modal-content" @click.stop>
        <div class="modal-scanlines"></div>

        <div class="modal-header">
          <h2 class="modal-title">
            <i
              :class="[
                'fas',
                type === 'danger'
                  ? 'fa-exclamation-triangle'
                  : type === 'warning'
                    ? 'fa-exclamation-circle'
                    : 'fa-question-circle'
              ]"
              :style="{
                color:
                  type === 'danger'
                    ? 'var(--color-accent)'
                    : type === 'warning'
                      ? '#fbbf24'
                      : 'var(--color-accent)'
              }"
            ></i>
            {{ title || 'Подтверждение' }}
          </h2>
          <button @click="cancel" class="modal-close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="modal-message">
            <p class="message-text" v-html="formattedMessage"></p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="cancel" class="modal-btn modal-btn-cancel">
            {{ cancelText || 'Отмена' }}
          </button>
          <button
            @click="confirm"
            class="modal-btn modal-btn-confirm"
            :class="{ 'modal-btn-danger': type === 'danger' }"
          >
            {{ confirmText || 'Подтвердить' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  padding: 1rem;
}

.modal-content {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-accent);
  padding: 0;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow:
    0 0 40px rgba(211, 35, 75, 0.4),
    0 0 80px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.modal-scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 2;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 0.08em;
  text-shadow:
    0 0 10px rgba(232, 232, 232, 0.4),
    0 0 20px rgba(211, 35, 75, 0.2);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-title i {
  font-size: 1.25rem;
}

.modal-close-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0;
  background: transparent;
  border: 2px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.modal-close-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.modal-close-btn i {
  position: relative;
  z-index: 2;
}

.modal-close-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(211, 35, 75, 0.1);
}

.modal-body {
  padding: 2rem 2.5rem;
  position: relative;
  z-index: 2;
}

.modal-message {
  color: var(--color-text);
  font-size: 1.125rem;
  line-height: 1.8;
  letter-spacing: 0.03em;
}

.message-text {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Выделение текста до ":" - используем :deep() для работы внутри v-html */
.modal-message :deep(.message-label),
.message-text :deep(.message-label) {
  font-weight: 700 !important;
  color: var(--color-text) !important;
  text-shadow:
    0 0 10px rgba(232, 232, 232, 0.6),
    0 0 15px rgba(211, 35, 75, 0.4),
    0 0 20px rgba(211, 35, 75, 0.2) !important;
  letter-spacing: 0.06em;
  display: inline-block;
}

.modal-message :deep(.message-value),
.message-text :deep(.message-value) {
  color: var(--color-text-secondary) !important;
  font-weight: 400 !important;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.modal-footer {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  padding: 1.5rem 2.5rem;
  border-top: 1px solid var(--color-border);
  position: relative;
  z-index: 2;
}

.modal-btn {
  min-width: 120px;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  border: 2px solid;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  text-transform: uppercase;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.modal-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.modal-btn:hover::before {
  left: 100%;
}

.modal-btn-cancel {
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
}

.modal-btn-cancel:hover {
  color: var(--color-text);
  border-color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.05);
  box-shadow:
    0 0 15px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.modal-btn-cancel:active {
  transform: translateY(0);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
}

.modal-btn-confirm {
  color: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.modal-btn-confirm:hover {
  background: var(--color-accent);
  color: white;
  box-shadow:
    0 0 20px rgba(211, 35, 75, 0.6),
    0 0 40px rgba(211, 35, 75, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.modal-btn-confirm:active {
  transform: translateY(0);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.4);
}

.modal-btn-danger {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.modal-btn-danger:hover {
  background: var(--color-accent);
  color: white;
}

/* Modal transitions */
.modal-enter-active {
  transition: opacity 0.3s ease-out;
}

.modal-leave-active {
  transition: opacity 0.3s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  animation: modal-appear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.modal-leave-active .modal-content {
  animation: modal-disappear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

@keyframes modal-appear {
  from {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes modal-disappear {
  from {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  to {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
}
</style>
