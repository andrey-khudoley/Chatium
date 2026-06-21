<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-telegram text-white rounded-full mb-4"
        >
          <i class="fab fa-telegram-plane text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Настройки проверки подписки</h1>
        <p class="text-gray-600 max-w-2xl mx-auto">
          Настройте Telegram-бота и канал для проверки подписки пользователей
        </p>
      </div>

      <div class="max-w-4xl mx-auto">
        <!-- Settings Panel -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <i class="fas fa-cog text-telegram mr-3"></i>
              Основные настройки
            </h2>
          </div>

          <form @submit.prevent="saveSettings" class="p-6 space-y-6">
            <!-- Выбор бота -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fab fa-telegram mr-2 text-telegram"></i>
                <span class="flex items-center">
                  Telegram Bot для проверки подписки
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">
                      Бот должен быть администратором канала для проверки подписки
                    </div>
                  </div>
                </span>
              </label>
              <select
                v-model="config.botId"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram focus:border-telegram transition-colors"
                required
              >
                <option value="">Выберите бота</option>
                <option v-for="bot in bots" :key="bot.id" :value="bot.id">
                  {{ bot.title }}{{ bot.username ? ' (@' + bot.username + ')' : '' }}
                </option>
              </select>

              <div
                v-if="bots.length === 0"
                class="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div class="flex items-start">
                  <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                  <div class="text-sm text-blue-700">
                    <p class="font-medium mb-1">Нет подключенных ботов</p>
                    <p>
                      Подключите Telegram бота через кнопку ниже. Этот бот будет использоваться для
                      проверки подписки.
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                <button
                  type="button"
                  @click="openAddBotModal"
                  class="px-4 py-2 text-sm font-medium text-white bg-telegram rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-telegram focus:ring-offset-2 transition-colors"
                >
                  <i class="fab fa-telegram mr-2"></i>
                  Добавить Telegram-бота
                </button>
              </div>
            </div>

            <!-- ID канала -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fas fa-hashtag mr-2 text-telegram"></i>
                <span class="flex items-center">
                  Telegram-канал для проверки
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">{{ channelTooltipText }}</div>
                  </div>
                </span>
              </label>
              <select
                v-model="config.senderChannelId"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram focus:border-telegram transition-colors"
                required
              >
                <option value="">Выберите канал</option>
                <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                  {{ channel.title }}{{ channel.externalId ? ' (' + channel.externalId + ')' : '' }}
                </option>
              </select>

              <div
                v-if="channels.length === 0"
                class="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div class="flex items-start">
                  <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                  <div class="text-sm text-blue-700">
                    <p class="font-medium mb-1">Нет добавленных каналов</p>
                    <p>Добавьте Telegram канал через кнопку ниже</p>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                <button
                  type="button"
                  @click="openAddChannelModal"
                  class="px-4 py-2 text-sm font-medium text-white bg-telegram rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-telegram focus:ring-offset-2 transition-colors"
                >
                  <i class="fas fa-plus mr-2"></i>
                  Добавить Telegram-канал
                </button>
              </div>
            </div>

            <!-- Кнопка сохранения -->
            <div class="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-6 py-3 bg-telegram text-white rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <i class="fas fa-save mr-2"></i>
                {{ loading ? 'Сохранение...' : 'Сохранить настройки' }}
              </button>
            </div>
          </form>

          <!-- Результат -->
          <div v-if="result" class="px-6 pb-6">
            <div
              :class="{
                'bg-green-50 border-green-200 text-green-800': result.success,
                'bg-red-50 border-red-200 text-red-800': !result.success
              }"
              class="p-4 rounded-lg border"
            >
              <div class="flex">
                <i
                  :class="{
                    'fas fa-check-circle text-green-400': result.success,
                    'fas fa-exclamation-circle text-red-400': !result.success
                  }"
                  class="mr-3 mt-0.5"
                ></i>
                <div>
                  <h3 class="text-sm font-medium">
                    {{ result.success ? 'Успешно!' : 'Ошибка' }}
                  </h3>
                  <p class="text-sm mt-1">{{ result.message }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно добавления бота -->
    <div
      v-if="isAddBotModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="closeAddBotModal"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Добавить Telegram-бота</h2>

          <div class="mb-4">
            <label for="botToken" class="block text-sm font-medium text-gray-700 mb-2">
              Токен бота
            </label>
            <input
              id="botToken"
              v-model="newBotToken"
              type="text"
              placeholder="Введите токен от BotFather"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-telegram focus:border-transparent"
            />
            <div class="mt-3 p-3 bg-blue-50 rounded-md">
              <p class="text-sm font-medium text-blue-900 mb-2">Как получить токен бота:</p>
              <ol class="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>
                  Откройте Telegram и найдите бота
                  <a href="https://t.me/BotFather" target="_blank" class="underline font-medium"
                    >@BotFather</a
                  >
                </li>
                <li>Отправьте команду /newbot</li>
                <li>Придумайте название для вашего бота</li>
                <li>Придумайте username (должен заканчиваться на _bot)</li>
                <li>BotFather пришлет вам токен</li>
                <li>Скопируйте токен и вставьте в поле выше</li>
              </ol>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="closeAddBotModal"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              @click="addBot"
              :disabled="!newBotToken.trim() || addingBot"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-telegram rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-telegram focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ addingBot ? 'Добавление...' : 'Добавить' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно добавления канала -->
    <div
      v-if="isAddChannelModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="closeAddChannelModal"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Добавить Telegram-канал</h2>

          <div class="mb-4">
            <label for="channelId" class="block text-sm font-medium text-gray-700 mb-2">
              ID канала
            </label>
            <input
              id="channelId"
              v-model="newChannelId"
              type="text"
              placeholder="-1001234567890 или @channel_name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-telegram focus:border-transparent"
            />
            <div class="mt-3 p-3 bg-blue-50 rounded-md">
              <p class="text-sm font-medium text-blue-900 mb-2">Как добавить канал:</p>
              <ol class="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>
                  Добавьте бота <span class="font-mono">@chnlAdminBot</span> в канал как
                  администратора
                </li>
                <li>
                  Добавьте выбранного выше бота в канал как администратора (для проверки подписки)
                </li>
                <li>
                  Перешлите сообщение из канала боту
                  <span class="font-mono">@chnlAdminBot</span> для получения ID
                </li>
                <li>
                  Введите полученный ID (например: -1001234567890) или username (например:
                  @channel_name)
                </li>
              </ol>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="closeAddChannelModal"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              @click="addChannel"
              :disabled="!newChannelId.trim() || addingChannel"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-telegram rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-telegram focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ addingChannel ? 'Добавление...' : 'Добавить' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  apiGetConfigRoute,
  apiSaveConfigRoute,
  apiGetBotsRoute,
  apiAddBotRoute,
  apiGetChannelsRoute,
  apiAddChannelRoute
} from '../api/config'

const config = ref({
  botId: '',
  senderChannelId: ''
})

const bots = ref([])
const channels = ref([])
const loading = ref(false)
const result = ref(null)
const isAddBotModalOpen = ref(false)
const newBotToken = ref('')
const addingBot = ref(false)
const isAddChannelModalOpen = ref(false)
const newChannelId = ref('')
const addingChannel = ref(false)

const selectedBot = computed(() => {
  return bots.value.find((bot) => bot.id === config.value.botId)
})

const channelTooltipText = computed(() => {
  if (!selectedBot.value) {
    return 'Выберите Telegram Bot и добавьте его админом в канал для проверки подписки'
  }
  const botName = selectedBot.value.username
    ? `@${selectedBot.value.username}`
    : selectedBot.value.title
  return `Добавьте бота ${botName} админом в канал для проверки подписки пользователей`
})

onMounted(async () => {
  await loadBots()
  await loadChannels()
  await loadConfig()
})

async function loadBots() {
  try {
    const response = await apiGetBotsRoute.run(ctx)
    bots.value = response.bots || []
  } catch (error) {
    console.error('Error loading bots:', error)
  }
}

async function loadChannels() {
  try {
    const response = await apiGetChannelsRoute.run(ctx)
    channels.value = response.channels || []
  } catch (error) {
    console.error('Error loading channels:', error)
  }
}

async function loadConfig() {
  try {
    const response = await apiGetConfigRoute.run(ctx)
    if (response.success && response.config) {
      config.value = { ...config.value, ...response.config }
    }
  } catch (error) {
    console.error('Error loading config:', error)
  }
}

async function saveSettings() {
  loading.value = true
  result.value = null

  try {
    const response = await apiSaveConfigRoute.run(ctx, config.value)
    result.value = {
      success: true,
      message: 'Настройки успешно сохранены'
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка сохранения настроек'
    }
  } finally {
    loading.value = false
  }
}

function openAddBotModal() {
  isAddBotModalOpen.value = true
  newBotToken.value = ''
}

function closeAddBotModal() {
  isAddBotModalOpen.value = false
  newBotToken.value = ''
}

async function addBot() {
  if (!newBotToken.value.trim()) {
    return
  }

  addingBot.value = true
  try {
    const response = await apiAddBotRoute.run(ctx, {
      token: newBotToken.value
    })

    if (response.success) {
      closeAddBotModal()
      result.value = {
        success: true,
        message: 'Telegram-бот успешно добавлен!'
      }
      await loadBots()
    } else {
      result.value = {
        success: false,
        message: response.error || 'Ошибка добавления бота'
      }
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка добавления бота'
    }
  } finally {
    addingBot.value = false
  }
}

function openAddChannelModal() {
  isAddChannelModalOpen.value = true
  newChannelId.value = ''
}

function closeAddChannelModal() {
  isAddChannelModalOpen.value = false
  newChannelId.value = ''
}

async function addChannel() {
  if (!newChannelId.value.trim()) {
    return
  }

  addingChannel.value = true
  try {
    const response = await apiAddChannelRoute.run(ctx, {
      externalId: newChannelId.value
    })

    if (response.success) {
      closeAddChannelModal()
      result.value = {
        success: true,
        message: 'Telegram-канал успешно добавлен!'
      }
      await loadChannels()
    } else {
      result.value = {
        success: false,
        message: response.error || 'Ошибка добавления канала'
      }
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка добавления канала'
    }
  } finally {
    addingChannel.value = false
  }
}
</script>

<style scoped>
.bg-telegram {
  background-color: #0088cc;
}

.hover\:bg-secondary:hover {
  background-color: #006699;
}

.text-telegram {
  color: #0088cc;
}

.focus\:ring-telegram:focus {
  --tw-ring-color: #0088cc;
}

.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip {
  visibility: hidden;
  width: 200px;
  background-color: #333;
  color: white;
  text-align: center;
  border-radius: 6px;
  padding: 8px;
  position: absolute;
  z-index: 1000;
  bottom: 125%;
  left: 50%;
  margin-left: -100px;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 12px;
  font-weight: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
}

.tooltip-container:hover .tooltip {
  visibility: visible;
  opacity: 1;
}
</style>
