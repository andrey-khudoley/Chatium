<template>
  <div class="login-card">
    <h1 class="text-2xl font-bold text-[var(--color-text)] text-center mb-6">Вход в систему</h1>

    <!-- Выбор метода авторизации -->
    <div
      v-if="isPhoneEnabled && isEmailEnabled"
      class="flex mb-6 bg-[var(--color-border)] rounded-lg p-1"
    >
      <button
        @click="authMethod = 'phone'"
        :class="[
          'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
          authMethod === 'phone' ? 'bg-[var(--color-bg-secondary)] shadow-sm' : 'hover:opacity-70'
        ]"
        :style="
          authMethod === 'phone'
            ? 'color: var(--color-primary)'
            : 'color: var(--color-text-secondary)'
        "
      >
        <i class="fas fa-phone mr-2"></i>
        Телефон
      </button>
      <button
        @click="authMethod = 'email'"
        :class="[
          'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
          authMethod === 'email' ? 'bg-[var(--color-bg-secondary)] shadow-sm' : 'hover:opacity-70'
        ]"
        :style="
          authMethod === 'email'
            ? 'color: var(--color-primary)'
            : 'color: var(--color-text-secondary)'
        "
      >
        <i class="fas fa-envelope mr-2"></i>
        Email
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
    <div
      v-if="!isPhoneEnabled && !isEmailEnabled && !isTelegramEnabled"
      class="text-center text-[var(--color-text-secondary)]"
    >
      <i class="fas fa-exclamation-triangle text-4xl mb-4" style="color: var(--color-warning)"></i>
      <p>Методы авторизации не настроены</p>
    </div>

    <!-- Кнопка Telegram -->
    <div v-if="isTelegramEnabled" :class="{ 'mt-4': isPhoneEnabled || isEmailEnabled }">
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
      <button
        @click="handleTelegramLogin"
        class="w-full font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center"
        style="background: linear-gradient(135deg, #229ed9 0%, #0088cc 100%); color: white"
        @mouseenter="telegramHover = true"
        @mouseleave="telegramHover = false"
        :style="
          telegramHover
            ? 'transform: translateY(-2px); box-shadow: 0 8px 20px rgba(34, 158, 217, 0.4);'
            : ''
        "
      >
        <i class="fab fa-telegram-plane mr-2 text-lg"></i>
        Войти через Telegram
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'
import PhoneAuthForm from '../components/PhoneAuthForm.vue'
import EmailAuthForm from '../components/EmailAuthForm.vue'
import { getTelegramOauthUrlRoute } from '../api/telegram'

const props = defineProps({
  providers: {
    type: Object,
    required: true
  },
  back: {
    type: String,
    required: true // URL генерируется на сервере через route.url()
  }
})

const authMethod = ref('phone')
const telegramHover = ref(false)

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
    const oauthUrl = await getTelegramOauthUrlRoute.run(ctx, { back: props.back })
    window.location.href = oauthUrl
  } catch (error) {
    console.error('Ошибка получения ссылки для авторизации через Telegram:', error)
    alert('Произошла ошибка при авторизации через Telegram. Попробуйте позже.')
  }
}
</script>
