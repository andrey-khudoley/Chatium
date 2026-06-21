<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      <!-- Блок с инструкцией -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-3xl font-bold text-gray-900">🚀 Шаблон miniApp для Telegram</h1>
          <button
            @click="openMiniApp"
            class="px-6 py-3 text-base font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors shadow-md hover:shadow-lg"
          >
            Открыть MiniApp
          </button>
        </div>

        <p class="text-gray-700 mb-4">
          Это базовый шаблон с готовой структурой и инструкцией по настройке.
        </p>

        <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p class="text-sm text-blue-800">
            <strong>📎 Ссылка на miniApp:</strong>
            <a :href="webAppUrl" class="text-blue-600 hover:underline ml-2">{{
              ctx.account.url('') + webAppUrl
            }}</a>
          </p>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-gray-900">⚙️ Инструкция по настройке</h2>
            <div class="text-sm text-gray-600">Шаг {{ currentStep }} из {{ totalSteps }}</div>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
            <p class="text-sm text-yellow-800">
              <strong>Важно!</strong> Выполните данную настройку перед началом работы с miniApp
              через Ботана.
            </p>
          </div>

          <!-- Индикатор прогресса -->
          <div class="mb-6">
            <div class="flex justify-between mb-2">
              <div v-for="step in totalSteps" :key="step" class="flex-1 mx-1">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="step <= currentStep ? 'bg-blue-500' : 'bg-gray-200'"
                ></div>
              </div>
            </div>
          </div>

          <!-- Шаги (показываем только текущий) -->
          <div class="space-y-6">
            <!-- Шаг 1 -->
            <div v-if="currentStep === 1" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Шаг 1: Подключите telegram-бота
              </h3>
              <ul class="list-disc list-inside text-gray-700 space-y-2">
                <li>Нажмите кнопку <strong>"Подключить telegram-бота"</strong> ниже</li>
                <li class="mt-3">
                  <button
                    @click="showConnectModal = true"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Подключить telegram-бота
                  </button>
                </li>
                <li>Если бот уже добавлен — нажмите "Следующий шаг"</li>
              </ul>
            </div>

            <!-- Шаг 2 -->
            <div v-if="currentStep === 2" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Шаг 2: Скопируйте ссылку на веб-приложение
              </h3>
              <p class="text-gray-700 mb-3">
                Используйте эту ссылку для настройки WebApp в следующих шагах
              </p>

              <div class="relative">
                <div class="flex items-center gap-2">
                  <input
                    :value="webAppUrl"
                    readonly
                    class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 select-all"
                  />
                  <button
                    @click="copyWebAppUrl"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                    title="Копировать ссылку"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Копировать
                  </button>
                </div>

                <!-- Уведомление о копировании -->
                <transition name="fade">
                  <div
                    v-if="showCopyNotification"
                    class="absolute top-full mt-2 left-0 right-0 bg-green-50 border border-green-200 rounded-md p-2 text-center"
                  >
                    <p class="text-sm text-green-700 flex items-center justify-center gap-2">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      Ссылка скопирована в буфер обмена!
                    </p>
                  </div>
                </transition>
              </div>
            </div>

            <!-- Шаг 3 -->
            <div v-if="currentStep === 3" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Шаг 3: Откройте настройки бота
              </h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>В списке ботов ниже найдите нужного бота</li>
                <li>Нажмите кнопку <strong>"Настроить WebApps"</strong> рядом с ним</li>
              </ul>
            </div>

            <!-- Шаг 4 -->
            <div v-if="currentStep === 4" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Шаг 4: Подключите WebApp</h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Перейдите на вкладку <strong>"WebApps"</strong></li>
                <li>
                  В поле <strong>"URL-адрес целевого веб-приложения"</strong> вставьте скопированную
                  ссылку
                </li>
                <li>Нажмите <strong>"Установить путь к веб-приложению"</strong></li>
              </ul>
            </div>

            <!-- Шаг 5 -->
            <div v-if="currentStep === 5" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Шаг 5: Скопируйте ссылку для BotFather
              </h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>
                  В поле <strong>"URL-адрес веб-приложения для Telegram BotFather"</strong> появится
                  новая ссылка
                </li>
                <li>Скопируйте её, нажав на кнопку справа от поля</li>
              </ul>
            </div>

            <!-- Шаг 6 -->
            <div v-if="currentStep === 6" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Шаг 6: Зарегистрируйте приложение в BotFather
              </h3>
              <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>
                  Откройте
                  <a
                    href="https://t.me/botfather"
                    target="_blank"
                    class="text-blue-600 hover:underline"
                    >@BotFather</a
                  >
                  в Telegram
                </li>
                <li>
                  <strong>Для нового приложения:</strong> отправьте команду
                  <code class="bg-gray-100 px-2 py-1 rounded text-sm">/newapp</code> и следуйте
                  инструкциям
                </li>
                <li>
                  <strong>Для существующего:</strong> отправьте
                  <code class="bg-gray-100 px-2 py-1 rounded text-sm">/myapps</code>, выберите бота,
                  затем "Edit App" → "Edit Web App URL"
                </li>
                <li>Вставьте скопированную ссылку из шага 5</li>
              </ul>
            </div>

            <!-- Шаг 7 -->
            <div v-if="currentStep === 7" class="border-l-4 border-blue-500 pl-4 animate-fade-in">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Шаг 7: Получите ссылку на запуск
              </h3>
              <p class="text-gray-700 mb-2">
                В BotFather после регистрации приложения вы получите прямую ссылку вида:
              </p>
              <code class="block bg-gray-100 px-3 py-2 rounded text-sm text-gray-800">
                https://t.me/ваш_бот/ваше_приложение
              </code>
              <p class="text-gray-700 mt-2">
                Эту ссылку можно использовать для запуска miniApp внутри Telegram
              </p>
            </div>

            <!-- Финальный экран -->
            <div v-if="currentStep === 8" class="animate-fade-in">
              <div class="bg-green-50 border border-green-200 rounded-md p-6 text-center">
                <div class="text-5xl mb-4">🎉</div>
                <p class="text-green-800 font-semibold text-xl mb-2">Готово!</p>
                <p class="text-green-700 text-base">
                  Теперь ваше miniApp настроено и готово к работе.
                </p>
                <p class="text-green-700 text-base mt-2">
                  Можете начинать кастомизацию через промты Ботану.
                </p>
              </div>
            </div>
          </div>

          <!-- Кнопки навигации -->
          <div class="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <button
              @click="prevStep"
              v-if="currentStep > 1"
              class="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              ← Предыдущий шаг
            </button>
            <div v-else></div>

            <button
              @click="nextStep"
              v-if="currentStep < totalSteps"
              class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Следующий шаг →
            </button>
            <button
              @click="resetSteps"
              v-else
              class="px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Начать заново
            </button>
          </div>
        </div>
      </div>

      <!-- Список транспортов аккаунта -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-gray-900">Telegram-боты</h2>
          <button
            @click="showConnectModal = true"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Подключить telegram-бота
          </button>
        </div>

        <div v-if="telegramChannels.length > 0" class="space-y-3">
          <div
            v-for="channel in telegramChannels"
            :key="channel.id"
            class="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <!-- Фото/Аватар канала -->
            <div class="flex-shrink-0 mr-4">
              <div v-if="channel.photo" class="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                <img
                  :src="getThumbnailUrl(channel.photo, 48, 48)"
                  :alt="channel.title"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-else
                class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg"
              >
                {{ getChannelInitials(channel.title) }}
              </div>
            </div>

            <!-- Информация о канале -->
            <div class="flex-1">
              <div class="text-base font-semibold text-gray-900">
                {{ channel.title }}
              </div>
              <div class="text-sm text-gray-500">
                {{
                  channel.description ||
                  (channel.username ? '@' + channel.username : getChannelSourceName(channel.source))
                }}
              </div>
            </div>

            <!-- Кнопки действий -->
            <div class="flex gap-2 flex-shrink-0 ml-4">
              <button
                @click="openSettings(channel)"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Настроить WebApps
              </button>
              <button
                v-if="channel.username"
                @click="testChannel(channel)"
                class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Открыть
              </button>
            </div>
          </div>
        </div>

        <!-- Нет каналов -->
        <div v-else class="text-center py-8">
          <p class="text-gray-500 text-lg">Нет подключенных telegram-ботов</p>
        </div>
      </div>

      <!-- Модальное окно подключения бота -->
      <div
        v-if="showConnectModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-4">Подключить telegram-бота</h3>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2"> Токен бота </label>
            <input
              v-model="botToken"
              type="text"
              placeholder="Введите токен бота от @BotFather"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              Получите токен у
              <a href="https://t.me/BotFather" target="_blank" class="text-blue-600 hover:underline"
                >@BotFather</a
              >
              в Telegram
            </p>
          </div>

          <div v-if="connectError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-600">{{ connectError }}</p>
          </div>

          <div
            v-if="connectSuccess"
            class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md"
          >
            <p class="text-sm text-green-600">Бот успешно подключен!</p>
          </div>

          <div class="flex gap-3">
            <button
              @click="connectBot"
              :disabled="isConnecting || !botToken"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isConnecting ? 'Подключение...' : 'Подключить' }}
            </button>
            <button
              @click="closeModal"
              :disabled="isConnecting"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getThumbnailUrl } from '@app/storage'
import { apiConnectTelegramRoute } from '../api/connect'

const props = defineProps<{
  availableChannels: Array<{
    id: string
    title: string
    source: string
    description?: string
    username?: string
    photo?: string | null
    active: boolean
  }>
  workspacePath: string
}>()

// Фильтрация только Telegram-ботов
const telegramChannels = computed(() => {
  return props.availableChannels.filter((channel) => channel.source === 'Telegram')
})

// Состояние навигации по шагам
const currentStep = ref(1)
const totalSteps = 8 // 7 шагов + финальный экран

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const resetSteps = () => {
  currentStep.value = 1
}

// Состояние модального окна
const showConnectModal = ref(false)
const botToken = ref('')
const isConnecting = ref(false)
const connectError = ref('')
const connectSuccess = ref(false)

// Закрытие модального окна
const closeModal = () => {
  if (!isConnecting.value) {
    showConnectModal.value = false
    botToken.value = ''
    connectError.value = ''
    connectSuccess.value = false
  }
}

// Подключение бота
const connectBot = async () => {
  if (!botToken.value) return

  isConnecting.value = true
  connectError.value = ''
  connectSuccess.value = false

  try {
    await apiConnectTelegramRoute.run(ctx, {
      token: botToken.value
    })

    connectSuccess.value = true

    // Обновляем страницу через 1.5 секунды
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error: any) {
    connectError.value = error.message || 'Не удалось подключить бота'
  } finally {
    isConnecting.value = false
  }
}

// Получение инициалов для аватара канала
const getChannelInitials = (name: string) => {
  if (!name) return 'C'
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Получение названия источника канала
const getChannelSourceName = (source: string) => {
  const sourceNames: Record<string, string> = {
    Telegram: 'Телеграм',
    WhatsApp: 'WhatsApp',
    Viber: 'Viber',
    VK: 'ВКонтакте',
    Avito: 'Авито'
  }
  return sourceNames[source] || source
}

// Открытие настроек канала
const openSettings = (channel: any) => {
  const accountUrl = ctx.account.url('')
  const settingsUrl = `${accountUrl}app/sender/v2#/settings/channel/${channel.id}`
  window.open(settingsUrl, '_blank')
}

// Тестирование канала
const testChannel = (channel: any) => {
  if (channel.source === 'Telegram' && channel.username) {
    window.open(`https://t.me/${channel.username}`, '_blank')
  }
}

// Вычисляемая ссылка на веб-приложение
const webAppUrl = computed(() => {
  const baseUrl = ctx.account.url('')
  return `${props.workspacePath}/web-app`
})

// Состояние для уведомления о копировании
const showCopyNotification = ref(false)

// Функция открытия MiniApp
const openMiniApp = () => {
  window.open(webAppUrl.value, '_blank')
}

// Функция копирования ссылки
const copyWebAppUrl = async () => {
  try {
    await navigator.clipboard.writeText(webAppUrl.value)
    showCopyNotification.value = true
    setTimeout(() => {
      showCopyNotification.value = false
    }, 2000)
  } catch (error) {
    // Fallback для старых браузеров
    const textArea = document.createElement('textarea')
    textArea.value = webAppUrl.value
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      showCopyNotification.value = true
      setTimeout(() => {
        showCopyNotification.value = false
      }, 2000)
    } catch (err) {
      console.error('Не удалось скопировать:', err)
    }
    document.body.removeChild(textArea)
  }
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.select-all {
  user-select: all;
}
</style>
