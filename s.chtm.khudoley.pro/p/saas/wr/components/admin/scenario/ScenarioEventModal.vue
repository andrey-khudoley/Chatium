<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="se-modal-overlay" @click.self="$emit('close')">
        <div class="se-modal" :class="{ 'se-modal--wide': isFormType }">
          <div class="se-modal-header">
            <h4 class="wr-text-primary font-semibold text-base">
              {{ editing ? 'Редактировать событие' : 'Новое событие' }}
            </h4>
            <button type="button" @click="$emit('close')" class="se-close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="se-modal-body">
            <div class="se-row">
              <div class="se-field">
                <label class="se-label">Тип события *</label>
                <CustomSelect
                  v-model="form.eventType"
                  :options="eventTypeOptions"
                  placeholder="Выберите тип"
                  size="sm"
                  :disabled="!!editing"
                />
              </div>
              <div class="se-field se-field--time">
                <label class="se-label">Таймкод *</label>
                <div class="se-time-inputs">
                  <div class="se-time-group">
                    <input
                      v-model.number="timeHours"
                      type="number"
                      min="0"
                      max="23"
                      class="se-time-input"
                      placeholder="00"
                    />
                    <span class="se-time-label">ч</span>
                  </div>
                  <span class="se-time-sep">:</span>
                  <div class="se-time-group">
                    <input
                      v-model.number="timeMinutes"
                      type="number"
                      min="0"
                      max="59"
                      class="se-time-input"
                      placeholder="00"
                    />
                    <span class="se-time-label">м</span>
                  </div>
                  <span class="se-time-sep">:</span>
                  <div class="se-time-group">
                    <input
                      v-model.number="timeSeconds"
                      type="number"
                      min="0"
                      max="59"
                      class="se-time-input"
                      placeholder="00"
                    />
                    <span class="se-time-label">с</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- chat_message -->
            <template v-if="form.eventType === 'chat_message'">
              <div class="se-field">
                <label class="se-label">Имя автора *</label>
                <input
                  v-model="form.chatMessage.authorName"
                  type="text"
                  class="se-input"
                  placeholder="Иван Петров"
                />
              </div>
              <div class="se-field">
                <label class="se-label">Сообщение *</label>
                <textarea
                  v-model="form.chatMessage.text"
                  rows="3"
                  class="se-input se-textarea"
                  placeholder="Текст сообщения..."
                ></textarea>
              </div>
              <div class="se-field">
                <label class="se-check-label">
                  <input type="checkbox" v-model="form.chatMessage.isAdmin" class="se-checkbox" />
                  <span>Сообщение от администратора</span>
                </label>
              </div>
            </template>

            <!-- show_form / hide_form -->
            <template v-if="isFormType">
              <div class="se-field">
                <label class="se-label">Форма *</label>
                <CustomSelect
                  v-model="form.formId"
                  :options="formOptions"
                  placeholder="Выберите форму"
                  size="sm"
                />
              </div>
              <div v-if="form.eventType === 'show_form' && selectedForm" class="se-form-preview">
                <div class="se-preview-header">
                  <i class="fas fa-eye mr-1.5"></i> Предпросмотр формы
                </div>
                <div class="se-preview-body">
                  <div class="se-preview-title">{{ selectedForm.title }}</div>
                  <div v-if="selectedForm.fields?.length" class="se-preview-fields">
                    <div v-for="f in selectedForm.fields" :key="f.id" class="se-preview-field">
                      <i class="fas fa-minus text-[8px] mr-1.5 opacity-40"></i>
                      {{ f.label }} <span class="wr-text-muted">({{ f.type }})</span>
                    </div>
                  </div>
                  <div class="se-preview-action">
                    Действие: <strong>{{ actionLabel(selectedForm.submitAction) }}</strong>
                    <span v-if="selectedForm.paymentAmount">
                      — {{ selectedForm.paymentAmount }}
                      {{ selectedForm.paymentCurrency || 'RUB' }}</span
                    >
                  </div>
                </div>
              </div>
            </template>

            <!-- sale_banner -->
            <template v-if="form.eventType === 'sale_banner'">
              <div class="se-field">
                <label class="se-label">Заголовок баннера *</label>
                <input
                  v-model="form.bannerData.title"
                  type="text"
                  class="se-input"
                  placeholder="Специальное предложение!"
                />
              </div>
              <div class="se-field">
                <label class="se-label">Подзаголовок</label>
                <input
                  v-model="form.bannerData.subtitle"
                  type="text"
                  class="se-input"
                  placeholder="Только сегодня..."
                />
              </div>
              <div class="se-field">
                <label class="se-label">Текст кнопки</label>
                <input
                  v-model="form.bannerData.buttonText"
                  type="text"
                  class="se-input"
                  placeholder="Купить"
                />
              </div>
              <div class="se-field">
                <label class="se-label">Привязать к форме</label>
                <CustomSelect
                  v-model="form.bannerData.formType"
                  :options="[{ value: '', label: 'Без формы' }, ...formOptions]"
                  placeholder="Выберите форму"
                  size="sm"
                />
              </div>
            </template>

            <!-- reaction -->
            <template v-if="form.eventType === 'reaction'">
              <div class="se-field">
                <label class="se-label">Эмодзи *</label>
                <div class="se-emoji-picker">
                  <button
                    v-for="emoji in emojiList"
                    :key="emoji"
                    type="button"
                    class="se-emoji-btn"
                    :class="{ 'se-emoji-btn--active': form.reactionData.emoji === emoji }"
                    @click="form.reactionData.emoji = emoji"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </template>

            <!-- system events -->
            <template v-if="isSystemType">
              <div class="se-notice">
                <i class="fas fa-info-circle mr-1.5"></i>
                Системные события не требуют дополнительных данных. Укажите только таймкод.
              </div>
            </template>
          </div>

          <div class="se-modal-footer">
            <button type="button" @click="$emit('close')" class="se-btn-cancel">Отмена</button>
            <button type="button" @click="save" :disabled="!isValid || saving" class="se-btn-save">
              <i v-if="saving" class="fas fa-spinner animate-spin mr-1.5"></i>
              <i v-else class="fas fa-check mr-1.5"></i>
              {{ editing ? 'Сохранить' : 'Создать' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import CustomSelect from '../../CustomSelect.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  editing: { type: Object, default: null },
  forms: { type: Array, default: () => [] },
  duration: { type: Number, default: 3600 },
  autowebinarId: { type: String, required: true }
})

const emit = defineEmits(['close', 'save'])

const saving = ref(false)

const form = reactive({
  eventType: 'chat_message',
  chatMessage: { authorName: '', text: '', isAdmin: false },
  formId: '',
  bannerData: { title: '', subtitle: '', buttonText: '', formType: '' },
  reactionData: { emoji: '❤️' }
})

const timeHours = ref(0)
const timeMinutes = ref(0)
const timeSeconds = ref(0)

const emojiList = ['❤️', '🔥', '😂', '👍', '👏', '🎉', '😍', '💯']

const eventTypeOptions = [
  { value: 'chat_message', label: '💬 Сообщение в чат' },
  { value: 'show_form', label: '📋 Показать форму' },
  { value: 'hide_form', label: '🚫 Скрыть форму' },
  { value: 'sale_banner', label: '📣 Продажный баннер' },
  { value: 'reaction', label: '❤️ Реакция' },
  { value: 'waiting_room_start', label: '⏳ Начало ожидания' },
  { value: 'stream_start', label: '▶️ Старт стрима' },
  { value: 'finish', label: '🏁 Завершение' }
]

const formOptions = computed(() =>
  props.forms.map((f) => ({ value: f.id, label: f.title || 'Без названия' }))
)

const selectedForm = computed(() => {
  if (!form.formId) return null
  return props.forms.find((f) => f.id === form.formId)
})

const isFormType = computed(() => ['show_form', 'hide_form'].includes(form.eventType))
const isSystemType = computed(() =>
  ['waiting_room_start', 'stream_start', 'finish'].includes(form.eventType)
)

const isValid = computed(() => {
  if (!form.eventType) return false
  if (form.eventType === 'chat_message') {
    return !!(form.chatMessage?.authorName || '').trim() && !!(form.chatMessage?.text || '').trim()
  }
  if (isFormType.value) return !!form.formId
  if (form.eventType === 'sale_banner') return !!(form.bannerData?.title || '').trim()
  if (form.eventType === 'reaction') return !!form.reactionData?.emoji
  return true
})

function actionLabel(action) {
  const map = { thank_you: 'Спасибо', redirect: 'Редирект', payment: 'Оплата' }
  return map[action] || action
}

function reset() {
  form.eventType = 'chat_message'
  form.chatMessage = { authorName: '', text: '', isAdmin: false }
  form.formId = ''
  form.bannerData = { title: '', subtitle: '', buttonText: '', formType: '' }
  form.reactionData = { emoji: '❤️' }
  timeHours.value = 0
  timeMinutes.value = 0
  timeSeconds.value = 0
}

watch(
  () => props.visible,
  (val) => {
    if (val && props.editing) {
      form.eventType = props.editing.eventType
      const sec = props.editing.offsetSeconds || 0
      timeHours.value = Math.floor(sec / 3600)
      timeMinutes.value = Math.floor((sec % 3600) / 60)
      timeSeconds.value = sec % 60

      form.chatMessage = {
        authorName: props.editing.chatMessage?.authorName || '',
        text: props.editing.chatMessage?.text || '',
        isAdmin: props.editing.chatMessage?.isAdmin || false
      }
      if (props.editing.formId) {
        form.formId =
          typeof props.editing.formId === 'object' ? props.editing.formId.id : props.editing.formId
      }
      form.bannerData = {
        title: props.editing.bannerData?.title || '',
        subtitle: props.editing.bannerData?.subtitle || '',
        buttonText: props.editing.bannerData?.buttonText || '',
        formType: props.editing.bannerData?.formType || ''
      }
      form.reactionData = {
        emoji: props.editing.reactionData?.emoji || '❤️'
      }
    } else if (val) {
      reset()
    }
  }
)

async function save() {
  if (!isValid.value) return
  saving.value = true

  const offsetSeconds =
    (timeHours.value || 0) * 3600 + (timeMinutes.value || 0) * 60 + (timeSeconds.value || 0)

  const payload = {
    autowebinarId: props.autowebinarId,
    offsetSeconds,
    eventType: form.eventType
  }

  if (form.eventType === 'chat_message') {
    payload.chatMessage = { ...form.chatMessage }
  }
  if (isFormType.value && form.formId) {
    payload.formId = form.formId
    const f = props.forms.find((f) => f.id === form.formId)
    if (f) {
      payload.formSnapshot = {
        title: f.title,
        subtitle: f.subtitle,
        buttonText: f.buttonText,
        buttonColor: f.buttonColor,
        fields: f.fields,
        submitAction: f.submitAction,
        thankYouTitle: f.thankYouTitle,
        thankYouText: f.thankYouText,
        redirectUrl: f.redirectUrl,
        paymentAmount: f.paymentAmount,
        paymentCurrency: f.paymentCurrency,
        paymentDescription: f.paymentDescription
      }
    }
  }
  if (form.eventType === 'sale_banner') {
    payload.bannerData = { ...form.bannerData }
  }
  if (form.eventType === 'reaction') {
    payload.reactionData = { ...form.reactionData }
  }

  emit('save', { payload, editingId: props.editing?.id || null })
  saving.value = false
}
</script>

<style scoped>
.se-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.se-modal {
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
}

.se-modal--wide {
  max-width: 620px;
}

.se-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wr-border-light);
}

.se-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wr-text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.se-close-btn:hover {
  background: var(--wr-hover-bg);
  color: var(--wr-text-primary);
}

.se-modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.se-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
}

.se-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.se-field--time {
  min-width: 200px;
}

.se-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--wr-text-secondary);
}

.se-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}

.se-input:focus {
  border-color: #f8005b;
  box-shadow: 0 0 0 3px rgba(248, 0, 91, 0.1);
}

.se-textarea {
  resize: vertical;
  min-height: 60px;
}

.se-time-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.se-time-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.se-time-input {
  width: 48px;
  padding: 8px 4px;
  text-align: center;
  border-radius: 10px;
  border: 1.5px solid var(--wr-input-border);
  background: var(--wr-input-bg);
  color: var(--wr-text-primary);
  font-size: 14px;
  font-family: monospace;
  outline: none;
  transition: all 0.2s;
}

.se-time-input:focus {
  border-color: #f8005b;
  box-shadow: 0 0 0 3px rgba(248, 0, 91, 0.1);
}

.se-time-input::-webkit-inner-spin-button {
  display: none;
}

.se-time-label {
  font-size: 9px;
  color: var(--wr-text-muted);
}

.se-time-sep {
  font-size: 16px;
  color: var(--wr-text-muted);
  font-weight: bold;
  padding-bottom: 14px;
}

.se-check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--wr-text-secondary);
  cursor: pointer;
}

.se-checkbox {
  accent-color: #f8005b;
}

.se-emoji-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.se-emoji-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid var(--wr-border);
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.se-emoji-btn:hover {
  border-color: var(--wr-border-hover);
  background: var(--wr-hover-bg);
}

.se-emoji-btn--active {
  border-color: #f8005b;
  background: rgba(248, 0, 91, 0.1);
  box-shadow: 0 0 0 2px rgba(248, 0, 91, 0.2);
}

.se-form-preview {
  border: 1px solid var(--wr-border-light);
  border-radius: 10px;
  overflow: hidden;
}

.se-preview-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--wr-text-tertiary);
  background: var(--wr-hover-bg);
  border-bottom: 1px solid var(--wr-border-light);
}

.se-preview-body {
  padding: 10px 12px;
}

.se-preview-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--wr-text-primary);
  margin-bottom: 6px;
}

.se-preview-fields {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.se-preview-field {
  font-size: 11px;
  color: var(--wr-text-secondary);
  display: flex;
  align-items: center;
}

.se-preview-action {
  font-size: 11px;
  color: var(--wr-text-tertiary);
}

.se-notice {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  font-size: 12px;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.se-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--wr-border-light);
}

.se-btn-cancel {
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid var(--wr-border);
  background: transparent;
  color: var(--wr-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.se-btn-cancel:hover {
  background: var(--wr-hover-bg);
  color: var(--wr-text-primary);
}

.se-btn-save {
  padding: 8px 20px;
  border-radius: 10px;
  border: none;
  background: #f8005b;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
}

.se-btn-save:hover:not(:disabled) {
  background: #d4004d;
}

.se-btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<style>
.modal-fade-enter-active {
  transition: opacity 0.2s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
