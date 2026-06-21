<template>
  <div>
    <!-- Шаг 1: Ввод email и пароля -->
    <div v-if="step === 'email'">
      <div class="mb-4">
        <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
          <i class="fas fa-envelope mr-2"></i>
          Email адрес
        </label>
        <input
          v-model="email"
          type="email"
          placeholder="example@domain.com"
          class="input w-full"
          :disabled="loading"
          @keyup.enter="showPasswordOption ? (password ? handlePasswordLogin() : null) : sendCode()"
        />
      </div>

      <!-- Поле пароля (всегда видимое, если опция включена) -->
      <div v-if="showPasswordOption" class="mb-4">
        <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
          <i class="fas fa-key mr-2"></i>
          Пароль
        </label>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Введите пароль"
            class="input w-full pr-12"
            :disabled="loading"
            @keyup.enter="handlePasswordLogin"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
            style="color: var(--color-text-tertiary)"
          >
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <!-- Кнопка "Войти" -->
      <button
        v-if="showPasswordOption"
        @click="handlePasswordLogin()"
        :disabled="loading || !isValidEmail(email) || !password"
        class="btn w-full mb-4"
        :style="
          loading || !isValidEmail(email) || !password
            ? 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: 1.5px solid var(--color-border); cursor: not-allowed;'
            : 'background: var(--color-primary); color: white; border: 1.5px solid var(--color-primary); cursor: pointer;'
        "
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-sign-in-alt mr-2"></i>
        {{ loading ? 'Вход...' : 'Войти' }}
      </button>

      <!-- Разделитель "или" -->
      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >или</span
          >
        </div>
      </div>

      <!-- Кнопка "Отправить код" -->
      <button
        @click="sendCode()"
        :disabled="loading || !isValidEmail(email)"
        class="btn btn-primary w-full"
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-paper-plane mr-2"></i>
        {{ loading ? 'Обработка...' : 'Отправить код' }}
      </button>
    </div>

    <!-- Шаг 2: Ввод кода подтверждения -->
    <div v-if="step === 'code'">
      <div class="text-center mb-6">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style="background: var(--color-primary-light)"
        >
          <i class="fas fa-envelope-open text-2xl" style="color: var(--color-primary)"></i>
        </div>
        <h3 class="text-lg font-semibold text-[var(--color-text)] mb-2">Проверьте почту</h3>
        <p class="text-[var(--color-text-secondary)] text-sm">
          Код отправлен на адрес<br />
          <span class="font-medium">{{ email }}</span>
        </p>
      </div>

      <div class="mb-4">
        <input
          v-model="verificationCode"
          type="text"
          placeholder="000000"
          maxlength="6"
          class="input w-full text-center text-2xl font-mono"
          :disabled="loading"
          @keyup.enter="confirmCode"
          @input="onCodeInput"
        />
      </div>

      <button
        @click="confirmCode"
        :disabled="loading || verificationCode.length < 6"
        class="btn btn-primary w-full mb-4"
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-check mr-2"></i>
        {{ loading ? 'Проверка...' : 'Подтвердить' }}
      </button>

      <button
        @click="goBack"
        class="btn w-full"
        style="background: var(--color-border)"
        :disabled="loading"
      >
        <i class="fas fa-arrow-left mr-2"></i>
        Изменить email
      </button>

      <div v-if="canResend" class="text-center mt-4">
        <button
          @click="sendCode"
          class="text-sm transition-colors hover:opacity-70"
          style="color: var(--color-primary)"
          :disabled="loading"
        >
          Отправить код повторно
        </button>
      </div>
    </div>

    <!-- Отображение ошибок -->
    <div
      v-if="error"
      class="mt-4 p-3 rounded-lg border"
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
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import {
  sendEmailCode,
  confirmEmailCode,
  loginWithPassword,
  handleAuthError,
  isValidEmail
} from '../lib/auth/authHelpers'
import { apiGetPasswordHashRoute } from '../api/password'

const props = defineProps({
  showPasswordOption: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['success'])

const step = ref('email')
const email = ref('')
const password = ref('')
const verificationCode = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const canResend = ref(false)

let resendTimer = null

const onCodeInput = (event) => {
  verificationCode.value = event.target.value.replace(/[^0-9]/g, '')
}

const sendCode = async () => {
  if (!isValidEmail(email.value)) {
    error.value = 'Введите корректный email адрес'
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
    error.value = 'Ошибка при отправке email'
  } finally {
    loading.value = false
  }
}

const confirmCode = async () => {
  if (verificationCode.value.length < 6) {
    error.value = 'Введите код из 6 цифр'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await confirmEmailCode(email.value, verificationCode.value)

    if (JSON.stringify(result).includes('authSuccess')) {
      emit('success')
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при подтверждении кода'
  } finally {
    loading.value = false
  }
}

const handlePasswordLogin = async () => {
  if (!isValidEmail(email.value)) {
    error.value = 'Введите корректный email адрес'
    return
  }

  if (!password.value) {
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
      password.value
    )

    if (JSON.stringify(result).includes('authSuccess')) {
      emit('success')
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при авторизации'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  step.value = 'email'
  verificationCode.value = ''
  error.value = ''
  clearResendTimer()
}

const startResendTimer = () => {
  canResend.value = false
  resendTimer = setTimeout(() => {
    canResend.value = true
  }, 60000) // 60 секунд
}

const clearResendTimer = () => {
  if (resendTimer) {
    clearTimeout(resendTimer)
    resendTimer = null
  }
  canResend.value = false
}
</script>
