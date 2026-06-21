<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  sendSmsCode,
  confirmSmsCode,
  sendEmailCode,
  confirmEmailCode,
  loginWithPassword,
  handleAuthError,
  formatPhoneNumber,
  isValidPhone,
  isValidEmail
} from '../sdk/auth'
import { apiGetPasswordHashRoute } from '../api/auth-password'

declare global {
  interface Window {
    bootLoaderComplete?: boolean
    IMask?: any
  }
}

const props = defineProps<{
  providers: Record<string, any>
  back: string
  projectTitle: string
  apiUrls: {
    getTelegramOauthUrl: string
  }
}>()

const authMethod = ref<'phone' | 'email'>('phone')
const step = ref<'input' | 'code'>('input')
const bootLoaderDone = ref(false)

const phone = ref('')
const phoneCode = ref('')
const phonePassword = ref('')
const email = ref('')
const emailCode = ref('')
const emailPassword = ref('')
const showPassword = ref(false)

const loading = ref(false)
const error = ref('')
const canResend = ref(false)
let resendTimer: ReturnType<typeof setTimeout> | null = null

// Приветственный курсор
const showWelcomeCursor = ref(true)
const anyFieldFocused = ref(false)

const isPhoneEnabled = computed(() => Object.keys(props.providers).includes('Sms'))
const isEmailEnabled = computed(() => Object.keys(props.providers).includes('Email'))
const isPasswordEnabled = computed(() => Object.keys(props.providers).includes('Password'))
const isTelegramEnabled = computed(() => Object.keys(props.providers).includes('telegram-auth'))

onMounted(() => {
  // Принудительно устанавливаем тёмную тему
  document.documentElement.classList.add('dark')
  localStorage.setItem('theme', 'dark')

  if (!isPhoneEnabled.value && isEmailEnabled.value) {
    authMethod.value = 'email'
  }

  // Ждём завершения bootloader
  const handleBootloaderComplete = () => {
    bootLoaderDone.value = true
  }

  if ((window as any).bootLoaderComplete) {
    handleBootloaderComplete()
  } else {
    window.addEventListener('bootloader-complete', handleBootloaderComplete)
  }
})

onUnmounted(() => {
  clearResendTimer()
})

function handleLoginSuccess() {
  window.location.href = props.back
}

function startResendTimer() {
  canResend.value = false
  resendTimer = setTimeout(() => {
    canResend.value = true
  }, 60000)
}

function clearResendTimer() {
  if (resendTimer) {
    clearTimeout(resendTimer)
    resendTimer = null
  }
  canResend.value = false
}

function onPhoneCodeInput(event: Event) {
  const target = event.target as HTMLInputElement
  phoneCode.value = target.value.replace(/[^0-9]/g, '')
}

function onEmailCodeInput(event: Event) {
  const target = event.target as HTMLInputElement
  emailCode.value = target.value.replace(/[^0-9]/g, '')
}

// Phone auth
async function sendPhoneCode() {
  if (!isValidPhone(phone.value)) {
    error.value = 'Введите корректный номер телефона'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await sendSmsCode(phone.value)
    if (result.success) {
      step.value = 'code'
      startResendTimer()
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при отправке SMS'
  } finally {
    loading.value = false
  }
}

async function confirmPhoneCode() {
  if (phoneCode.value.length < 4) {
    error.value = 'Введите код из 4 цифр'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await confirmSmsCode(phone.value, phoneCode.value)
    if (JSON.stringify(result).includes('authSuccess')) {
      handleLoginSuccess()
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при подтверждении кода'
  } finally {
    loading.value = false
  }
}

async function handlePhonePasswordLogin() {
  if (!isValidPhone(phone.value)) {
    error.value = 'Введите корректный номер телефона'
    return
  }
  if (!phonePassword.value) {
    error.value = 'Введите пароль'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await loginWithPassword(
      'Phone',
      phone.value,
      apiGetPasswordHashRoute.url(),
      phonePassword.value
    )
    if (JSON.stringify(result).includes('authSuccess')) {
      handleLoginSuccess()
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при авторизации'
  } finally {
    loading.value = false
  }
}

// Email auth
async function sendEmailCodeHandler() {
  if (!isValidEmail(email.value)) {
    error.value = 'Введите корректный email'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await sendEmailCode(email.value)
    if (result.success) {
      step.value = 'code'
      startResendTimer()
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при отправке кода'
  } finally {
    loading.value = false
  }
}

async function confirmEmailCodeHandler() {
  if (emailCode.value.length < 6) {
    error.value = 'Введите код из 6 цифр'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await confirmEmailCode(email.value, emailCode.value)
    if (JSON.stringify(result).includes('authSuccess')) {
      handleLoginSuccess()
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при подтверждении кода'
  } finally {
    loading.value = false
  }
}

async function handleEmailPasswordLogin() {
  if (!isValidEmail(email.value)) {
    error.value = 'Введите корректный email'
    return
  }
  if (!emailPassword.value) {
    error.value = 'Введите пароль'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await loginWithPassword(
      'Email',
      email.value,
      apiGetPasswordHashRoute.url(),
      emailPassword.value
    )
    if (JSON.stringify(result).includes('authSuccess')) {
      handleLoginSuccess()
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при авторизации'
  } finally {
    loading.value = false
  }
}

async function handleTelegramLogin() {
  try {
    // ✅ Используем fetch() с URL из props (получен на сервере через .url())
    const response = await fetch(props.apiUrls.getTelegramOauthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ back: props.back })
    })

    const oauthUrl = await response.text()
    window.location.href = oauthUrl
  } catch (err) {
    error.value = 'Ошибка авторизации через Telegram'
  }
}

function goBack() {
  step.value = 'input'
  phoneCode.value = ''
  emailCode.value = ''
  error.value = ''
  clearResendTimer()
}

function handleAnyFocus() {
  anyFieldFocused.value = true
  showWelcomeCursor.value = false
}

function handleAnyBlur() {
  // Небольшая задержка, чтобы проверить, не получило ли фокус другое поле
  setTimeout(() => {
    const activeElement = document.activeElement
    const isAnyInputFocused = activeElement && activeElement.tagName === 'INPUT'
    if (!isAnyInputFocused) {
      anyFieldFocused.value = false
      showWelcomeCursor.value = true
    }
  }, 50)
}

function handlePhoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  const filtered = input.value.replace(/[^\d+]/g, '')
  if (input.value !== filtered) {
    input.value = filtered
    phone.value = filtered
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center relative"
  >
    <div v-if="bootLoaderDone" class="login-card relative z-10">
      <div class="flex justify-center mb-6">
        <div
          class="w-20 h-20 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] flex items-center justify-center login-icon"
        >
          <i class="fab fa-telegram text-3xl text-white"></i>
        </div>
      </div>

      <h1 class="text-2xl font-bold text-center mb-2 text-[var(--color-text)] login-title">
        Вход в систему
      </h1>
      <p class="text-[var(--color-text-secondary)] text-center mb-8 login-subtitle">
        {{ projectTitle }}
      </p>

      <!-- Auth Method Tabs -->
      <div
        v-if="isPhoneEnabled && isEmailEnabled && step === 'input'"
        class="flex mb-6 bg-[var(--color-border)] p-1"
      >
        <button
          @click="
            authMethod = 'phone'
            error = ''
            showWelcomeCursor = true
          "
          :class="[
            'flex-1 py-2 px-4 text-sm font-medium transition-all',
            authMethod === 'phone' ? 'bg-[var(--color-bg-secondary)] shadow-sm' : 'hover:opacity-70'
          ]"
          :style="
            authMethod === 'phone'
              ? 'color: var(--color-accent)'
              : 'color: var(--color-text-secondary)'
          "
        >
          <i class="fas fa-phone mr-2"></i> Телефон
        </button>
        <button
          @click="
            authMethod = 'email'
            error = ''
            showWelcomeCursor = true
          "
          :class="[
            'flex-1 py-2 px-4 text-sm font-medium transition-all',
            authMethod === 'email' ? 'bg-[var(--color-bg-secondary)] shadow-sm' : 'hover:opacity-70'
          ]"
          :style="
            authMethod === 'email'
              ? 'color: var(--color-accent)'
              : 'color: var(--color-text-secondary)'
          "
        >
          <i class="fas fa-envelope mr-2"></i> Email
        </button>
      </div>

      <!-- Phone Auth -->
      <div v-if="authMethod === 'phone' && isPhoneEnabled">
        <div v-if="step === 'input'">
          <div class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
              <i class="fas fa-phone mr-2" style="color: var(--color-accent)"></i>
              Номер телефона
            </label>
            <div class="relative">
              <input
                v-model="phone"
                type="tel"
                class="input w-full terminal-input"
                :disabled="loading"
                @input="handlePhoneInput"
                @focus="handleAnyFocus"
                @blur="handleAnyBlur"
                @keyup.enter="
                  isPasswordEnabled && phonePassword ? handlePhonePasswordLogin() : sendPhoneCode()
                "
              />
              <span
                v-if="showWelcomeCursor && authMethod === 'phone' && !phone"
                class="welcome-cursor"
              ></span>
            </div>
          </div>

          <!-- Password field -->
          <div v-if="isPasswordEnabled" class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
              <i class="fas fa-key mr-2" style="color: var(--color-accent)"></i>
              Пароль
            </label>
            <div class="relative">
              <input
                v-model="phonePassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Введите пароль"
                class="input w-full pr-12 terminal-input"
                :disabled="loading"
                @focus="handleAnyFocus"
                @blur="handleAnyBlur"
                @keyup.enter="handlePhonePasswordLogin"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
                style="color: var(--color-text-tertiary); z-index: 20"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <!-- Login with password button -->
          <transition name="retro-fade">
            <button
              v-if="isPasswordEnabled && phonePassword"
              @click="handlePhonePasswordLogin"
              :disabled="loading || !isValidPhone(phone)"
              class="btn w-full mb-4"
              :style="
                loading || !isValidPhone(phone)
                  ? 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: 1.5px solid var(--color-border); cursor: not-allowed;'
                  : 'background: var(--color-accent); color: white; border: 1.5px solid var(--color-accent); cursor: pointer;'
              "
            >
              <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-sign-in-alt mr-2"></i>
              {{ loading ? 'Вход...' : 'Войти' }}
            </button>
          </transition>

          <!-- Divider -->
          <transition name="retro-fade">
            <div v-if="isPasswordEnabled && phonePassword" class="relative my-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-[var(--color-border)]"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                  >или</span
                >
              </div>
            </div>
          </transition>

          <button
            @click="sendPhoneCode"
            :disabled="loading || !isValidPhone(phone)"
            class="btn btn-primary w-full"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-paper-plane mr-2"></i>
            {{ loading ? 'Обработка...' : 'Отправить код' }}
          </button>
        </div>

        <div v-if="step === 'code'">
          <div class="text-center mb-6">
            <div
              class="w-16 h-16 flex items-center justify-center mx-auto mb-4 code-icon"
              style="background: var(--color-accent-light)"
            >
              <i class="fas fa-sms text-2xl" style="color: var(--color-accent)"></i>
            </div>
            <h3 class="text-lg font-semibold text-[var(--color-text)] mb-2">Введите код</h3>
            <p class="text-[var(--color-text-secondary)] text-sm">
              Код отправлен на номер<br />
              <span class="font-medium">{{ formatPhoneNumber(phone) }}</span>
            </p>
          </div>

          <div class="mb-4">
            <input
              v-model="phoneCode"
              type="text"
              placeholder="0000"
              maxlength="4"
              class="input w-full text-center text-2xl font-mono"
              :disabled="loading"
              @keyup.enter="confirmPhoneCode"
              @input="onPhoneCodeInput"
            />
          </div>

          <button
            @click="confirmPhoneCode"
            class="btn btn-primary w-full mb-4"
            :disabled="loading || phoneCode.length < 4"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-check mr-2"></i>
            {{ loading ? 'Проверка...' : 'Подтвердить' }}
          </button>

          <button
            @click="goBack"
            class="btn w-full mb-4"
            style="background: var(--color-border)"
            :disabled="loading"
          >
            <i class="fas fa-arrow-left mr-2"></i>
            Изменить номер
          </button>

          <div v-if="canResend" class="text-center">
            <button
              @click="sendPhoneCode"
              class="text-sm transition-colors hover:opacity-70"
              style="color: var(--color-accent)"
              :disabled="loading"
            >
              Отправить код повторно
            </button>
          </div>
        </div>
      </div>

      <!-- Email Auth -->
      <div v-if="authMethod === 'email' && isEmailEnabled">
        <div v-if="step === 'input'">
          <div class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
              <i class="fas fa-envelope mr-2" style="color: var(--color-accent)"></i>
              Email адрес
            </label>
            <div class="relative">
              <input
                v-model="email"
                type="email"
                class="input w-full terminal-input"
                :disabled="loading"
                @focus="handleAnyFocus"
                @blur="handleAnyBlur"
                @keyup.enter="
                  isPasswordEnabled && emailPassword
                    ? handleEmailPasswordLogin()
                    : sendEmailCodeHandler()
                "
              />
              <span
                v-if="showWelcomeCursor && authMethod === 'email' && !email"
                class="welcome-cursor"
              ></span>
            </div>
          </div>

          <!-- Password field -->
          <div v-if="isPasswordEnabled" class="mb-4">
            <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
              <i class="fas fa-key mr-2" style="color: var(--color-accent)"></i>
              Пароль
            </label>
            <div class="relative">
              <input
                v-model="emailPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Введите пароль"
                class="input w-full pr-12 terminal-input"
                :disabled="loading"
                @focus="handleAnyFocus"
                @blur="handleAnyBlur"
                @keyup.enter="handleEmailPasswordLogin"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
                style="color: var(--color-text-tertiary); z-index: 20"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <!-- Login with password button -->
          <transition name="retro-fade">
            <button
              v-if="isPasswordEnabled && emailPassword"
              @click="handleEmailPasswordLogin"
              :disabled="loading || !isValidEmail(email)"
              class="btn w-full mb-4"
              :style="
                loading || !isValidEmail(email)
                  ? 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: 1.5px solid var(--color-border); cursor: not-allowed;'
                  : 'background: var(--color-accent); color: white; border: 1.5px solid var(--color-accent); cursor: pointer;'
              "
            >
              <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
              <i v-else class="fas fa-sign-in-alt mr-2"></i>
              {{ loading ? 'Вход...' : 'Войти' }}
            </button>
          </transition>

          <!-- Divider -->
          <transition name="retro-fade">
            <div v-if="isPasswordEnabled && emailPassword" class="relative my-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-[var(--color-border)]"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                  >или</span
                >
              </div>
            </div>
          </transition>

          <button
            @click="sendEmailCodeHandler"
            :disabled="loading || !isValidEmail(email)"
            class="btn btn-primary w-full"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-paper-plane mr-2"></i>
            {{ loading ? 'Обработка...' : 'Отправить код' }}
          </button>
        </div>

        <div v-if="step === 'code'">
          <div class="text-center mb-6">
            <div
              class="w-16 h-16 flex items-center justify-center mx-auto mb-4 code-icon"
              style="background: var(--color-accent-light)"
            >
              <i class="fas fa-envelope-open text-2xl" style="color: var(--color-accent)"></i>
            </div>
            <h3 class="text-lg font-semibold text-[var(--color-text)] mb-2">Проверьте почту</h3>
            <p class="text-[var(--color-text-secondary)] text-sm">
              Код отправлен на адрес<br />
              <span class="font-medium">{{ email }}</span>
            </p>
          </div>

          <div class="mb-4">
            <input
              v-model="emailCode"
              type="text"
              placeholder="000000"
              maxlength="6"
              class="input w-full text-center text-2xl font-mono"
              :disabled="loading"
              @keyup.enter="confirmEmailCodeHandler"
              @input="onEmailCodeInput"
            />
          </div>

          <button
            @click="confirmEmailCodeHandler"
            class="btn btn-primary w-full mb-4"
            :disabled="loading || emailCode.length < 6"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-check mr-2"></i>
            {{ loading ? 'Проверка...' : 'Подтвердить' }}
          </button>

          <button
            @click="goBack"
            class="btn w-full mb-4"
            style="background: var(--color-border)"
            :disabled="loading"
          >
            <i class="fas fa-arrow-left mr-2"></i>
            Изменить email
          </button>

          <div v-if="canResend" class="text-center">
            <button
              @click="sendEmailCodeHandler"
              class="text-sm transition-colors hover:opacity-70"
              style="color: var(--color-accent)"
              :disabled="loading"
            >
              Отправить код повторно
            </button>
          </div>
        </div>
      </div>

      <!-- No methods available -->
      <div
        v-if="!isPhoneEnabled && !isEmailEnabled && !isTelegramEnabled"
        class="text-center text-[var(--color-text-secondary)]"
      >
        <i
          class="fas fa-exclamation-triangle text-4xl mb-4"
          style="color: var(--color-warning)"
        ></i>
        <p>Методы авторизации не настроены</p>
      </div>

      <!-- Telegram -->
      <div
        v-if="isTelegramEnabled && step === 'input'"
        :class="{ 'mt-4': isPhoneEnabled || isEmailEnabled }"
      >
        <div v-if="isPhoneEnabled || isEmailEnabled" class="relative mb-4">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-[var(--color-border)]"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
              >или</span
            >
          </div>
        </div>
        <button @click="handleTelegramLogin" class="btn btn-telegram w-full">
          <i class="fab fa-telegram-plane mr-2 text-lg"></i>
          Войти через Telegram
        </button>
      </div>

      <!-- Error -->
      <div
        v-if="error"
        class="mt-4 p-3 border error-box"
        style="
          background: var(--color-danger-light);
          border-color: var(--color-danger);
          color: var(--color-danger);
        "
      >
        <div class="flex items-center">
          <i class="fas fa-exclamation-circle mr-2"></i>
          <span class="text-sm">{{ error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --color-bg: #fafbfc;
  --color-bg-secondary: #ffffff;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  --color-border: #e2e8f0;
  --color-accent: #d3234b;
  --color-accent-hover: #e6395f;
  --color-accent-light: rgba(211, 35, 75, 0.1);
  --color-accent-medium: rgba(211, 35, 75, 0.2);
  --color-danger: #ef4444;
  --color-danger-light: #fef2f2;
  --color-warning: #f59e0b;
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.dark {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-border: #2a2a2a;
  --color-border-light: #3a3a3a;
  --color-accent: #d3234b;
  --color-accent-hover: #e6395f;
  --color-accent-light: rgba(211, 35, 75, 0.15);
  --color-accent-medium: rgba(211, 35, 75, 0.25);
  --color-danger: #f87171;
  --color-danger-light: rgba(239, 68, 68, 0.1);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  letter-spacing: 0.03em;
}

/* Стилизация выделения текста */
::selection {
  background: #e0335a;
  color: #ffffff;
}

::-moz-selection {
  background: #e0335a;
  color: #ffffff;
}

.login-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-border);
  border-radius: 0;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  margin: 1rem;
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.4),
    0 4px 10px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  position: relative;
  overflow: hidden;
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

/* CRT scanlines эффект для карточки логина */
.login-card::before {
  content: '';
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
  z-index: 10;
  opacity: 0.5;
  animation: scanline-move 8s linear infinite;
}

@keyframes scanline-move {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(4px);
  }
}

/* Эффект мерцания старого монитора */
.login-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(211, 35, 75, 0.02) 0%,
    transparent 50%,
    rgba(211, 35, 75, 0.02) 100%
  );
  pointer-events: none;
  z-index: 9;
  animation: crt-flicker 3s ease-in-out infinite;
  opacity: 0;
}

@keyframes crt-flicker {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
}

.login-icon {
  box-shadow:
    0 8px 24px rgba(211, 35, 75, 0.4),
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 0 30px rgba(211, 35, 75, 0.2),
    inset 0 0 0 2px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
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

/* CRT scanlines эффект для иконки логина */
.login-icon::before {
  content: '';
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
  z-index: 2;
  animation: scanline-flicker 8s linear infinite;
}

@keyframes scanline-flicker {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
}

.login-icon i {
  position: relative;
  z-index: 3;
}

.login-icon:hover {
  transform: scale(1.05);
  box-shadow:
    0 12px 32px rgba(211, 35, 75, 0.5),
    0 6px 16px rgba(211, 35, 75, 0.4),
    0 0 40px rgba(211, 35, 75, 0.25);
}

.input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9375rem;
  transition: var(--transition);
  box-sizing: border-box;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow:
    0 0 0 3px var(--color-accent-light),
    inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Терминальная стилизация полей ввода */
.terminal-input {
  font-family: 'Share Tech Mono', 'Courier New', 'Monaco', 'Menlo', monospace !important;
  font-size: 0.9375rem;
  letter-spacing: 0.05em;
  background: var(--color-bg) !important;
  color: var(--color-accent) !important;
  caret-color: var(--color-accent);
}

/* Исправление белого фона на мобильных устройствах при автозаполнении */
.terminal-input:-webkit-autofill,
.terminal-input:-webkit-autofill:hover,
.terminal-input:-webkit-autofill:focus,
.terminal-input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--color-bg) inset !important;
  -webkit-text-fill-color: var(--color-accent) !important;
  box-shadow: 0 0 0 1000px var(--color-bg) inset !important;
  transition: background-color 5000s ease-in-out 0s;
}

.terminal-input::placeholder {
  color: var(--color-text-tertiary);
  font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
  opacity: 0.5;
}

.terminal-input:focus {
  box-shadow:
    0 0 0 3px var(--color-accent-light),
    inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Приветственный мигающий курсор */
.welcome-cursor {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.6em;
  height: 1.2em;
  background: var(--color-accent);
  pointer-events: none;
  z-index: 10;
  animation: cursor-blink 1.06s step-end infinite;
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.5rem;
  border-radius: 0;
  font-weight: 400;
  font-size: 0.9375rem;
  transition: var(--transition);
  border: 2px solid transparent;
  outline: none;
  cursor: pointer;
  letter-spacing: 0.05em;
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.2);
  color: var(--color-text);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
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

/* CRT scanlines для кнопок */
.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08) 0px,
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.btn > * {
  position: relative;
  z-index: 1;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  box-shadow:
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 2px 6px rgba(211, 35, 75, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
  box-shadow:
    0 6px 16px rgba(211, 35, 75, 0.4),
    0 3px 8px rgba(211, 35, 75, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.btn-telegram {
  background: linear-gradient(135deg, #229ed9 0%, #0088cc 100%);
  color: white;
  border-color: #229ed9;
  box-shadow:
    0 4px 14px rgba(34, 158, 217, 0.4),
    0 2px 7px rgba(34, 158, 217, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-telegram:hover:not(:disabled) {
  box-shadow:
    0 6px 20px rgba(34, 158, 217, 0.5),
    0 3px 10px rgba(34, 158, 217, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

/* Code Icon - квадратная иконка с CRT эффектами */
.code-icon {
  border: 2px solid var(--color-accent);
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

.code-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.code-icon i {
  position: relative;
  z-index: 1;
}

/* Error Box - квадратный блок ошибки */
.error-box {
  border-radius: 0;
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

/* Terminal-style corner brackets для карточки логина */
.login-card > * {
  position: relative;
  z-index: 11;
}

/* Терминальные угловые скобки - верхние углы */
.login-card::before {
  z-index: 20 !important;
}

/* Добавляем декоративные угловые элементы */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

/* Терминальные тени для заголовков */
.login-title {
  text-shadow: 0 0 8px rgba(232, 232, 232, 0.3);
  letter-spacing: 0.05em;
}

.login-subtitle {
  text-shadow: 0 0 6px rgba(160, 160, 160, 0.2);
  letter-spacing: 0.03em;
}

/* Ретро-анимация появления/исчезновения */
.retro-fade-enter-active {
  animation: retro-glitch-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.retro-fade-leave-active {
  animation: retro-glitch-out 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

@keyframes retro-glitch-in {
  0% {
    opacity: 0;
    transform: translateY(-8px) scaleY(0.8);
    filter: blur(2px);
  }
  20% {
    opacity: 0.3;
    transform: translateY(-6px) scaleY(0.85) translateX(2px);
    filter: blur(1px);
  }
  40% {
    opacity: 0.6;
    transform: translateY(-3px) scaleY(0.95) translateX(-1px);
    filter: blur(0.5px);
  }
  60% {
    opacity: 0.8;
    transform: translateY(-1px) scaleY(1.02) translateX(1px);
  }
  80% {
    opacity: 0.95;
    transform: translateY(0) scaleY(1.01) translateX(-0.5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scaleY(1) translateX(0);
    filter: blur(0);
  }
}

@keyframes retro-glitch-out {
  0% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
    filter: blur(0);
  }
  30% {
    opacity: 0.7;
    transform: translateY(2px) scaleY(0.98) translateX(-2px);
    filter: blur(0.5px);
  }
  60% {
    opacity: 0.4;
    transform: translateY(4px) scaleY(0.9) translateX(1px);
    filter: blur(1px);
  }
  100% {
    opacity: 0;
    transform: translateY(8px) scaleY(0.7);
    filter: blur(2px);
  }
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem;
    margin: 0.75rem;
  }
}
</style>
