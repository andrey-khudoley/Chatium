<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4"
        >
          <i class="fab fa-telegram-plane text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Запрос помощи техподдержки в Telegram-группу
        </h1>
        <p class="text-gray-600 max-w-2xl mx-auto">
          Настройте отправку сообщений в Telegram-группы через бота.
        </p>
      </div>

      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Settings Panel -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <i class="fas fa-cog text-blue-500 mr-3"></i>
              Основные настройки
            </h2>
          </div>

          <form @submit.prevent="saveSettings" class="p-6 space-y-6">
            <!-- Выбор бота -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fab fa-telegram mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  Telegram Bot
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">Выберите бота из списка подключенных ботов</div>
                  </div>
                </span>
              </label>
              <select
                v-model="settings.tgBotId"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Выберите бота</option>
                <option v-for="bot in bots" :key="bot.id" :value="bot.id">
                  {{ bot.title }}{{ bot.username ? ' (@' + bot.username + ')' : '' }}
                </option>
              </select>

              <!-- Подсказка о подключении бота -->
              <div
                v-if="bots.length === 0"
                class="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div class="flex items-start">
                  <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                  <div class="text-sm text-blue-700">
                    <p class="font-medium mb-1">Нет подключенных ботов</p>
                    <p>Подключите Telegram бота через кнопку ниже</p>
                  </div>
                </div>
              </div>

              <!-- Кнопка подключения Telegram-бота -->
              <div class="mt-3">
                <button
                  type="button"
                  @click="openTelegramModal"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <i class="fab fa-telegram mr-2"></i>
                  Подключить Telegram-бота
                </button>
              </div>

              <!-- Важная информация о добавлении бота -->
              <div class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div class="flex items-start">
                  <i class="fas fa-exclamation-triangle text-amber-600 mt-1 mr-3"></i>
                  <div class="text-sm text-amber-800">
                    <p class="font-semibold mb-2">Важно!</p>
                    <ol class="list-decimal list-inside space-y-1">
                      <li>Добавьте бота в вашу Telegram-группу</li>
                      <li>Сделайте бота <strong>администратором</strong> группы</li>
                      <li>Дайте боту права на отправку сообщений</li>
                    </ol>
                    <p class="mt-2 text-xs">
                      Без прав администратора бот не сможет отправлять сообщения в группу.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- ID группы -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fas fa-hashtag mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  ID Телеграм-группы
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">Укажите ID группы (например: -1001234567890)</div>
                  </div>
                </span>
              </label>
              <input
                v-model="settings.tgChannelId"
                type="text"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="-1001234567890"
                required
              />

              <!-- Информация о получении ID -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start">
                  <i class="fas fa-lightbulb text-blue-500 mt-1 mr-3"></i>
                  <div class="text-sm text-blue-700">
                    <p class="font-medium mb-1">Как получить ID группы?</p>
                    <ol class="list-decimal list-inside space-y-1">
                      <li>Добавьте бота @myidbot в группу как администратора</li>
                      <li>Отправьте команду в чат <b>/getgroupid</b></li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI-агент -->
            <div class="space-y-3" style="width: 100%">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fas fa-robot mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  AI-агент
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">
                      Выберите AI-агента, который будет использовать этот инструмент для отправки
                      сообщений
                    </div>
                  </div>
                </span>
              </label>
              <div class="flex gap-2" style="max-width: 100%">
                <select
                  v-model="settings.agentId"
                  style="width: 100%"
                  class="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Выберите AI-агента</option>
                  <option v-for="agent in agents" :key="agent.id" :value="agent.id">
                    {{ agent.title }}
                  </option>
                </select>
                <button
                  type="button"
                  @click="openAgentModal"
                  class="px-4 py-3 bg-green-100 text-green-600 border border-green-200 rounded-lg hover:bg-green-200 transition-colors whitespace-nowrap"
                  title="Добавить AI агента"
                >
                  <i class="fas fa-plus mr-1"></i>
                  Добавить
                </button>
              </div>

              <!-- Кнопка сохранения агента -->
              <div v-if="agentChanged" class="flex gap-2">
                <button
                  type="button"
                  @click="saveAgentSettings"
                  :disabled="agentSaving"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <i class="fas fa-save mr-2"></i>
                  {{ agentSaving ? 'Сохранение...' : 'Сохранить' }}
                </button>
              </div>

              <!-- Кнопка настроек агента -->
              <div v-if="settings.agentId" class="flex gap-2">
                <button
                  type="button"
                  @click="openAgentSettings"
                  class="px-4 py-2 bg-purple-100 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors flex items-center"
                >
                  <i class="fas fa-cog mr-2"></i>
                  Настройки агента
                </button>
              </div>
            </div>

            <!-- Обертка сообщения -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fas fa-code mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  Обертка для сообщения от агента
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">
                      Текст до и после сообщения агента для лучшего понимания менеджером
                    </div>
                  </div>
                </span>
              </label>
              <textarea
                v-model="settings.messageWrapper"
                rows="6"
                class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-colors"
                placeholder="Введите HTML обертку. Используйте {TEXT} для вставки текста от агента..."
              ></textarea>
              <p class="text-xs text-gray-500 flex items-center">
                <i class="fas fa-info-circle mr-2"></i>
                Используйте <code class="bg-gray-100 px-1 rounded">{TEXT}</code> для вставки текста
                от агента. Поддерживается HTML разметка Telegram.
              </p>
            </div>

            <!-- Кнопки действий -->
            <div class="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <i class="fas fa-save mr-2"></i>
                {{ loading ? 'Сохранение...' : 'Сохранить настройки' }}
              </button>

              <button
                type="button"
                @click="testTool"
                :disabled="!settings.tgBotId || !settings.tgChannelId || testLoading"
                class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <i class="fas fa-paper-plane mr-2"></i>
                {{ testLoading ? 'Отправка...' : 'Тестировать' }}
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

        <!-- Preview Panel -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <i class="fas fa-eye text-blue-500 mr-3"></i>
              Превью сообщения
            </h2>
          </div>

          <div class="p-6">
            <!-- Telegram message preview -->
            <div class="bg-telegram-bg rounded-lg p-4" style="background: #17212b">
              <div class="max-w-md mx-auto">
                <!-- Telegram message bubble -->
                <div class="mb-4">
                  <div class="flex items-start space-x-2">
                    <!-- Avatar -->
                    <div class="flex-shrink-0">
                      <div
                        class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      >
                        <i class="fas fa-robot"></i>
                      </div>
                    </div>

                    <!-- Message content -->
                    <div class="flex-1 min-w-0">
                      <!-- Sender name -->
                      <div class="text-sm font-medium text-blue-400 mb-1">Telegram Bot</div>

                      <!-- Message bubble -->
                      <div class="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm relative">
                        <div
                          class="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap"
                          v-html="getPreviewHtml()"
                        ></div>

                        <!-- Message time -->
                        <div class="text-xs text-gray-400 mt-2 text-right">
                          {{
                            new Date().toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-center mt-4">
                  <p class="text-sm text-gray-600">
                    <i class="fas fa-info-circle mr-1"></i>
                    Примерный вид сообщения в Telegram
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно подключения Telegram-бота -->
    <div
      v-if="isTelegramModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="closeTelegramModal"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Подключить Telegram-бота</h2>

          <div class="mb-4">
            <label for="telegramToken" class="block text-sm font-medium text-gray-700 mb-2">
              Токен бота
            </label>
            <input
              id="telegramToken"
              v-model="telegramToken"
              type="text"
              placeholder="Введите токен от BotFather"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <li>
                  BotFather пришлет вам токен вида: 123456789:ABCdef1234567890ABCdef1234567890ABC
                </li>
                <li>Скопируйте этот токен и вставьте в поле выше</li>
              </ol>
              <div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p class="text-xs text-yellow-800">
                  <strong>Важно:</strong> Не передавайте токен третьим лицам. Токен дает полный
                  доступ к управлению ботом.
                </p>
              </div>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="closeTelegramModal"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              @click="connectTelegram"
              :disabled="!telegramToken.trim() || connectingTelegram"
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ connectingTelegram ? 'Подключаю...' : 'Подключить' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания агента -->
    <div
      v-if="isAgentModalOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="closeAgentModal"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Создать AI-агента</h2>

          <form @submit.prevent="createNewAgent">
            <div class="mb-4">
              <label for="agentTitle" class="block text-sm font-medium text-gray-700 mb-2">
                Название агента
              </label>
              <input
                id="agentTitle"
                v-model="newAgentTitle"
                type="text"
                placeholder="Например: Консультант по продуктам"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div class="mb-6">
              <label for="agentPrompt" class="block text-sm font-medium text-gray-700 mb-2">
                Промт (инструкция для агента)
              </label>
              <textarea
                id="agentPrompt"
                v-model="newAgentPrompt"
                rows="6"
                placeholder="Опишите как должен вести себя агент, какие задачи решать..."
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
            </div>

            <div class="flex space-x-3">
              <button
                @click="closeAgentModal"
                type="button"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Отмена
              </button>
              <button
                :disabled="!newAgentTitle.trim() || !newAgentPrompt.trim() || creatingAgent"
                type="submit"
                class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ creatingAgent ? 'Создание...' : 'Создать' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  apiSaveSettingsRoute,
  apiGetSettingsRoute,
  apiTestToolRoute,
  apiGetAgentsRoute,
  apiCreateAgentRoute,
  apiGetBotsRoute,
  apiConnectTelegramRoute
} from '../api/settings'

const settings = ref({
  tgBotId: '',
  tgChannelId: '',
  messageWrapper: `🤖 <b>Сообщение от ИИ агента</b>

{TEXT}

<i>Отправлено автоматически</i>`,
  agentId: ''
})

const agents = ref([])
const bots = ref([])
const loading = ref(false)
const testLoading = ref(false)
const result = ref(null)
const agentSaving = ref(false)
const initialAgentId = ref('')

// Модальное окно подключения Telegram-бота
const isTelegramModalOpen = ref(false)
const telegramToken = ref('')
const connectingTelegram = ref(false)

// Модальное окно создания агента
const isAgentModalOpen = ref(false)
const newAgentTitle = ref('')
const newAgentPrompt = ref('')
const creatingAgent = ref(false)

const agentChanged = computed(() => {
  return settings.value.agentId !== initialAgentId.value
})

const selectedAgentTitle = computed(() => {
  const agent = agents.value.find((a) => a.id === settings.value.agentId)
  return agent?.title || ''
})

const validButtons = computed(() => {
  return settings.value.buttons.filter((button) => button.text?.trim() && button.url?.trim())
})

onMounted(async () => {
  await loadBots()
  await loadAgents()
  await loadSettings()
  initialAgentId.value = settings.value.agentId
})

function getPreviewHtml() {
  const sampleText =
    'Это пример текста от ИИ агента. Он может содержать различную информацию и форматирование.'
  let html = settings.value.messageWrapper || '{TEXT}'
  html = html.replace(/{TEXT}/g, sampleText)
  return html
}

async function loadBots() {
  try {
    const response = await apiGetBotsRoute.run(ctx)
    bots.value = response.bots || []
  } catch (error) {
    console.error('Error loading bots:', error)
  }
}

async function loadAgents() {
  try {
    const response = await apiGetAgentsRoute.run(ctx)
    agents.value = response.agents || []
  } catch (error) {
    console.error('Error loading agents:', error)
  }
}

async function loadSettings() {
  try {
    console.log('Loading settings...')
    const response = await apiGetSettingsRoute.run(ctx)
    console.log('Settings response:', response)

    if (response.success && response.settings) {
      console.log('Merging settings:', response.settings)
      settings.value = { ...settings.value, ...response.settings }
      console.log('Settings after merge:', settings.value)
    } else {
      console.error('Failed to load settings:', response.error)
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
}

async function saveSettings() {
  loading.value = true
  result.value = null

  try {
    const response = await apiSaveSettingsRoute.run(ctx, settings.value)
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

async function testTool() {
  testLoading.value = true
  result.value = null

  try {
    const response = await apiTestToolRoute.run(ctx, settings.value)
    result.value = {
      success: response.success,
      message:
        response.message ||
        (response.success ? 'Сообщение успешно отправлено!' : 'Ошибка отправки сообщения')
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка при тестировании'
    }
  } finally {
    testLoading.value = false
  }
}

async function saveAgentSettings() {
  agentSaving.value = true
  result.value = null

  try {
    const response = await apiSaveSettingsRoute.run(ctx, settings.value)
    initialAgentId.value = settings.value.agentId
    result.value = {
      success: true,
      message: 'AI-агент успешно сохранен'
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка сохранения AI-агента'
    }
  } finally {
    agentSaving.value = false
  }
}

function openAgentModal() {
  isAgentModalOpen.value = true
  newAgentTitle.value = ''
  newAgentPrompt.value = ''
}

function closeAgentModal() {
  isAgentModalOpen.value = false
  newAgentTitle.value = ''
  newAgentPrompt.value = ''
}

async function createNewAgent() {
  if (!newAgentTitle.value.trim() || !newAgentPrompt.value.trim()) {
    return
  }

  creatingAgent.value = true
  try {
    const response = await apiCreateAgentRoute.run(ctx, {
      title: newAgentTitle.value,
      prompt: newAgentPrompt.value
    })

    if (response.success && response.agent) {
      // Добавляем нового агента в список
      agents.value.push(response.agent)
      // Выбираем нового агента
      settings.value.agentId = response.agent.id
      closeAgentModal()
      result.value = {
        success: true,
        message: `AI-агент "${response.agent.title}" успешно создан`
      }
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка создания AI-агента'
    }
  } finally {
    creatingAgent.value = false
  }
}

function openAgentSettings() {
  if (settings.value.agentId) {
    const url = ctx.account.url(`/app/agent-process/~agent/${settings.value.agentId}`)
    window.open(url, '_blank')
  }
}

function addButton() {
  settings.value.buttons.push({ text: '', url: '' })
}

function removeButton(index) {
  settings.value.buttons.splice(index, 1)
}

function openTelegramModal() {
  isTelegramModalOpen.value = true
  telegramToken.value = ''
}

function closeTelegramModal() {
  isTelegramModalOpen.value = false
  telegramToken.value = ''
}

async function connectTelegram() {
  if (!telegramToken.value.trim()) {
    return
  }

  connectingTelegram.value = true
  try {
    const response = await apiConnectTelegramRoute.run(ctx, {
      token: telegramToken.value
    })

    if (response.success) {
      closeTelegramModal()
      result.value = {
        success: true,
        message: 'Telegram-бот успешно подключен!'
      }
      // Перезагружаем список ботов
      await loadBots()
    }
  } catch (error) {
    result.value = {
      success: false,
      message: error.message || 'Ошибка подключения Telegram-бота'
    }
  } finally {
    connectingTelegram.value = false
  }
}
</script>

<style scoped>
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
