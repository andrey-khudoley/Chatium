<template>
  <div class="gradient-bg min-h-screen flex items-center justify-center form-container">
    <div class="decorative-element decorative-element-1"></div>
    <div class="decorative-element decorative-element-2"></div>

    <div class="form-wrapper">
      <div class="card">
        <div class="form-header">
          <div class="icon-wrapper">
            <div class="icon-container">
              <i class="fas fa-clipboard-list text-3xl" style="color: var(--color-text)"></i>
            </div>
          </div>

          <div class="header-text">
            <h1 class="form-title" style="color: var(--color-text)">Заказать</h1>
          </div>
        </div>

        <div class="currency-switcher">
          <button
            v-for="c in currencies"
            :key="c"
            type="button"
            class="currency-option"
            :class="{ active: selectedCurrency === c }"
            @click="selectedCurrency = c"
          >
            {{ c }}
          </button>
        </div>

        <form class="form-content" @submit.prevent="handleSubmit">
          <div class="form-fields">
            <div class="form-field">
              <label
                class="field-label block text-sm font-semibold mb-2 flex items-center"
                style="color: var(--color-text)"
              >
                <i class="fas fa-user mr-2" style="color: var(--color-text-secondary)"></i>
                Ваше имя
              </label>
              <input
                v-model="form.name"
                type="text"
                class="input"
                placeholder="Например: Иван"
                required
                :disabled="loading"
              />
            </div>

            <div class="form-field">
              <label
                class="field-label block text-sm font-semibold mb-2 flex items-center"
                style="color: var(--color-text)"
              >
                <i class="fas fa-envelope mr-2" style="color: var(--color-text-secondary)"></i>
                Email
              </label>
              <input
                v-model="form.email"
                type="email"
                class="input"
                placeholder="Например: ivan@example.com"
                required
                :disabled="loading"
              />
            </div>

            <div class="form-field">
              <label
                class="field-label block text-sm font-semibold mb-2 flex items-center"
                style="color: var(--color-text)"
              >
                <i class="fas fa-phone mr-2" style="color: var(--color-text-secondary)"></i>
                Телефон
              </label>
              <input
                id="order-phone"
                ref="phoneInput"
                type="tel"
                class="input"
                placeholder="123 456-78-90"
                required
                :disabled="loading"
                @keypress="handlePhoneKeypress"
                @paste="handlePhonePaste"
              />
              <p class="text-xs mt-1.5 ml-1" style="color: #999999">
                Выберите страну и введите номер телефона
              </p>
            </div>
          </div>

          <div v-if="success" class="message-box success-message">
            <div class="flex items-center gap-3">
              <i class="fas fa-check-circle text-2xl" style="color: var(--color-success)"></i>
              <div>
                <p class="font-semibold" style="color: var(--color-text)">Отлично!</p>
                <p class="text-sm" style="color: var(--color-text-secondary)">Заявка отправлена</p>
              </div>
            </div>
          </div>

          <div v-if="error" class="message-box error-message">
            <div class="flex items-center gap-3">
              <i
                class="fas fa-exclamation-triangle text-2xl"
                style="color: var(--color-danger)"
              ></i>
              <div>
                <p class="font-semibold" style="color: var(--color-text)">Ошибка</p>
                <p class="text-sm" style="color: var(--color-text-secondary)">{{ error }}</p>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary submit-button" :disabled="loading">
            <i v-if="loading" class="fas fa-spinner animate-spin mr-3"></i>
            <i v-else class="fas fa-arrow-right mr-3"></i>
            {{ loading ? 'Отправка...' : 'Отправить заявку' }}
          </button>

          <div class="form-footer">
            <div class="flex items-center justify-center gap-2 text-sm">
              <i class="fas fa-lock" style="color: var(--color-text-secondary)"></i>
              <span style="color: var(--color-text-secondary)">Ваши данные в безопасности</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

declare global {
  interface Window {
    intlTelInput?: (el: HTMLElement, opts: Record<string, unknown>) => IntlTelInputInstance
  }
}

type IntlTelInputInstance = {
  destroy: () => void
  getNumber: () => string
  getSelectedCountryData: () => unknown
  isValidNumber: () => boolean
}

const currencies = ['RUB', 'EUR', 'UAH'] as const
const selectedCurrency = ref<(typeof currencies)[number]>('EUR')

const form = ref({
  name: '',
  email: ''
})

const loading = ref(false)
const success = ref(false)
const error = ref<string | null>(null)
const phoneInput = ref<HTMLInputElement | null>(null)
let iti: IntlTelInputInstance | null = null

onMounted(() => {
  const el = phoneInput.value
  if (el && window.intlTelInput) {
    iti = window.intlTelInput(el, {
      initialCountry: 'ru',
      preferredCountries: ['ru', 'kz', 'by', 'ua', 'us'],
      separateDialCode: true,
      autoPlaceholder: 'off',
      formatOnDisplay: true,
      nationalMode: false,
      strictMode: true,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.12/build/js/utils.js'
    })
    el.addEventListener('input', handlePhoneInput)
  }
})

onBeforeUnmount(() => {
  if (iti) {
    iti.destroy()
    iti = null
  }
  const el = phoneInput.value
  if (el) {
    el.removeEventListener('input', handlePhoneInput)
  }
})

function handlePhoneKeypress(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const k = event.key
  if (k.length === 1 && !/\d/.test(k)) {
    event.preventDefault()
  }
}

function handlePhonePaste(event: ClipboardEvent) {
  event.preventDefault()
  const pastedText = (
    event.clipboardData || (window as unknown as { clipboardData: DataTransfer }).clipboardData
  ).getData('text')
  const digitsOnly = pastedText.replace(/\D/g, '')
  const input = phoneInput.value
  if (digitsOnly && input) {
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const currentValue = input.value
    input.value = currentValue.substring(0, start) + digitsOnly + currentValue.substring(end)
    if (iti) {
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

function handlePhoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\D/g, '')
  const maxLength = 15
  if (value.length > maxLength) {
    value = value.substring(0, maxLength)
    input.value = value
  }
}

async function handleSubmit() {
  loading.value = true
  success.value = false
  error.value = null

  try {
    if (!form.value.name.trim()) {
      throw new Error('Пожалуйста, введите ваше имя')
    }
    if (!form.value.email.trim()) {
      throw new Error('Пожалуйста, введите email')
    }
    if (!iti) {
      throw new Error('Ошибка инициализации поля телефона')
    }
    const phoneNumber = iti.getNumber()
    if (!phoneNumber) {
      throw new Error('Пожалуйста, введите телефон')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      throw new Error('Пожалуйста, введите корректный email')
    }
    if (!iti.isValidNumber()) {
      throw new Error('Пожалуйста, введите корректный номер телефона')
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    success.value = true
    setTimeout(() => {
      form.value = { name: '', email: '' }
      if (phoneInput.value) {
        phoneInput.value.value = ''
      }
      success.value = false
    }, 2000)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
    setTimeout(() => {
      error.value = null
    }, 5000)
  } finally {
    loading.value = false
  }
}
</script>

<style>
.form-container {
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.decorative-element {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.decorative-element-1 {
  top: 10%;
  left: 5%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(212, 184, 150, 0.08) 0%, transparent 70%);
}

.decorative-element-2 {
  bottom: 10%;
  right: 5%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(200, 168, 128, 0.06) 0%, transparent 70%);
}

.form-wrapper {
  width: 90%;
  max-width: 520px;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (min-width: 768px) {
  .form-wrapper {
    width: 70%;
    max-width: 700px;
  }
}

@media (min-width: 1200px) {
  .form-wrapper {
    width: 50%;
    max-width: 800px;
  }
}

@media (min-width: 1600px) {
  .form-wrapper {
    max-width: 900px;
  }
}

.form-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.icon-container {
  width: 80px;
  height: 80px;
  border-radius: 1rem;
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-button-light);
}

.header-text {
  text-align: center;
}

.form-title {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.currency-switcher {
  display: flex;
  width: 100%;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.currency-option {
  flex: 1;
  padding: 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.currency-option:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.currency-option:hover {
  background: var(--color-button-light);
}

.currency-option.active {
  background: var(--color-primary);
  color: #fff;
}

.form-content {
  display: flex;
  flex-direction: column;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.form-field {
  flex: 1;
  min-width: 0;
}

.message-box {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid;
  margin-bottom: 1.25rem;
}

.success-message {
  background: rgba(122, 155, 92, 0.1);
  border-color: var(--color-success);
}

.error-message {
  background: rgba(184, 92, 92, 0.1);
  border-color: var(--color-danger);
}

.submit-button {
  width: 100%;
  font-size: 1.125rem;
}

.form-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 640px) {
  .form-container {
    padding: 0.5rem;
  }

  .form-title {
    font-size: 1.5rem;
  }

  .icon-container {
    width: 60px;
    height: 60px;
  }

  .form-fields {
    gap: 1rem;
  }

  .submit-button {
    font-size: 1rem;
    padding: 1rem 2rem;
  }
}

/* intl-tel-input */
.iti {
  width: 100%;
  position: relative;
  z-index: 1;
}

.iti--allow-dropdown,
.iti--separate-dial-code,
.iti.iti--show-flags {
  width: 100%;
}

.iti--container {
  z-index: 9999 !important;
}

.iti__input {
  width: 100%;
  padding: 1rem 1.25rem !important;
  padding-left: 60px !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.75rem !important;
  background: var(--color-bg-card) !important;
  color: var(--color-text) !important;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif !important;
  font-size: 1rem !important;
  transition: var(--transition) !important;
  box-shadow: var(--shadow-sm) !important;
  line-height: 1.5 !important;
}

.iti__input:focus {
  outline: none !important;
  border-color: var(--color-primary) !important;
  box-shadow: var(--shadow-md) !important;
}

.iti__input:hover {
  border-color: var(--color-primary-dark) !important;
}

.iti__input::placeholder {
  color: #999999 !important;
}

.iti__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.iti__selected-flag {
  padding: 0 0 0 1rem !important;
  background: transparent !important;
}

.iti__flag-container {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.iti__selected-dial-code {
  color: var(--color-text) !important;
  font-weight: 500;
  margin-left: 0.5rem;
}

.iti__country-list {
  background: var(--color-bg-card) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.75rem !important;
  box-shadow: var(--shadow-lg) !important;
  max-height: 300px !important;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif !important;
  z-index: 9999 !important;
}

.iti__country {
  padding: 0.75rem 1rem !important;
  color: var(--color-text) !important;
  transition: var(--transition) !important;
}

.iti__country:hover {
  background: rgba(212, 184, 150, 0.1) !important;
}

.iti__country.iti__highlight {
  background: rgba(212, 184, 150, 0.15) !important;
}

.iti__dial-code {
  color: var(--color-text-secondary) !important;
}

.iti__country-name {
  color: var(--color-text) !important;
  margin-right: 0.5rem !important;
}

.iti__search-input {
  padding: 0.75rem 1rem !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.5rem !important;
  background: var(--color-bg-card) !important;
  color: var(--color-text) !important;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif !important;
  margin: 0.5rem !important;
  width: calc(100% - 1rem) !important;
}

.iti__search-input:focus {
  outline: none !important;
  border-color: var(--color-primary) !important;
}

.iti__arrow {
  border-top-color: var(--color-text-secondary) !important;
  margin-left: 0.5rem !important;
}

.iti__arrow--up {
  border-bottom-color: var(--color-text-secondary) !important;
}

@media (max-width: 640px) {
  .iti__input {
    padding: 0.875rem 1rem !important;
    padding-left: 55px !important;
    font-size: 0.9375rem !important;
  }

  .iti__country-list {
    max-height: 250px !important;
  }
}
</style>
