<template>
  <div>
    <!-- Шаг 1: Ввод телефона -->
    <div v-if="step === 'phone'">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-phone mr-2"></i>
          {{ ctx.t('Phone number') }}
        </label>
        <input
          v-model="phone"
          type="tel"
          placeholder="+7 (999) 123-45-67"
          class="input-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
          @keyup.enter="sendCode"
        />
      </div>

      <div v-if="showPasswordOption" class="mb-4">
        <div class="flex items-center">
          <input
            id="usePassword"
            v-model="usePassword"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="usePassword" class="ml-2 text-sm text-gray-700">
            {{ ctx.t('Sign in with password') }}
          </label>
        </div>
      </div>

      <div v-if="usePassword" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-lock mr-2"></i>
          {{ ctx.t('Password') }}
        </label>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="ctx.t('Enter password')"
            class="input-field w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :disabled="loading"
            @keyup.enter="handlePasswordLogin"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          >
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <button
        @click="usePassword ? handlePasswordLogin() : sendCode()"
        :disabled="loading || !isValidPhone(phone) || (usePassword && !password)"
        class="btn-primary w-full py-3 px-4 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else-if="usePassword" class="fas fa-sign-in-alt mr-2"></i>
        <i v-else class="fas fa-paper-plane mr-2"></i>
        {{ loading ? ctx.t('Processing...') : usePassword ? ctx.t('Sign in') : ctx.t('Send code') }}
      </button>
    </div>

    <!-- Шаг 2: Ввод кода подтверждения -->
    <div v-if="step === 'code'">
      <div class="text-center mb-6">
        <div
          class="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"
        >
          <i class="fas fa-sms text-blue-600 text-2xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ ctx.t('Enter code') }}</h3>
        <p class="text-gray-600 text-sm">
          {{ ctx.t('Code sent to number') }}<br />
          <span class="font-medium">{{ formatPhoneNumber(phone) }}</span>
        </p>
      </div>

      <div class="mb-4">
        <input
          v-model="verificationCode"
          type="text"
          placeholder="0000"
          maxlength="4"
          class="input-field w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
          @keyup.enter="confirmCode"
          @input="onCodeInput"
        />
      </div>

      <button
        @click="confirmCode"
        :disabled="loading || verificationCode.length < 4"
        class="btn-primary w-full py-3 px-4 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-check mr-2"></i>
        {{ loading ? ctx.t('Verifying...') : ctx.t('Confirm') }}
      </button>

      <button
        @click="goBack"
        class="w-full py-2 px-4 text-gray-600 font-medium hover:text-gray-800 transition-colors"
        :disabled="loading"
      >
        <i class="fas fa-arrow-left mr-2"></i>
        {{ ctx.t('Change number') }}
      </button>

      <div v-if="canResend" class="text-center mt-4">
        <button
          @click="sendCode"
          class="text-blue-600 hover:text-blue-800 text-sm transition-colors"
          :disabled="loading"
        >
          {{ ctx.t('Resend code') }}
        </button>
      </div>
    </div>

    <!-- Отображение ошибок -->
    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <i class="fas fa-exclamation-circle text-red-500 mr-2"></i>
        <span class="text-red-700 text-sm">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import {
  sendSmsCode,
  confirmSmsCode,
  loginWithPassword,
  handleAuthError,
  formatPhoneNumber,
  isValidPhone
} from '../sdk'
import { getPasswordHashRoute } from '../api/password'

const props = defineProps({
  showPasswordOption: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['success'])

const step = ref('phone')
const phone = ref('')
const password = ref('')
const verificationCode = ref('')
const usePassword = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const canResend = ref(false)

let resendTimer = null

const onCodeInput = (event) => {
  // Автоматически удаляем нецифровые символы
  verificationCode.value = event.target.value.replace(/[^0-9]/g, '')
}

const sendCode = async () => {
  if (!isValidPhone(phone.value)) {
    error.value = ctx.t('Enter valid phone number')
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
    error.value = ctx.t('Error sending SMS')
  } finally {
    loading.value = false
  }
}

const confirmCode = async () => {
  if (verificationCode.value.length < 4) {
    error.value = ctx.t('Enter 4-digit code')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await confirmSmsCode(phone.value, verificationCode.value)

    if (JSON.stringify(result).includes('authSuccess')) {
      emit('success')
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = ctx.t('Error confirming code')
  } finally {
    loading.value = false
  }
}

const handlePasswordLogin = async () => {
  if (!isValidPhone(phone.value)) {
    error.value = ctx.t('Enter valid phone number')
    return
  }

  if (!password.value) {
    error.value = ctx.t('Enter password error')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await loginWithPassword(
      'Phone',
      phone.value,
      getPasswordHashRoute.url(),
      password.value
    )

    if (JSON.stringify(result).includes('authSuccess')) {
      emit('success')
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = ctx.t('Authentication error')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  step.value = 'phone'
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
