<template>
  <div class="order-t-form-field">
    <label
      class="order-t-field-label block text-sm font-semibold mb-2 flex items-center"
      style="color: var(--color-text)"
    >
      <i class="fas fa-phone mr-2" style="color: var(--color-text-secondary)"></i>
      Телефон
    </label>
    <input
      :id="inputId"
      ref="phoneInput"
      type="tel"
      class="input"
      placeholder="123 456-78-90"
      :required="required"
      :disabled="disabled"
      @keypress="handlePhoneKeypress"
      @paste="handlePhonePaste"
    />
    <p class="text-xs mt-1.5 ml-1" style="color: #999999">
      Выберите страну и введите номер телефона
    </p>
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

withDefaults(
  defineProps<{
    disabled?: boolean
    required?: boolean
    inputId?: string
  }>(),
  {
    disabled: false,
    required: true,
    inputId: 'order-t-phone'
  }
)

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

function getNumber(): string {
  return iti?.getNumber() ?? ''
}

function isValidNumber(): boolean {
  return iti?.isValidNumber() ?? false
}

function isReady(): boolean {
  return iti !== null
}

function clearInput(): void {
  if (phoneInput.value) {
    phoneInput.value.value = ''
  }
}

defineExpose({
  getNumber,
  isValidNumber,
  isReady,
  clearInput
})
</script>

<style scoped>
.order-t-form-field {
  flex: 1;
  min-width: 0;
}

.order-t-field-label {
  font-family: inherit;
}

/* intl-tel-input */
:deep(.iti) {
  width: 100%;
  position: relative;
  z-index: 1;
}

:deep(.iti--allow-dropdown),
:deep(.iti--separate-dial-code),
:deep(.iti.iti--show-flags) {
  width: 100%;
}

:deep(.iti--container) {
  z-index: 9999 !important;
}

:deep(.iti__input) {
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

:deep(.iti__input:focus) {
  outline: none !important;
  border-color: var(--color-primary) !important;
  box-shadow: var(--shadow-md) !important;
}

:deep(.iti__input:hover) {
  border-color: var(--color-primary-dark) !important;
}

:deep(.iti__input::placeholder) {
  color: #999999 !important;
}

:deep(.iti__input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

:deep(.iti__selected-flag) {
  padding: 0 0 0 1rem !important;
  background: transparent !important;
}

:deep(.iti__flag-container) {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

:deep(.iti__selected-dial-code) {
  color: var(--color-text) !important;
  font-weight: 500;
  margin-left: 0.5rem;
}

:deep(.iti__country-list) {
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

:deep(.iti__country) {
  padding: 0.75rem 1rem !important;
  color: var(--color-text) !important;
  transition: var(--transition) !important;
}

:deep(.iti__country:hover) {
  background: rgba(212, 184, 150, 0.1) !important;
}

:deep(.iti__country.iti__highlight) {
  background: rgba(212, 184, 150, 0.15) !important;
}

:deep(.iti__dial-code) {
  color: var(--color-text-secondary) !important;
}

:deep(.iti__country-name) {
  color: var(--color-text) !important;
  margin-right: 0.5rem !important;
}

:deep(.iti__search-input) {
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

:deep(.iti__search-input:focus) {
  outline: none !important;
  border-color: var(--color-primary) !important;
}

:deep(.iti__arrow) {
  border-top-color: var(--color-text-secondary) !important;
  margin-left: 0.5rem !important;
}

:deep(.iti__arrow--up) {
  border-bottom-color: var(--color-text-secondary) !important;
}

@media (max-width: 640px) {
  :deep(.iti__input) {
    padding: 0.875rem 1rem !important;
    padding-left: 55px !important;
    font-size: 0.9375rem !important;
  }

  :deep(.iti__country-list) {
    max-height: 250px !important;
  }
}
</style>
