<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="auth-card rounded-xl shadow-2xl p-8 w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-800 mb-2">
          {{ ctx.t('Welcome') }}
        </h1>
        <p class="text-gray-600">
          {{ ctx.t('Sign in to your account to continue') }}
        </p>
      </div>

      <!-- Выбор метода авторизации -->
      <div v-if="isPhoneEnabled && isEmailEnabled" class="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          @click="authMethod = 'phone'"
          :class="[
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
            authMethod === 'phone'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          ]"
        >
          <i class="fas fa-phone mr-2"></i>
          {{ ctx.t('Phone') }}
        </button>
        <button
          @click="authMethod = 'email'"
          :class="[
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
            authMethod === 'email'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-blue-600'
          ]"
        >
          <i class="fas fa-envelope mr-2"></i>
          {{ ctx.t('Email') }}
        </button>
      </div>

      <!-- Форма авторизации по телефону -->
      <PhoneAuthForm
        v-if="authMethod === 'phone' && isPhoneEnabled"
        :showPasswordOption="isPasswordEnabled"
        @success="handleLoginSuccess"
      />

      <!-- Форма авторизации по email -->
      <EmailAuthForm
        v-if="authMethod === 'email' && isEmailEnabled"
        :showPasswordOption="isPasswordEnabled"
        @success="handleLoginSuccess"
      />

      <!-- Сообщение если нет доступных методов -->
      <div v-if="!isPhoneEnabled && !isEmailEnabled" class="text-center text-gray-500">
        <i class="fas fa-exclamation-triangle text-yellow-500 text-2xl mb-3"></i>
        <p>{{ ctx.t('Authentication methods are not configured') }}</p>
      </div>

      <!-- Кнопка Telegram -->
      <div v-if="isTelegramEnabled" class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">{{ ctx.t('or') }}</span>
          </div>
        </div>
        <button
          @click="handleTelegramLogin"
          class="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          <i class="fab fa-telegram-plane mr-2 text-lg"></i>
          {{ ctx.t('Sign in with Telegram') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'
import PhoneAuthForm from './components/PhoneAuthForm.vue'
import EmailAuthForm from './components/EmailAuthForm.vue'
import { getTelegramOauthUrlRoute } from './api/telegram'

const props = defineProps({
  providers: {
    type: Object,
    required: true
  },
  back: {
    type: String,
    default: '/'
  }
})

const authMethod = ref('phone')

// Проверка доступности провайдеров
const isPhoneEnabled = computed(() => Object.keys(props.providers).includes('Sms'))

const isEmailEnabled = computed(() => Object.keys(props.providers).includes('Email'))

const isPasswordEnabled = computed(() => Object.keys(props.providers).includes('Password'))

const isTelegramEnabled = computed(() => Object.keys(props.providers).includes('telegram-auth'))

// Установка метода по умолчанию
if (isEmailEnabled.value && !isPhoneEnabled.value) {
  authMethod.value = 'email'
}

const handleLoginSuccess = () => {
  window.location.href = props.back
}

const handleTelegramLogin = async () => {
  try {
    const oauthUrl = await getTelegramOauthUrlRoute.run(ctx, {})
    window.open(oauthUrl, '_self')
  } catch (error) {
    console.error('Ошибка получения ссылки для авторизации через Telegram:', error)
  }
}
</script>
