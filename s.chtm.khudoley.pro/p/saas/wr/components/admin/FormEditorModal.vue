<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="form-editor-overlay" @click.self="$emit('close')">
        <div class="form-editor-modal">
          <div class="form-editor-header">
            <h4 class="wr-text-primary font-semibold text-base">
              {{ editingForm ? 'Редактировать форму' : 'Новая форма' }}
            </h4>
            <button type="button" @click="$emit('close')" class="admin-icon-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="form-editor-body">
            <div>
              <label class="block wr-text-secondary text-xs font-medium mb-1"
                >Заголовок формы *</label
              >
              <input
                v-model="editorForm.title"
                type="text"
                placeholder="Оставьте заявку"
                class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-1"
                  >Текст кнопки *</label
                >
                <input
                  v-model="editorForm.buttonText"
                  type="text"
                  placeholder="Оставить заявку"
                  class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
                />
              </div>
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-1">Цвет кнопки</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="editorForm.buttonColor"
                    type="color"
                    class="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    v-model="editorForm.buttonColor"
                    type="text"
                    placeholder="#f8005b"
                    class="input-modern flex-1 px-3 py-2 rounded-lg wr-text-primary text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block wr-text-secondary text-xs font-medium">Поля формы</label>
                <button
                  type="button"
                  @click="addField"
                  class="text-primary text-xs font-semibold hover:underline"
                >
                  <i class="fas fa-plus mr-1"></i>Добавить поле
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(field, idx) in editorForm.fields"
                  :key="field.id"
                  class="flex flex-col sm:flex-row items-start gap-2 p-3 rounded-lg"
                  style="background: var(--wr-input-bg)"
                >
                  <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      v-model="field.label"
                      type="text"
                      placeholder="Название"
                      class="input-modern px-2 py-1.5 rounded text-xs wr-text-primary"
                    />
                    <CustomSelect
                      :modelValue="field.type"
                      @update:modelValue="field.type = $event"
                      :options="fieldTypeOptions"
                      size="xs"
                    />
                    <input
                      v-if="!['select', 'radio', 'checkbox'].includes(field.type)"
                      v-model="field.placeholder"
                      type="text"
                      placeholder="Подсказка (необяз.)"
                      class="input-modern sm:col-span-2 px-2 py-1.5 rounded text-xs wr-text-primary"
                    />
                    <textarea
                      v-if="['select', 'radio'].includes(field.type)"
                      v-model="field.options"
                      placeholder="Варианты (каждый с новой строки)"
                      rows="2"
                      class="input-modern sm:col-span-2 px-2 py-1.5 rounded text-xs wr-text-primary resize-none"
                    ></textarea>
                  </div>
                  <div
                    class="flex sm:flex-col items-center gap-2 sm:gap-1 sm:pt-1 w-full sm:w-auto"
                  >
                    <CustomCheckbox
                      v-if="field.type !== 'checkbox'"
                      :modelValue="field.required"
                      @update:modelValue="field.required = $event"
                    >
                      <span class="wr-text-tertiary text-[10px]">Обяз.</span>
                    </CustomCheckbox>
                    <button
                      type="button"
                      @click="removeField(idx)"
                      class="wr-text-tertiary hover:wr-text-primary text-xs"
                      title="Удалить"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label class="block wr-text-secondary text-xs font-medium mb-1"
                >Действие после заполнения *</label
              >
              <CustomSelect
                v-model="editorForm.submitAction"
                :options="submitActionOptions"
                size="sm"
              />
            </div>

            <div
              v-if="editorForm.submitAction === 'thank_you'"
              class="space-y-3 pl-3"
              style="border-left: 2px solid var(--wr-border)"
            >
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-1">Заголовок</label>
                <input
                  v-model="editorForm.thankYouTitle"
                  type="text"
                  placeholder="Спасибо!"
                  class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
                />
              </div>
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-1">Текст</label>
                <textarea
                  v-model="editorForm.thankYouText"
                  rows="2"
                  placeholder="Ваша заявка принята"
                  class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm resize-none"
                ></textarea>
              </div>
            </div>

            <div
              v-if="editorForm.submitAction === 'redirect'"
              class="pl-3"
              style="border-left: 2px solid var(--wr-border)"
            >
              <label class="block wr-text-secondary text-xs font-medium mb-1"
                >URL для перенаправления *</label
              >
              <input
                v-model="editorForm.redirectUrl"
                type="url"
                placeholder="https://..."
                class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
              />
            </div>

            <div
              v-if="editorForm.submitAction === 'payment'"
              class="space-y-3 pl-3"
              style="border-left: 2px solid var(--wr-border)"
            >
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block wr-text-secondary text-xs font-medium mb-1"
                    >Сумма оплаты *</label
                  >
                  <input
                    v-model.number="editorForm.paymentAmount"
                    type="number"
                    min="1"
                    placeholder="1000"
                    class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
                  />
                </div>
                <div>
                  <label class="block wr-text-secondary text-xs font-medium mb-1"
                    >Старая цена</label
                  >
                  <input
                    v-model.number="editorForm.paymentOldPrice"
                    type="number"
                    min="0"
                    placeholder="2000"
                    class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
                  />
                </div>
                <div>
                  <label class="block wr-text-secondary text-xs font-medium mb-1">Валюта</label>
                  <CustomSelect
                    v-model="editorForm.paymentCurrency"
                    :options="currencyOptions"
                    size="sm"
                  />
                </div>
              </div>
              <p
                v-if="editorForm.paymentOldPrice && editorForm.paymentAmount"
                class="wr-text-tertiary text-xs"
              >
                Превью:
                <span style="text-decoration: line-through; opacity: 0.6">{{
                  formatPrice(editorForm.paymentOldPrice, editorForm.paymentCurrency)
                }}</span>
                →
                <span class="font-bold" style="color: #f8005b">{{
                  formatPrice(editorForm.paymentAmount, editorForm.paymentCurrency)
                }}</span>
              </p>
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-1"
                  >Описание платежа</label
                >
                <input
                  v-model="editorForm.paymentDescription"
                  type="text"
                  placeholder="Оплата участия"
                  class="input-modern w-full px-3 py-2 rounded-lg wr-text-primary text-sm"
                />
              </div>
              <div>
                <label class="block wr-text-secondary text-xs font-medium mb-2"
                  >Способы оплаты</label
                >
                <PaymentProvidersSelector
                  v-model="editorForm.paymentProviders"
                  :providers="availableProviders"
                  :loading="loadingProviders"
                  :columns="2"
                />
              </div>
            </div>

            <div v-if="editorError" class="wr-status-red text-xs">{{ editorError }}</div>
          </div>

          <div class="form-editor-footer">
            <button
              type="button"
              @click="$emit('close')"
              class="wr-text-tertiary hover:wr-text-primary text-sm px-4 py-2 transition"
            >
              Отмена
            </button>
            <button
              type="button"
              @click="saveForm"
              :disabled="editorSaving"
              class="btn-primary text-white font-semibold px-6 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <i v-if="editorSaving" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ editorSaving ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { apiPaymentProvidersRoute } from '../../api/forms'
import { apiFormCreateRoute, apiFormUpdateRoute } from '../../api/forms-admin-routes'
import CustomSelect from '../CustomSelect.vue'
import CustomCheckbox from '../CustomCheckbox.vue'
import PaymentProvidersSelector from './PaymentProvidersSelector.vue'

const fieldTypeOptions = [
  { value: 'text', label: 'Текст' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Телефон' },
  { value: 'firstName', label: 'Имя' },
  { value: 'lastName', label: 'Фамилия' },
  { value: 'fullName', label: 'ФИО' },
  { value: 'number', label: 'Число' },
  { value: 'url', label: 'Ссылка' },
  { value: 'date', label: 'Дата' },
  { value: 'textarea', label: 'Многострочный текст' },
  { value: 'select', label: 'Выпадающий список' },
  { value: 'radio', label: 'Радио-кнопки' },
  { value: 'checkbox', label: 'Галочка' }
]

const submitActionOptions = [
  { value: 'thank_you', label: 'Показать страницу «Спасибо»' },
  { value: 'redirect', label: 'Перенаправить по ссылке' },
  { value: 'payment', label: 'Перейти к оплате' }
]

const currencyOptions = [
  { value: 'RUB', label: 'RUB (₽)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' }
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  editingForm: { type: Object, default: null }
})

const emit = defineEmits(['close', 'saved'])

const editorSaving = ref(false)
const editorError = ref('')
const loadingProviders = ref(false)
const availableProviders = ref([])

function makeFieldId() {
  return 'f_' + Math.random().toString(36).slice(2, 8)
}

const defaultEditorForm = () => ({
  title: '',
  buttonText: 'Оставить заявку',
  buttonColor: '#f8005b',
  fields: [
    {
      id: makeFieldId(),
      type: 'text',
      label: 'Имя',
      placeholder: 'Ваше имя',
      required: true,
      options: ''
    },
    {
      id: makeFieldId(),
      type: 'email',
      label: 'Email',
      placeholder: 'email@example.com',
      required: true,
      options: ''
    },
    {
      id: makeFieldId(),
      type: 'phone',
      label: 'Телефон',
      placeholder: '+7 (900) 000-00-00',
      required: false,
      options: ''
    }
  ],
  submitAction: 'thank_you',
  thankYouTitle: 'Спасибо!',
  thankYouText: 'Ваша заявка принята',
  redirectUrl: '',
  paymentAmount: null,
  paymentOldPrice: null,
  paymentCurrency: 'RUB',
  paymentDescription: '',
  paymentProviders: []
})

const editorForm = reactive(defaultEditorForm())

onMounted(async () => {
  loadingProviders.value = true
  try {
    const result = await apiPaymentProvidersRoute.run(ctx)
    const configured = (result.configured || []).map((p) => ({ ...p, _configured: true }))
    const notConfigured = (result.notConfigured || []).map((p) => ({ ...p, _configured: false }))
    availableProviders.value = [...configured, ...notConfigured]
  } catch (e) {
    console.error('Failed to load payment providers:', e)
  }
  loadingProviders.value = false
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      editorError.value = ''
      if (props.editingForm) {
        Object.assign(editorForm, {
          title: props.editingForm.title,
          buttonText: props.editingForm.buttonText,
          buttonColor: props.editingForm.buttonColor || '#f8005b',
          fields: (props.editingForm.fields || []).map((field) => ({
            ...field,
            options: field.options || ''
          })),
          submitAction: props.editingForm.submitAction || 'thank_you',
          thankYouTitle: props.editingForm.thankYouTitle || '',
          thankYouText: props.editingForm.thankYouText || '',
          redirectUrl: props.editingForm.redirectUrl || '',
          paymentAmount: props.editingForm.paymentAmount || null,
          paymentOldPrice: props.editingForm.paymentOldPrice || null,
          paymentCurrency: props.editingForm.paymentCurrency || 'RUB',
          paymentDescription: props.editingForm.paymentDescription || '',
          paymentProviders: props.editingForm.paymentProviders || []
        })
      } else {
        // Новая форма - подставляем дефолтные провайдеры
        const savedDefaults = localStorage.getItem('webinar-default-payment-providers')
        const defaultPaymentProviders = savedDefaults ? JSON.parse(savedDefaults) : []

        Object.assign(editorForm, {
          ...defaultEditorForm(),
          paymentProviders: defaultPaymentProviders
        })
      }
    }
  }
)

function formatPrice(amount, currency) {
  const symbols = { RUB: '₽', USD: '$', EUR: '€' }
  return `${amount} ${symbols[currency] || currency}`
}

function addField() {
  editorForm.fields.push({
    id: makeFieldId(),
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: ''
  })
}

function removeField(idx) {
  editorForm.fields.splice(idx, 1)
}

async function saveForm() {
  editorError.value = ''
  if (!editorForm.title.trim()) {
    editorError.value = 'Укажите заголовок формы'
    return
  }
  if (!editorForm.buttonText.trim()) {
    editorError.value = 'Укажите текст кнопки'
    return
  }
  if (editorForm.fields.length === 0) {
    editorError.value = 'Добавьте хотя бы одно поле'
    return
  }
  if (editorForm.submitAction === 'redirect' && !editorForm.redirectUrl) {
    editorError.value = 'Укажите URL для перенаправления'
    return
  }
  if (
    editorForm.submitAction === 'payment' &&
    (!editorForm.paymentAmount || editorForm.paymentAmount <= 0)
  ) {
    editorError.value = 'Укажите сумму оплаты'
    return
  }

  editorSaving.value = true
  try {
    const payload = {
      title: editorForm.title,
      buttonText: editorForm.buttonText,
      buttonColor: editorForm.buttonColor || undefined,
      fields: editorForm.fields,
      submitAction: editorForm.submitAction,
      thankYouTitle: editorForm.thankYouTitle || undefined,
      thankYouText: editorForm.thankYouText || undefined,
      redirectUrl: editorForm.redirectUrl || undefined,
      paymentAmount: editorForm.paymentAmount || undefined,
      paymentOldPrice: editorForm.paymentOldPrice || undefined,
      paymentCurrency: editorForm.paymentCurrency || undefined,
      paymentDescription: editorForm.paymentDescription || undefined,
      paymentProviders:
        editorForm.paymentProviders.length > 0 ? editorForm.paymentProviders : undefined
    }

    if (props.editingForm) {
      await apiFormUpdateRoute({ id: props.editingForm.id }).run(ctx, payload)
    } else {
      await apiFormCreateRoute.run(ctx, payload)
    }

    emit('saved')
  } catch (e) {
    editorError.value = e.message
  }
  editorSaving.value = false
}
</script>

<style scoped>
.admin-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  flex-shrink: 0;
}
.admin-icon-btn:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

.form-editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wr-modal-backdrop);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.form-editor-modal {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 16px;
  box-shadow: var(--wr-card-shadow);
  overflow: hidden;
}

@media (max-width: 640px) {
  .form-editor-modal {
    max-height: 95vh;
    max-height: 95dvh;
    border-radius: 16px 16px 0 0;
  }
  .form-editor-overlay {
    align-items: flex-end;
    padding: 0;
  }
}

.form-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wr-border);
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .form-editor-header {
    padding: 16px 20px;
  }
}

.form-editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 640px) {
  .form-editor-body {
    padding: 20px;
  }
}

.form-editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--wr-border);
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .form-editor-footer {
    padding: 16px 20px;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
