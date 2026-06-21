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
          Настройки инструмента отправки в Telegram
        </h1>
        <p class="text-gray-600 max-w-2xl mx-auto">
          Настройте отправку сообщений в Telegram каналы и группы через ботов-менеджеров для ваших
          ИИ агентов
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
            <!-- Выбор бота-менеджера -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fab fa-telegram mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  Бот-менеджер
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">
                      Через какого бота агент будет отправлять сообщения в вашу группу или канал
                    </div>
                  </div>
                </span>
              </label>
              <div class="flex gap-2">
                <select
                  v-model="settings.tgManagerId"
                  @change="loadGroupSuggestions"
                  class="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Выберите бота-менеджера</option>
                  <option v-for="manager in telegramManagers" :key="manager.id" :value="manager.id">
                    {{ manager.name || manager.id }}
                  </option>
                </select>
                <button
                  type="button"
                  @click="loadManagers"
                  class="px-4 py-3 bg-blue-100 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Обновить список ботов-менеджеров"
                >
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>

              <!-- Подсказка если нет менеджеров -->
              <div
                v-if="telegramManagers.length === 0"
                class="bg-amber-50 border border-amber-200 rounded-lg p-4"
              >
                <div class="flex items-start">
                  <i class="fas fa-info-circle text-amber-500 mt-1 mr-3"></i>
                  <div>
                    <h4 class="text-sm font-medium text-amber-800">
                      Нет доступных ботов-менеджеров
                    </h4>
                    <p class="text-sm text-amber-700 mt-1">
                      Для работы инструмента необходимо добавить транспорт с типом "Telegram
                      Manager".
                    </p>
                    <a
                      href="/app/sender/v2#/settings/channel/add"
                      target="_blank"
                      class="inline-flex items-center mt-2 px-3 py-1 bg-amber-600 text-white text-xs rounded-md hover:bg-amber-700 transition-colors"
                    >
                      <i class="fas fa-plus mr-1"></i>
                      Добавить транспорт
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- ID группы/канала -->
            <div class="space-y-3">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fas fa-hashtag mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  ID группы или канала
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">В какой чат агент будет отправлять сообщения</div>
                  </div>
                </span>
              </label>
              <div class="flex gap-2">
                <input
                  v-model="settings.groupOrChannelId"
                  type="text"
                  class="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Введите ID группы или канала (например: -1001234567890)"
                  required
                />
                <button
                  type="button"
                  @click="loadGroupSuggestions"
                  class="px-4 py-3 bg-green-100 text-green-600 border border-green-200 rounded-lg hover:bg-green-200 transition-colors"
                  title="Обновить подсказки групп/каналов"
                >
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>

              <!-- Подсказки групп -->
              <div v-if="groupSuggestions.length > 0" class="space-y-2">
                <p class="text-sm font-medium text-gray-700">
                  <i class="fas fa-history text-green-500 mr-2"></i>
                  Недавно активные группы/каналы:
                </p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="suggestion in groupSuggestions"
                    :key="suggestion"
                    type="button"
                    @click="settings.groupOrChannelId = suggestion"
                    class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 border border-blue-300 transition-colors"
                  >
                    {{ suggestion }}
                  </button>
                </div>
              </div>

              <!-- Информация о правах бота (показывается только если нет активных групп) -->
              <div
                v-if="groupSuggestions.length === 0 && settings.tgManagerId"
                class="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div class="flex items-start">
                  <i class="fas fa-lightbulb text-blue-500 mt-1 mr-3"></i>
                  <div class="text-sm text-blue-700">
                    <p class="font-medium mb-1">Важно!</p>
                    <p>
                      Чтобы появились подсказки групп/каналов, нужно добавить выбранного
                      бота-менеджера в группу или канал администратором с правом отправлять
                      сообщения.
                    </p>
                  </div>
                </div>
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

            <!-- Кнопки с ссылками -->
            <div class="space-y-4">
              <label class="flex items-center text-sm font-medium text-gray-700">
                <i class="fas fa-link mr-2 text-blue-500"></i>
                <span class="flex items-center">
                  Кнопки с ссылками (опционально)
                  <div class="tooltip-container ml-1 relative">
                    <i
                      class="fas fa-question-circle text-gray-400 text-xs hover:text-gray-600 cursor-help"
                    ></i>
                    <div class="tooltip">
                      Дополнительные кнопки со ссылками, которые будут отображаться под сообщением
                    </div>
                  </div>
                </span>
              </label>

              <div
                v-for="(button, index) in settings.buttons"
                :key="index"
                class="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"
              >
                <input
                  v-model="button.text"
                  type="text"
                  placeholder="Текст кнопки"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  v-model="button.url"
                  type="url"
                  placeholder="https://example.com"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  @click="removeButton(index)"
                  class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>

              <button
                type="button"
                @click="addButton"
                class="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <i class="fas fa-plus mr-2"></i>
                Добавить кнопку
              </button>
            </div>

            <!-- Отключить превью ссылок -->
            <div class="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
              <input
                v-model="settings.disableLinkPreview"
                type="checkbox"
                id="disableLinkPreview"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label for="disableLinkPreview" class="text-sm font-medium text-gray-700">
                <i class="fas fa-eye-slash mr-2 text-gray-500"></i>
                Отключить превью ссылок в сообщениях
              </label>
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
                :disabled="!settings.tgManagerId || !settings.groupOrChannelId || testLoading"
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
                      <div class="text-sm font-medium text-blue-400 mb-1">
                        {{ selectedManagerName }}
                      </div>

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

                      <!-- Buttons preview -->
                      <div v-if="validButtons.length > 0" class="mt-2 space-y-1">
                        <div
                          v-for="button in validButtons"
                          :key="button.text"
                          class="bg-white rounded-lg p-2 text-blue-600 text-center text-sm border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <i class="fas fa-external-link-alt mr-1 text-xs"></i>
                          {{ button.text }}
                        </div>
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
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  apiGetManagersRoute,
  apiGetGroupSuggestionsRoute,
  apiSaveSettingsRoute,
  apiGetSettingsRoute,
  apiTestToolRoute
} from '../api/settings'

const settings = ref({
  tgManagerId: '',
  groupOrChannelId: '',
  messageWrapper: `🤖 <b>Сообщение от ИИ агента</b>

{TEXT}

<i>Отправлено автоматически</i>`,
  buttons: [],
  disableLinkPreview: false
})

const telegramManagers = ref([])
const groupSuggestions = ref([])
const loading = ref(false)
const testLoading = ref(false)
const result = ref(null)

const validButtons = computed(() => {
  return settings.value.buttons.filter((button) => button.text?.trim() && button.url?.trim())
})

const selectedManagerName = computed(() => {
  const manager = telegramManagers.value.find((m) => m.id === settings.value.tgManagerId)
  return manager?.name || manager?.id || 'Bot Manager'
})

onMounted(async () => {
  await loadManagers()
  await loadSettings()
})

function getPreviewHtml() {
  const sampleText =
    'Это пример текста от ИИ агента. Он может содержать различную информацию и форматирование.'
  let html = settings.value.messageWrapper || '{TEXT}'
  html = html.replace(/{TEXT}/g, sampleText)
  return html
}

async function loadManagers() {
  try {
    const response = await apiGetManagersRoute.run(ctx)
    telegramManagers.value = response.managers || []
  } catch (error) {
    console.error('Error loading managers:', error)
  }
}

async function loadGroupSuggestions() {
  if (!settings.value.tgManagerId) {
    groupSuggestions.value = []
    return
  }

  try {
    const response = await apiGetGroupSuggestionsRoute.run(ctx, {
      tgManagerId: settings.value.tgManagerId
    })
    groupSuggestions.value = response.suggestions || []
  } catch (error) {
    console.error('Error loading group suggestions:', error)
    groupSuggestions.value = []
  }
}

async function loadSettings() {
  try {
    const response = await apiGetSettingsRoute.run(ctx)
    if (response.settings) {
      settings.value = { ...settings.value, ...response.settings }
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

function addButton() {
  settings.value.buttons.push({ text: '', url: '' })
}

function removeButton(index) {
  settings.value.buttons.splice(index, 1)
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
