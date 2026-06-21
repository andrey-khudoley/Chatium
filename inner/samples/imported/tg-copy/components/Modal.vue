<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="modal-overlay" 
      @click="handleOverlayClick"
      :class="{ 'closing': isClosing }"
    >
      <div 
        class="modal-container" 
        :class="[size, { 'closing': isClosing }]"
        @click.stop
      >
        <!-- Шапка -->
        <div v-if="title || showClose" class="modal-header">
          <h3 v-if="title" class="modal-title">{{ title }}</h3>
          <button v-if="showClose" @click="close" class="modal-close-btn" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Контент -->
        <div class="modal-body" :class="bodyClass">
          <slot />
        </div>
        
        <!-- Футер -->
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  title: String,
  showClose: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large, full
    validator: (value) => ['small', 'medium', 'large', 'full'].includes(value)
  },
  bodyClass: String,
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  // Задержка перед закрытием (для анимации)
  closeDelay: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'closed'])

const isClosing = ref(false)

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close()
  }
}

function close() {
  if (isClosing.value) return
  
  if (props.closeDelay > 0) {
    isClosing.value = true
    setTimeout(() => {
      isClosing.value = false
      emit('close')
      emit('closed')
    }, props.closeDelay)
  } else {
    emit('close')
    emit('closed')
  }
}

// Закрытие по Escape
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleEscape)
    document.body.style.overflow = ''
  }
})

function handleEscape(e) {
  if (e.key === 'Escape') {
    close()
  }
}

// Экспозим метод close для родительских компонентов
defineExpose({ close })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.modal-overlay.closing {
  opacity: 0;
}

.modal-container {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-container.closing {
  opacity: 0;
  transform: scale(0.95);
}

/* Размеры */
.modal-container.small {
  width: 100%;
  max-width: 360px;
}

.modal-container.medium {
  width: 100%;
  max-width: 480px;
}

.modal-container.large {
  width: 100%;
  max-width: 640px;
}

.modal-container.full {
  width: 100%;
  max-width: 90vw;
  height: 90vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #111b21);
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary, #667781);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close-btn:hover {
  background: var(--bg-hover, #f0f2f5);
  color: var(--text-primary, #111b21);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Мобильная адаптация */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  
  .modal-container {
    border-radius: 12px 12px 0 0;
    max-height: 85vh;
    animation: slideUp 0.2s ease;
  }
  
  .modal-container.small,
  .modal-container.medium,
  .modal-container.large {
    max-width: 100%;
  }
  
  .modal-container.full {
    max-width: 100%;
    height: 85vh;
    border-radius: 12px 12px 0 0;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>