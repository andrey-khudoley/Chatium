<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div v-if="show && formData" class="form-popup-overlay" @click.self="$emit('close')">
        <div
          class="form-popup-modal"
          :class="{
            'form-popup-modal--thankyou': submitted,
            'form-popup-modal--with-sidebar': hasBonuses
          }"
        >
          <button type="button" class="form-popup-close" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </button>

          <!-- Thank You state -->
          <div
            v-if="submitted && resultAction === 'thank_you'"
            class="form-popup-body text-center py-10"
          >
            <div class="form-thankyou-icon">
              <i class="fas fa-check"></i>
            </div>
            <h3 class="wr-text-primary font-bold text-xl mb-2">{{ resultThankYouTitle }}</h3>
            <p class="wr-text-tertiary text-sm">{{ resultThankYouText }}</p>
          </div>

          <!-- Form state -->
          <template v-else>
            <div class="form-popup-body">
              <!-- Header -->
              <div class="form-popup-header">
                <h3 class="form-header-title">{{ formData.title }}</h3>
              </div>

              <!-- Form fields -->
              <div class="form-popup-fields">
                <div v-for="field in formData.fields" :key="field.id" class="form-popup-field">
                  <!-- Textarea -->
                  <template v-if="field.type === 'textarea'">
                    <label class="form-label">
                      {{ field.label }}
                      <span v-if="field.required" class="form-label-required">*</span>
                    </label>
                    <textarea
                      v-model="fieldValues[field.id]"
                      :placeholder="field.placeholder"
                      rows="3"
                      class="form-input w-full resize-none"
                      @focus="handleFieldFocus(field)"
                    ></textarea>
                  </template>

                  <!-- Select -->
                  <template v-else-if="field.type === 'select'">
                    <label class="form-label">
                      {{ field.label }}
                      <span v-if="field.required" class="form-label-required">*</span>
                    </label>
                    <CustomSelect
                      :modelValue="fieldValues[field.id]"
                      @update:modelValue="fieldValues[field.id] = $event"
                      :options="getSelectOptions(field)"
                      placeholder="Выберите..."
                      size="lg"
                    />
                  </template>

                  <!-- Radio -->
                  <template v-else-if="field.type === 'radio'">
                    <label class="form-label mb-2">
                      {{ field.label }}
                      <span v-if="field.required" class="form-label-required">*</span>
                    </label>
                    <CustomRadio
                      :modelValue="fieldValues[field.id]"
                      @update:modelValue="fieldValues[field.id] = $event"
                      :options="getFieldOptions(field)"
                    />
                  </template>

                  <!-- Checkbox -->
                  <template v-else-if="field.type === 'checkbox'">
                    <CustomCheckbox
                      :modelValue="fieldValues[field.id]"
                      @update:modelValue="fieldValues[field.id] = $event"
                      :labelHtml="field.label"
                    />
                  </template>

                  <!-- Other inputs -->
                  <template v-else>
                    <label class="form-label">
                      {{ field.label }}
                      <span v-if="field.required" class="form-label-required">*</span>
                    </label>
                    <input
                      v-model="fieldValues[field.id]"
                      :type="getInputType(field.type)"
                      :placeholder="field.placeholder"
                      class="form-input w-full"
                      @focus="handleFieldFocus(field)"
                    />
                  </template>
                </div>

                <div v-if="submitError" class="form-error">
                  <i class="fas fa-exclamation-circle"></i>
                  {{ submitError }}
                </div>
              </div>

              <!-- Footer -->
              <div class="form-popup-footer">
                <button
                  type="button"
                  @click="submitForm"
                  :disabled="submitting"
                  class="form-cta-button"
                  :style="btnStyle"
                >
                  <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
                  <span v-else>{{ buttonText }}</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { apiFormSubmitRoute } from '../../api/forms'
import CustomSelect from '../CustomSelect.vue'
import CustomRadio from '../CustomRadio.vue'
import CustomCheckbox from '../CustomCheckbox.vue'
import {
  trackFormClosed,
  trackFormFieldFocused,
  trackFormSubmitted,
  trackFormPaymentPageOpened
} from '../../shared/use-form-analytics'

const props = defineProps({
  show: { type: Boolean, default: false },
  formData: { type: Object, default: null },
  episodeId: { type: String, default: '' },
  autowebinarId: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submitted'])

const fieldValues = reactive({})
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)
const resultAction = ref('')
const resultThankYouTitle = ref('')
const resultThankYouText = ref('')
const btnColor = computed(() => props.formData?.buttonColor || '#f8005b')
const formInteracted = ref(false)

const buttonText = computed(() => {
  if (submitting.value) return 'Отправка...'
  return props.formData?.buttonText || 'Отправить'
})

const btnStyle = computed(() => ({
  '--btn-color': btnColor.value,
  '--btn-color-dark': darkenHex(btnColor.value, 25),
  '--btn-color-glow': btnColor.value + '66'
}))

function darkenHex(hex, amount) {
  if (!hex) return '#c7004a'
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

watch(
  () => props.show,
  (val, oldVal) => {
    if (val && props.formData) {
      submitted.value = false
      submitError.value = ''
      resultAction.value = ''
      formInteracted.value = false

      for (const field of props.formData.fields || []) {
        if (field.type === 'checkbox') {
          fieldValues[field.id] = false
        } else {
          // Auto-fill from ctx.user
          let initialValue = ''
          if (ctx.user) {
            if (field.type === 'firstName' && ctx.user.firstName) {
              initialValue = ctx.user.firstName
            } else if (field.type === 'lastName' && ctx.user.lastName) {
              initialValue = ctx.user.lastName
            } else if (field.type === 'fullName') {
              const parts = [ctx.user.firstName, ctx.user.middleName, ctx.user.lastName].filter(
                Boolean
              )
              if (parts.length > 0) {
                initialValue = parts.join(' ')
              }
            } else if (field.type === 'email' && ctx.user.confirmedEmail) {
              initialValue = ctx.user.confirmedEmail
            } else if (field.type === 'phone' && ctx.user.confirmedPhone) {
              initialValue = ctx.user.confirmedPhone
            }
          }
          fieldValues[field.id] = initialValue
        }
      }
    }

    const analyticsId = props.episodeId || props.autowebinarId
    if (!val && oldVal && props.formData && analyticsId) {
      trackFormClosed(
        analyticsId,
        props.formData.id,
        props.formData.title,
        props.formData.submitAction
      )
    }
  }
)

function getFieldOptions(field) {
  if (!field.options) return []
  return field.options
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
}

function getSelectOptions(field) {
  return [
    { value: '', label: 'Выберите...' },
    ...getFieldOptions(field).map((o) => ({ value: o, label: o }))
  ]
}

function getInputType(fieldType) {
  if (fieldType === 'phone') return 'tel'
  if (fieldType === 'firstName' || fieldType === 'lastName' || fieldType === 'fullName')
    return 'text'
  return fieldType
}

function handleFieldFocus(field) {
  const analyticsId = props.episodeId || props.autowebinarId
  if (!formInteracted.value && analyticsId && props.formData) {
    formInteracted.value = true
    trackFormFieldFocused(
      analyticsId,
      props.formData.id,
      props.formData.title,
      field.id,
      field.label
    )
  }
}

async function submitForm() {
  submitError.value = ''

  for (const field of props.formData.fields || []) {
    if (field.type === 'checkbox') continue
    if (field.required && !fieldValues[field.id]?.toString().trim()) {
      submitError.value = `Заполните поле «${field.label}»`
      return
    }
  }

  submitting.value = true
  try {
    const data = {}
    for (const field of props.formData.fields || []) {
      const key = field.label.toLowerCase().replace(/\s+/g, '_')
      if (field.type === 'checkbox') {
        data[key] = fieldValues[field.id] ? 'Да' : 'Нет'
      } else {
        data[key] = fieldValues[field.id]
      }
    }

    const result = await apiFormSubmitRoute.run(ctx, {
      formId: props.formData.id,
      episodeId: props.episodeId || undefined,
      autowebinarId: props.autowebinarId || undefined,
      data
    })

    const analyticsId = props.episodeId || props.autowebinarId
    if (result.action === 'direct_payment' && result.paymentLink) {
      if (analyticsId) {
        trackFormPaymentPageOpened(
          analyticsId,
          props.formData.id,
          props.formData.title,
          props.formData.paymentAmount || 0,
          props.formData.paymentCurrency || 'RUB'
        )
      }
      window.location.href = result.paymentLink
    } else if (result.action === 'payment' && result.paymentMethodUrl) {
      if (analyticsId) {
        trackFormPaymentPageOpened(
          analyticsId,
          props.formData.id,
          props.formData.title,
          props.formData.paymentAmount || 0,
          props.formData.paymentCurrency || 'RUB'
        )
      }
      window.location.href = result.paymentMethodUrl
    } else if (result.action === 'redirect' && result.redirectUrl) {
      window.open(result.redirectUrl, '_blank')
      emit('close')
    } else {
      submitted.value = true
      resultAction.value = 'thank_you'
      resultThankYouTitle.value = result.thankYouTitle || 'Спасибо!'
      resultThankYouText.value = result.thankYouText || 'Ваша заявка принята'
    }

    if (analyticsId) {
      trackFormSubmitted(
        analyticsId,
        props.formData.id,
        props.formData.title,
        props.formData.submitAction || 'thank_you',
        props.formData.paymentAmount || 0,
        props.formData.paymentCurrency
      )
    }

    emit('submitted', result)
  } catch (e) {
    submitError.value = e.message
  }
  submitting.value = false
}
</script>

<style scoped>
/* ===== Overlay ===== */
.form-popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wr-modal-backdrop);
  backdrop-filter: blur(8px);
  padding: 16px;
}

/* ===== Modal ===== */
.form-popup-modal {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 24px;
  box-shadow:
    var(--wr-card-shadow),
    0 0 80px rgba(248, 0, 91, 0.08);
  overflow: hidden;
  animation: modalSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .form-popup-modal {
    max-height: 90vh;
    max-height: 90dvh;
    border-radius: 24px 24px 0 0;
  }
  .form-popup-overlay {
    align-items: flex-end;
    padding-bottom: 0;
  }
}

/* ===== Close ===== */
.form-popup-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.15);
  color: var(--wr-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  backdrop-filter: blur(4px);
}
.form-popup-close:hover {
  background: rgba(0, 0, 0, 0.25);
  color: var(--wr-text-primary);
}

/* ===== Body ===== */
.form-popup-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 640px) {
  .form-popup-body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* ===== Header ===== */
.form-popup-header {
  padding: 28px 60px 20px 28px;
}

.form-header-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--wr-text-primary);
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

@media (max-width: 640px) {
  .form-popup-header {
    padding: 24px 52px 16px 20px;
  }
  .form-header-title {
    font-size: 20px;
  }
}

/* ===== Fields ===== */
.form-popup-fields {
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 640px) {
  .form-popup-fields {
    padding: 16px 20px;
    gap: 12px;
    overflow-y: visible;
    flex: none;
  }
}

.form-popup-field {
  display: flex;
  flex-direction: column;
}

/* Labels */
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--wr-text-secondary);
  margin-bottom: 6px;
}

.form-label-required {
  color: #f8005b;
  margin-left: 2px;
}

/* Inputs */
.form-input {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 15px;
  color: var(--wr-text-primary);
  background: var(--wr-input-bg);
  border: 1.5px solid var(--wr-input-border);
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  background: var(--wr-input-focus-bg);
  border-color: #f8005b;
  box-shadow: 0 0 0 3px rgba(248, 0, 91, 0.12);
}

.form-input::placeholder {
  color: var(--wr-text-muted);
}

/* Error */
.form-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
}

/* ===== Footer ===== */
.form-popup-footer {
  padding: 4px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 640px) {
  .form-popup-footer {
    padding: 4px 20px 20px;
  }
}

/* ===== CTA Button ===== */
.form-cta-button {
  width: 100%;
  padding: 14px 24px;
  min-height: 52px;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, var(--btn-color) 0%, var(--btn-color-dark) 100%);
  box-shadow: 0 2px 12px var(--btn-color-glow);
}

.form-cta-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px var(--btn-color-glow);
}

.form-cta-button:active {
  transform: translateY(0);
}

.form-cta-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ===== Thank You icon ===== */
.form-thankyou-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26px;
  box-shadow: 0 8px 30px rgba(16, 185, 129, 0.3);
  animation: thankYouPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes thankYouPop {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== Transitions ===== */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.3s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}
</style>
