<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-md p-8 w-full max-w-6xl">
      <div
        class="h-1.5 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-800 rounded-t-lg -mx-8 -mt-8 mb-6"
      ></div>

      <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">
        Уведомление агента об открытии WebApp
      </h1>

      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-500 mt-2">Загрузка...</p>
      </div>

      <div v-else>
        <!-- Grid layout для блоков настройки -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Левая колонка -->
          <div class="space-y-6">
            <!-- Выбор канала сендера -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Телеграмм бот</h2>
              <p class="text-sm text-gray-600 mb-4">
                Выберите канал (Telegram бот) для отслеживания событий открытия WebApp
              </p>

              <div v-if="channels.length > 0" class="space-y-2">
                <label
                  v-for="channel in displayedChannels"
                  :key="channel.id"
                  class="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  :class="{ 'border-blue-500 bg-blue-50': selectedChannelId === channel.id }"
                >
                  <input
                    type="radio"
                    :value="channel.id"
                    v-model="selectedChannelId"
                    class="w-4 h-4 text-blue-600"
                  />
                  <div class="ml-3">
                    <span class="text-sm font-medium text-gray-900">{{ channel.title }}</span>
                    <span v-if="channel.username" class="text-xs text-gray-500 ml-2"
                      >@{{ channel.username }}</span
                    >
                  </div>
                </label>

                <button
                  v-if="selectedChannelId && channels.length > 1"
                  @click="isChannelListExpanded = !isChannelListExpanded"
                  class="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span>{{ isChannelListExpanded ? 'Свернуть' : 'Развернуть' }}</span>
                  <i
                    class="fas"
                    :class="isChannelListExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                  ></i>
                </button>
              </div>

              <div v-else class="text-gray-500 text-sm">
                Нет доступных каналов. Добавьте Telegram бота в настройках сендера.
              </div>
            </div>

            <!-- Выбор агента -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Агент</h2>
              <p class="text-sm text-gray-600 mb-4">
                Выберите агента, которому будут отправляться события открытия WebApp
              </p>

              <div v-if="agents.length > 0" class="space-y-2 mb-4">
                <label
                  v-for="agent in displayedAgents"
                  :key="agent.id"
                  class="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  :class="{ 'border-blue-500 bg-blue-50': selectedAgentId === agent.id }"
                >
                  <input
                    type="radio"
                    :value="agent.id"
                    v-model="selectedAgentId"
                    class="w-4 h-4 text-blue-600"
                  />
                  <span class="ml-3 text-sm font-medium text-gray-900">{{ agent.title }}</span>
                </label>

                <button
                  v-if="selectedAgentId && agents.length > 1"
                  @click="isAgentListExpanded = !isAgentListExpanded"
                  class="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span>{{ isAgentListExpanded ? 'Свернуть' : 'Развернуть' }}</span>
                  <i
                    class="fas"
                    :class="isAgentListExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                  ></i>
                </button>
              </div>

              <div v-else class="text-gray-500 text-sm mb-4">Нет доступных агентов</div>

              <button
                @click="showCreateAgentModal = true"
                class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                + Создать агента
              </button>
            </div>
          </div>

          <!-- Правая колонка -->
          <div class="space-y-6">
            <!-- Настройка режима -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Настройки уведомлений</h2>

              <div class="space-y-3">
                <label class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="onlyFirstVisit"
                    class="w-4 h-4 text-blue-600 rounded"
                  />
                  <span class="ml-3 text-sm text-gray-700"
                    >Оповещать агента только о новых пользователях</span
                  >
                </label>

                <label class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="wakeAgent"
                    class="w-4 h-4 text-blue-600 rounded"
                  />
                  <span class="ml-3 text-sm text-gray-700">Разбудить агента</span>
                </label>
              </div>
            </div>

            <!-- Шаблон сообщения -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h2 class="text-lg font-semibold text-gray-900 mb-3">Шаблон сообщения</h2>
              <p class="text-sm text-gray-600 mb-2">
                Используйте <code class="bg-gray-200 px-1 rounded">[userData]</code> для вставки
                данных пользователя
              </p>

              <textarea
                v-model="messageTemplate"
                rows="5"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                placeholder="Пользователь открыл WebApp.

Данные пользователя:
[userData]"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Кнопка сохранения -->
        <div class="flex justify-end pt-4 border-t border-gray-200">
          <button
            @click="saveSettings"
            :disabled="isSaving || !selectedAgentId || !selectedChannelId"
            class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isSaving ? 'Сохраняю...' : 'Сохранить' }}
          </button>
        </div>

        <!-- Статус -->
        <div
          v-if="saveMessage"
          class="text-center text-sm"
          :class="saveError ? 'text-red-600' : 'text-green-600'"
        >
          {{ saveMessage }}
        </div>
      </div>
    </div>

    <!-- Модальное окно создания агента -->
    <div
      v-if="showCreateAgentModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">Создать агента</h2>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Название агента</label>
            <input
              v-model="newAgentTitle"
              type="text"
              placeholder="Например: Обработчик WebApp"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Инструкции для агента</label
            >
            <textarea
              v-model="newAgentInstructions"
              rows="4"
              placeholder="Опишите как должен вести себя агент..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div class="flex space-x-3">
            <button
              @click="showCreateAgentModal = false"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Отмена
            </button>
            <button
              @click="createAgent"
              :disabled="!newAgentTitle || isCreatingAgent"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {{ isCreatingAgent ? 'Создаю...' : 'Создать' }}
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
  apiGetAgentsRoute,
  apiGetChannelsRoute,
  apiGetSettingsRoute,
  apiSaveSettingsRoute,
  apiCreateAgentRoute
} from '../api/settings'

const isLoading = ref(true)
const isSaving = ref(false)
const saveMessage = ref('')
const saveError = ref(false)

const agents = ref([])
const channels = ref([])
const selectedAgentId = ref('')
const selectedChannelId = ref('')
const onlyFirstVisit = ref(false)
const wakeAgent = ref(true)
const messageTemplate = ref('Пользователь открыл WebApp.\n\nДанные пользователя:\n[userData]')

const showCreateAgentModal = ref(false)
const newAgentTitle = ref('')
const newAgentInstructions = ref('Ты агент, который обрабатывает события открытия WebApp.')
const isCreatingAgent = ref(false)
const isAgentListExpanded = ref(true)
const isChannelListExpanded = ref(true)

const displayedAgents = computed(() => {
  if (!selectedAgentId.value || isAgentListExpanded.value) {
    return agents.value
  }
  return agents.value.filter((a) => a.id === selectedAgentId.value)
})

const displayedChannels = computed(() => {
  if (!selectedChannelId.value || isChannelListExpanded.value) {
    return channels.value
  }
  return channels.value.filter((c) => c.id === selectedChannelId.value)
})

onMounted(async () => {
  try {
    const [agentsData, channelsData, settingsData] = await Promise.all([
      apiGetAgentsRoute.run(ctx),
      apiGetChannelsRoute.run(ctx),
      apiGetSettingsRoute.run(ctx)
    ])

    agents.value = agentsData || []
    channels.value = channelsData || []

    if (settingsData) {
      selectedAgentId.value = settingsData.agentId || ''
      selectedChannelId.value = settingsData.channelId || ''
      onlyFirstVisit.value = settingsData.onlyFirstVisit || false
      wakeAgent.value = settingsData.wakeAgent ?? true
      messageTemplate.value =
        settingsData.messageTemplate ||
        'Пользователь открыл WebApp.\n\nДанные пользователя:\n[userData]'

      // Свернуть списки, если уже выбраны
      if (settingsData.agentId) {
        isAgentListExpanded.value = false
      }
      if (settingsData.channelId) {
        isChannelListExpanded.value = false
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
  } finally {
    isLoading.value = false
  }
})

const saveSettings = async () => {
  isSaving.value = true
  saveMessage.value = ''
  saveError.value = false

  try {
    const selectedAgent = agents.value.find((a) => a.id === selectedAgentId.value)
    const selectedChannel = channels.value.find((c) => c.id === selectedChannelId.value)

    await apiSaveSettingsRoute.run(ctx, {
      agentId: selectedAgentId.value,
      agentTitle: selectedAgent?.title || '',
      channelId: selectedChannelId.value,
      channelTitle: selectedChannel?.title || '',
      onlyFirstVisit: onlyFirstVisit.value,
      wakeAgent: wakeAgent.value,
      messageTemplate: messageTemplate.value
    })

    saveMessage.value = 'Настройки сохранены!'
  } catch (error) {
    saveMessage.value = 'Ошибка сохранения: ' + error.message
    saveError.value = true
  } finally {
    isSaving.value = false
  }
}

const createAgent = async () => {
  isCreatingAgent.value = true

  try {
    const agent = await apiCreateAgentRoute.run(ctx, {
      title: newAgentTitle.value,
      instructions: newAgentInstructions.value
    })

    agents.value.push(agent)
    selectedAgentId.value = agent.id
    showCreateAgentModal.value = false
    newAgentTitle.value = ''
    newAgentInstructions.value = 'Ты агент, который обрабатывает события открытия WebApp.'
  } catch (error) {
    alert('Ошибка создания агента: ' + error.message)
  } finally {
    isCreatingAgent.value = false
  }
}
</script>
