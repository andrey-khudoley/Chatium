<script setup lang="ts">
// Подтверждение мутирующего broker ops-действия. Требует непустой reason/comment
// (сервер отклоняет действия без причины). Не вызывает API сам — только эмитит
// confirm(reason)/cancel; запрос выполняет родительская панель.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { createComponentLogger } from '../../../shared/logger'

const log = createComponentLogger('BrokerOpsConfirmModal')

const props = defineProps<{
  visible: boolean
  title: string
  description: string
  danger?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}>()

const reason = ref('')

const onConfirm = () => {
  const trimmed = reason.value.trim()
  if (!trimmed || props.busy) return
  log.notice('Подтверждение ops-действия', { title: props.title })
  emit('confirm', trimmed)
}

const onCancel = () => {
  if (props.busy) return
  log.info('Отмена ops-действия', { title: props.title })
  emit('cancel')
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') onCancel()
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      reason.value = ''
      log.info('Показан диалог подтверждения', { title: props.title })
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  log.debug('Компонент смонтирован')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="brk-modal">
    <div v-if="visible" class="brk-modal-overlay" @click="onCancel">
      <div class="brk-modal" :class="{ 'brk-modal--danger': danger }" @click.stop>
        <div class="brk-modal-hd">
          <i :class="danger ? 'fas fa-exclamation-triangle' : 'fas fa-question-circle'"></i>
          <span>{{ title }}</span>
        </div>
        <p class="brk-modal-desc">{{ description }}</p>
        <label class="brk-modal-label" for="brk-reason">Причина (обязательно)</label>
        <textarea
          id="brk-reason"
          v-model="reason"
          class="brk-modal-input"
          rows="3"
          placeholder="Опишите причину действия для аудита"
          :disabled="busy"
        ></textarea>
        <div class="brk-modal-btns">
          <button type="button" class="ap-btn ap-btn--sm" :disabled="busy" @click="onCancel">
            <i class="fas fa-times"></i> Отмена
          </button>
          <button
            type="button"
            class="ap-btn ap-btn--sm"
            :class="{ 'ap-btn--danger': danger }"
            :disabled="busy || !reason.trim()"
            @click="onConfirm"
          >
            <i v-if="busy" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-check"></i>
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.brk-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  padding: 1rem;
}
.brk-modal {
  width: 100%;
  max-width: 460px;
  border: 1px solid var(--c-bdr-hi, #4b3e4e);
  background: var(--c-bg2, #100f13);
  padding: 1.25rem 1.4rem;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}
.brk-modal--danger {
  border-color: rgba(217, 122, 138, 0.5);
}
.brk-modal-hd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--c-tx, #e0dcdf);
  margin-bottom: 0.6rem;
}
.brk-modal--danger .brk-modal-hd {
  color: var(--c-alert, #d97a8a);
}
.brk-modal-desc {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--c-tx2, #a39da0);
  word-break: break-word;
}
.brk-modal-label {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-tx3, #7e777b);
  margin-bottom: 0.35rem;
}
.brk-modal-input {
  width: 100%;
  resize: vertical;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--c-bdr, #322c36);
  background: var(--c-bg-deep, #08070a);
  color: var(--c-tx, #e0dcdf);
  font-family: inherit;
  font-size: 0.82rem;
  line-height: 1.45;
  box-sizing: border-box;
}
.brk-modal-input:focus {
  outline: none;
  border-color: var(--c-red-s, #d95672);
}
.brk-modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.95rem;
}
.brk-modal-btns .ap-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.brk-modal-enter-active,
.brk-modal-leave-active {
  transition: opacity 0.2s ease;
}
.brk-modal-enter-from,
.brk-modal-leave-to {
  opacity: 0;
}
</style>
