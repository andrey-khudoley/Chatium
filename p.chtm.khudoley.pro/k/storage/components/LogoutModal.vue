<template>
  <Transition name="modal">
    <div v-if="visible" class="logout-modal-overlay" @click="onCancel">
      <div class="logout-modal" @click.stop>
        <div class="logout-message">Выйти из аккаунта?</div>
        <div class="logout-buttons">
          <button class="logout-btn logout-btn-no" @click="onCancel">Нет</button>
          <button class="logout-btn logout-btn-yes" @click="onConfirm">Да</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('LogoutModal')

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

watch(() => props.visible, (v) => {
  if (v) log.info('Logout modal displayed')
})

function onConfirm() {
  log.notice('Logout confirmed by user')
  emit('confirm')
}

function onCancel() {
  log.info('Logout cancelled by user')
  emit('cancel')
}

onMounted(() => {
  log.debug('Component mounted')
})
</script>

<style scoped>
.logout-modal-overlay {
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
}

.logout-modal {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-accent);
  padding: 3rem 2.5rem;
  max-width: 500px;
  width: calc(100% - 2rem);
  position: relative;
  box-shadow:
    0 0 40px rgba(211, 35, 75, 0.4),
    0 0 80px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.modal-enter-active { transition: opacity 0.3s ease-out; }
.modal-leave-active { transition: opacity 0.3s ease-in; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.modal-enter-active .logout-modal {
  animation: modal-appear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.modal-leave-active .logout-modal {
  animation: modal-disappear 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}

@keyframes modal-appear {
  from { transform: scale(0.8) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes modal-disappear {
  from { transform: scale(1) translateY(0); opacity: 1; }
  to { transform: scale(0.8) translateY(20px); opacity: 0; }
}

.logout-modal::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
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

.logout-message {
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--color-text);
  text-align: center;
  margin-bottom: 2rem;
  letter-spacing: 0.08em;
  text-shadow: 0 0 10px rgba(232, 232, 232, 0.4), 0 0 20px rgba(211, 35, 75, 0.2);
  position: relative;
  z-index: 2;
  animation: text-flicker 0.5s ease-in;
}

@keyframes text-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.logout-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.logout-btn {
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
}

.logout-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.logout-btn:hover::before { left: 100%; }

.logout-btn-no {
  color: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.logout-btn-no:hover {
  background: var(--color-accent);
  color: white;
  box-shadow: 0 0 20px rgba(211, 35, 75, 0.6), 0 0 40px rgba(211, 35, 75, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.logout-btn-no:active {
  transform: translateY(0);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.4);
}

.logout-btn-yes {
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
}

.logout-btn-yes:hover {
  color: var(--color-text);
  border-color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.logout-btn-yes:active {
  transform: translateY(0);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
}

@media (max-width: 640px) {
  .logout-modal { padding: 2rem 1.5rem; }
  .logout-message { font-size: 1.25rem; margin-bottom: 1.5rem; }
  .logout-buttons { flex-direction: column; gap: 1rem; }
  .logout-btn { width: 100%; min-width: auto; }
}
</style>
