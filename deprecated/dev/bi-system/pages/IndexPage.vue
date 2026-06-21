<template>
  <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
    <div class="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- Таблица существующих датасетов -->
      <div class="mt-8 sm:mt-12 max-w-6xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 class="text-2xl font-bold text-[var(--color-text)]">
            <i class="fas fa-database mr-2 text-[var(--color-primary)]"></i>
            Мои датасеты
          </h2>
          <a
            :href="apiUrls.datasetConfig"
            class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
            style="background: var(--color-primary); color: white"
          >
            <i class="fas fa-plus"></i>
            <span>Создать датасет</span>
          </a>
        </div>

        <div v-if="loading" class="card text-center py-12">
          <i class="fas fa-spinner fa-spin text-3xl text-[var(--color-primary)] mb-4"></i>
          <p class="text-[var(--color-text-secondary)]">Загрузка датасетов...</p>
        </div>

        <div v-else-if="error" class="card text-center py-12">
          <i class="fas fa-exclamation-circle text-3xl text-red-500 mb-4"></i>
          <p class="text-red-500">{{ error }}</p>
        </div>

        <div v-else-if="datasets.length === 0" class="card text-center py-12">
          <i class="fas fa-database text-5xl text-[var(--color-text-tertiary)] mb-4 opacity-30"></i>
          <p class="text-[var(--color-text-secondary)] mb-4">У вас пока нет датасетов</p>
          <a
            :href="apiUrls.datasetConfig"
            class="inline-block px-6 py-3 rounded-lg font-medium transition-all"
            style="background: var(--color-primary); color: white"
          >
            Создать первый датасет
          </a>
        </div>

        <div v-else class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-[var(--color-card-hover)]">
                <tr>
                  <th
                    class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Название
                  </th>
                  <th
                    class="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Описание
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Компонентов
                  </th>
                  <th
                    class="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Период
                  </th>
                  <th
                    class="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Создан
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr
                  v-for="dataset in datasets"
                  :key="dataset.id"
                  class="hover:bg-[var(--color-card-hover)] transition-colors"
                >
                  <td class="px-4 sm:px-6 py-4 align-top">
                    <div class="max-w-xs">
                      <div
                        class="font-medium text-[var(--color-text)] break-all"
                        data-testid="dataset-name"
                        :title="dataset.name"
                      >
                        {{ dataset.name }}
                      </div>
                      <div class="sm:hidden mt-1 text-xs text-[var(--color-text-secondary)]">
                        {{ dataset.description || '—' }}
                      </div>
                      <div class="md:hidden mt-1 text-xs text-[var(--color-text-tertiary)]">
                        {{ getTimePeriodName(dataset) }}
                      </div>
                    </div>
                  </td>
                  <td class="hidden sm:table-cell px-6 py-4">
                    <div class="text-sm text-[var(--color-text-secondary)] max-w-xs truncate">
                      {{ dataset.description || '—' }}
                    </div>
                  </td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      style="
                        background: var(--color-primary-light);
                        color: var(--color-primary);
                        border: 1px solid var(--color-primary);
                      "
                    >
                      {{ getComponentsCount(dataset) }}
                    </span>
                  </td>
                  <td class="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-[var(--color-text-secondary)]">
                      {{ getTimePeriodName(dataset) }}
                    </span>
                  </td>
                  <td
                    class="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]"
                  >
                    {{ formatDate(dataset.createdAt) }}
                  </td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end gap-2">
                      <a
                        v-if="!isDatasetDeleting(dataset.id)"
                        :href="getEditUrl(dataset.id)"
                        class="px-3 py-1.5 rounded-lg transition-colors"
                        style="background: var(--color-primary); color: white"
                        title="Редактировать"
                      >
                        <i class="fas fa-edit"></i>
                      </a>
                      <button
                        v-if="!isDatasetDeleting(dataset.id)"
                        @click="deleteDataset(dataset.id)"
                        class="px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        title="Удалить"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                      <div
                        v-if="isDatasetDeleting(dataset.id)"
                        class="flex flex-col items-end gap-1 min-w-[200px]"
                      >
                        <div class="text-xs text-[var(--color-text-secondary)]">
                          {{ getDeleteProgressText() }}
                        </div>
                        <!-- Прогресс-бар для удаления кэша (с количеством) -->
                        <div
                          v-if="
                            deleteProgress &&
                            deleteProgress.cacheTotal > 0 &&
                            deleteProgress.stage === 'cache'
                          "
                          class="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden"
                        >
                          <div
                            class="h-full bg-[var(--color-primary)] transition-all duration-300"
                            :style="{
                              width: `${Math.round((deleteProgress.cacheProgress / deleteProgress.cacheTotal) * 100)}%`
                            }"
                          ></div>
                        </div>
                        <!-- Прогресс-бар для удаления кэша (без количества, индикатор загрузки) -->
                        <div
                          v-else-if="deleteProgress && deleteProgress.stage === 'cache'"
                          class="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden"
                        >
                          <div
                            class="h-full bg-[var(--color-primary)] animate-pulse"
                            style="width: 100%"
                          ></div>
                        </div>
                        <!-- Прогресс-бар для удаления датасета -->
                        <div
                          v-else-if="deleteProgress && deleteProgress.stage === 'dataset'"
                          class="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden"
                        >
                          <div
                            class="h-full bg-[var(--color-primary)] animate-pulse"
                            style="width: 100%"
                          ></div>
                        </div>
                        <!-- Общий индикатор загрузки, если stage не определен -->
                        <div
                          v-else-if="deleteProgress"
                          class="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden"
                        >
                          <div
                            class="h-full bg-[var(--color-primary)] animate-pulse"
                            style="width: 100%"
                          ></div>
                        </div>
                        <div
                          v-if="deleteProgress && deleteProgress.error"
                          class="text-xs text-red-500"
                        >
                          {{ deleteProgress.error }}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Таблица существующих дашбордов -->
      <div class="mt-8 sm:mt-12 max-w-6xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 class="text-2xl font-bold text-[var(--color-text)]">
            <i class="fas fa-th-large mr-2 text-[var(--color-primary)]"></i>
            Мои дашборды
          </h2>
          <a
            :href="apiUrls.dashboardConfig"
            class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
            style="background: var(--color-primary); color: white"
          >
            <i class="fas fa-plus"></i>
            <span>Создать дашборд</span>
          </a>
        </div>

        <div v-if="dashboards.length === 0" class="card text-center py-12">
          <i class="fas fa-th-large text-5xl text-[var(--color-text-tertiary)] mb-4 opacity-30"></i>
          <p class="text-[var(--color-text-secondary)] mb-4">У вас пока нет дашбордов</p>
          <a
            :href="apiUrls.dashboardConfig"
            class="inline-block px-6 py-3 rounded-lg font-medium transition-all"
            style="background: var(--color-primary); color: white"
          >
            Создать первый дашборд
          </a>
        </div>

        <div v-else class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-[var(--color-card-hover)]">
                <tr>
                  <th
                    class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Название
                  </th>
                  <th
                    class="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Описание
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Компонентов
                  </th>
                  <th
                    class="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Создан
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr
                  v-for="dashboard in dashboards"
                  :key="dashboard.id"
                  class="hover:bg-[var(--color-card-hover)] transition-colors"
                >
                  <td class="px-4 sm:px-6 py-4 align-top">
                    <div class="max-w-xs">
                      <div
                        class="font-medium text-[var(--color-text)] break-all"
                        :title="dashboard.name"
                      >
                        {{ dashboard.name }}
                      </div>
                      <div class="sm:hidden mt-1 text-xs text-[var(--color-text-secondary)]">
                        {{ dashboard.description || '—' }}
                      </div>
                    </div>
                  </td>
                  <td class="hidden sm:table-cell px-6 py-4">
                    <div class="text-sm text-[var(--color-text-secondary)] max-w-xs truncate">
                      {{ dashboard.description || '—' }}
                    </div>
                  </td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      style="
                        background: var(--color-primary-light);
                        color: var(--color-primary);
                        border: 1px solid var(--color-primary);
                      "
                    >
                      {{ getDashboardComponentsCount(dashboard) }}
                    </span>
                  </td>
                  <td
                    class="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]"
                  >
                    {{ formatDate(dashboard.createdAt) }}
                  </td>
                  <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end gap-2">
                      <a
                        :href="getDashboardViewUrl(dashboard.id)"
                        class="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                        :title="`Открыть дашборд «${dashboard.name}»`"
                      >
                        <i class="fas fa-expand"></i>
                      </a>
                      <a
                        :href="getDashboardEditUrl(dashboard.id)"
                        class="px-3 py-1.5 rounded-lg transition-colors"
                        style="background: var(--color-primary); color: white"
                        title="Редактировать"
                      >
                        <i class="fas fa-edit"></i>
                      </a>
                      <button
                        @click="deleteDashboard(dashboard.id)"
                        class="px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        title="Удалить"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TIME_PERIODS } from '../shared/datasetTypes'
import { getOrCreateBrowserSocketClient } from '@app/socket'

// Props - данные с сервера (SSR)
const props = defineProps({
  initialDatasets: {
    type: Array,
    default: () => []
  },
  initialDashboards: {
    type: Array,
    default: () => []
  },
  apiUrls: {
    type: Object,
    required: true // ОБЯЗАТЕЛЬНО! Без хардкода!
  }
})

// URL получаем из props (генерируются на сервере через route.url())
const settingsPageUrl = computed(() => props.apiUrls.settingsPage)
const eventsPageUrl = computed(() => props.apiUrls.eventsPage)

const datasets = ref(props.initialDatasets)
const dashboards = ref(props.initialDashboards)
const loading = ref(false)
const error = ref(null)

// Состояние удаления датасета
const deletingDatasetId = ref(null)
const deleteProgress = ref(null)
const socketSubscription = ref(null)

// Получить URL для редактирования датасета
function getEditUrl(datasetId) {
  // ✅ Используем URL из props и добавляем query параметр
  return `${props.apiUrls.datasetConfig}?id=${datasetId}`
}

// Получить количество компонентов в датасете
function getComponentsCount(dataset) {
  try {
    const config = JSON.parse(dataset.config)
    return config.components?.length || 0
  } catch {
    return 0
  }
}

// Получить название периода
function getTimePeriodName(dataset) {
  try {
    const config = JSON.parse(dataset.config)
    const period = TIME_PERIODS.find((p) => p.id === config.timePeriod)
    return period ? period.name : config.timePeriod || '—'
  } catch {
    return '—'
  }
}

// Форматировать дату
function formatDate(date) {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Удалить датасет (через WebSocket с прогрессом)
async function deleteDataset(datasetId) {
  console.log('[IndexPage:deleteDataset] === НАЧАЛО УДАЛЕНИЯ === datasetId:', datasetId)

  if (!confirm('Вы уверены, что хотите удалить этот датасет?')) {
    console.log('[IndexPage:deleteDataset] пользователь отменил удаление')
    return
  }

  // Блокируем кнопки взаимодействия с этим датасетом
  deletingDatasetId.value = datasetId
  deleteProgress.value = {
    stage: 'cache', // 'cache' | 'dataset' | 'complete'
    cacheProgress: 0,
    cacheTotal: 0,
    error: null
  }
  console.log('[IndexPage:deleteDataset] состояние удаления установлено:', {
    deletingDatasetId: deletingDatasetId.value,
    deleteProgress: deleteProgress.value
  })

  try {
    console.log(
      '[IndexPage:deleteDataset] отправка POST запроса на:',
      props.apiUrls.deleteDataset,
      'с данными:',
      { id: datasetId }
    )

    // Отправляем POST запрос на удаление (JSON вместо FormData для правильной обработки на сервере)
    const response = await fetch(props.apiUrls.deleteDataset, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: datasetId
        // НЕ добавляем _redirect, чтобы получить JSON ответ с socketId
      })
    })

    console.log(
      '[IndexPage:deleteDataset] получен ответ от сервера, status:',
      response.status,
      'content-type:',
      response.headers.get('content-type')
    )

    // Проверяем, что ответ - JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[IndexPage:deleteDataset] ответ не JSON, удаляем строку напрямую')
      // Если ответ не JSON (например, редирект), просто удаляем строку
      removeDatasetFromList(datasetId)
      deletingDatasetId.value = null
      deleteProgress.value = null
      return
    }

    const result = await response.json()
    console.log('[IndexPage:deleteDataset] === ОТВЕТ ОТ СЕРВЕРА ===', {
      result,
      datasetId,
      hasSuccess: result.success,
      hasSocketId: !!result.socketId,
      resultDatasetId: result.datasetId
    })

    if (!result.success) {
      console.error('[IndexPage:deleteDataset] сервер вернул ошибку:', result.error)
      throw new Error(result.error || 'Ошибка при удалении датасета')
    }

    // Используем datasetId из ответа сервера (Heap ID), если он есть
    const serverDatasetId = result.datasetId || datasetId
    console.log('[IndexPage:deleteDataset] === ВЫБОР DATASET ID ===', {
      serverDatasetId,
      originalDatasetId: datasetId,
      match: serverDatasetId === datasetId
    })

    // Обновляем deletingDatasetId на serverDatasetId для корректной обработки событий
    deletingDatasetId.value = serverDatasetId
    console.log('[IndexPage:deleteDataset] deletingDatasetId обновлён на:', deletingDatasetId.value)

    // Если есть socketId, подписываемся на WebSocket для отслеживания прогресса
    if (result.socketId) {
      console.log('[IndexPage:deleteDataset] === ПОДПИСКА НА WEBSOCKET ===', {
        socketId: result.socketId,
        datasetId: serverDatasetId,
        timestamp: new Date().toISOString()
      })
      await subscribeToDeleteProgress(result.socketId, serverDatasetId)
    } else {
      console.warn('[IndexPage:deleteDataset] socketId отсутствует, удаляем строку напрямую')
      // Если нет socketId, просто удаляем строку из таблицы (удаление уже завершено)
      removeDatasetFromList(serverDatasetId)
      deletingDatasetId.value = null
      deleteProgress.value = null
    }
  } catch (error) {
    console.error('[IndexPage:deleteDataset] === ОШИБКА ===', {
      error,
      message: error.message,
      stack: error.stack,
      datasetId
    })
    if (deleteProgress.value) {
      deleteProgress.value.error = error.message || 'Неизвестная ошибка'
    }
    // Разблокируем кнопки через 3 секунды
    setTimeout(() => {
      deletingDatasetId.value = null
      deleteProgress.value = null
    }, 3000)
  }
}

// Подписка на WebSocket для отслеживания прогресса удаления
async function subscribeToDeleteProgress(socketId, datasetId) {
  console.log('[IndexPage:subscribeToDeleteProgress] === НАЧАЛО ПОДПИСКИ ===', {
    socketId,
    datasetId,
    timestamp: new Date().toISOString()
  })

  try {
    // Отписываемся от предыдущей подписки, если есть
    if (socketSubscription.value) {
      console.log('[IndexPage:subscribeToDeleteProgress] отписка от предыдущей подписки')
      if (typeof socketSubscription.value.unsubscribe === 'function') {
        socketSubscription.value.unsubscribe()
      }
      socketSubscription.value = null
    }

    console.log('[IndexPage:subscribeToDeleteProgress] получение WebSocket клиента...')
    // Получаем WebSocket клиент и подписываемся
    const socketClient = await getOrCreateBrowserSocketClient()
    console.log(
      '[IndexPage:subscribeToDeleteProgress] WebSocket клиент получен, создание подписки...'
    )

    socketSubscription.value = socketClient.subscribeToData(socketId)
    console.log('[IndexPage:subscribeToDeleteProgress] === ПОДПИСКА СОЗДАНА ===', {
      socketId,
      datasetId,
      subscription: !!socketSubscription.value,
      timestamp: new Date().toISOString()
    })

    // Отправляем подтверждение готовности на сервер
    try {
      console.log(
        '[IndexPage:subscribeToDeleteProgress] === ОТПРАВКА ПОДТВЕРЖДЕНИЯ ГОТОВНОСТИ ===',
        {
          datasetId,
          apiUrl: props.apiUrls.deleteDatasetReady,
          timestamp: new Date().toISOString()
        }
      )

      const readyResponse = await fetch(props.apiUrls.deleteDatasetReady, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasetId: datasetId
        })
      })

      if (readyResponse.ok) {
        const readyResult = await readyResponse.json()
        console.log(
          '[IndexPage:subscribeToDeleteProgress] === ПОДТВЕРЖДЕНИЕ ГОТОВНОСТИ ОТПРАВЛЕНО ===',
          {
            success: readyResult.success,
            datasetId,
            timestamp: new Date().toISOString()
          }
        )
      } else {
        const errorText = await readyResponse.text()
        console.error(
          '[IndexPage:subscribeToDeleteProgress] === ОШИБКА ОТПРАВКИ ПОДТВЕРЖДЕНИЯ ===',
          {
            status: readyResponse.status,
            statusText: readyResponse.statusText,
            errorText,
            datasetId
          }
        )
      }
    } catch (readyError) {
      console.error(
        '[IndexPage:subscribeToDeleteProgress] === ОШИБКА ОТПРАВКИ ПОДТВЕРЖДЕНИЯ (исключение) ===',
        {
          error: readyError,
          message: readyError?.message,
          datasetId
        }
      )
    }

    // Обрабатываем сообщения
    console.log('[IndexPage:subscribeToDeleteProgress] установка обработчика сообщений...')
    socketSubscription.value.listen((data) => {
      console.log('[IndexPage:subscribeToDeleteProgress] === WEBSOCKET СООБЩЕНИЕ ПОЛУЧЕНО ===', {
        type: data.type,
        data: data.data,
        fullData: data,
        expectedDatasetId: datasetId,
        currentDeletingDatasetId: deletingDatasetId.value,
        currentDeleteProgress: deleteProgress.value,
        timestamp: new Date().toISOString()
      })

      // Проверяем, что состояние удаления все еще активно
      if (!deleteProgress.value || deletingDatasetId.value !== datasetId) {
        console.warn(
          '[IndexPage:subscribeToDeleteProgress] состояние удаления уже очищено, игнорируем сообщение',
          {
            hasDeleteProgress: !!deleteProgress.value,
            deletingDatasetId: deletingDatasetId.value,
            expectedDatasetId: datasetId,
            messageType: data.type
          }
        )
        return
      }

      if (data.type === 'dataset-delete-start') {
        // Начало удаления
        if (!deleteProgress.value) return
        deleteProgress.value.stage = 'cache'
        deleteProgress.value.cacheProgress = 0
        deleteProgress.value.cacheTotal = 0
        deleteProgress.value.error = null
      } else if (data.type === 'dataset-cache-delete-start') {
        // Начало удаления кэша (может быть для компонента или для всего датасета)
        // Проверяем, есть ли datasetId в данных (это удаление всего кэша датасета)
        if (!deleteProgress.value) return

        // Обрабатываем сообщение, если datasetId совпадает или не указан (для пустого кэша)
        const messageDatasetId = data.data?.datasetId
        if (!messageDatasetId || messageDatasetId === datasetId) {
          const total = data.data?.total || 0

          console.log(
            '[IndexPage:subscribeToDeleteProgress] dataset-cache-delete-start обработано:',
            {
              total,
              messageDatasetId,
              expectedDatasetId: datasetId,
              action:
                total === 0 ? 'переход к удалению датасета (кэш пуст)' : 'начало удаления кэша'
            }
          )

          // Если total = 0, значит кэша нет, сразу переходим к удалению датасета
          if (total === 0) {
            deleteProgress.value.stage = 'dataset'
            deleteProgress.value.cacheProgress = 0
            deleteProgress.value.cacheTotal = 0
          } else {
            deleteProgress.value.stage = 'cache'
            deleteProgress.value.cacheProgress = 0
            deleteProgress.value.cacheTotal = total
          }
        } else {
          console.warn(
            '[IndexPage:subscribeToDeleteProgress] dataset-cache-delete-start проигнорировано (datasetId не совпадает):',
            {
              messageDatasetId,
              expectedDatasetId: datasetId
            }
          )
        }
      } else if (data.type === 'dataset-cache-delete-progress') {
        // Прогресс удаления кэша (может быть для компонента или для всего датасета)
        // Проверяем, есть ли datasetId в данных (это удаление всего кэша датасета)
        if (!deleteProgress.value) return
        if (data.data.datasetId === datasetId) {
          const total = data.data.total || 0
          const deleted = data.data.deleted || 0

          // Если total = 0, значит кэша нет, сразу переходим к удалению датасета
          if (total === 0) {
            deleteProgress.value.stage = 'dataset'
            deleteProgress.value.cacheProgress = 0
            deleteProgress.value.cacheTotal = 0
          } else {
            deleteProgress.value.stage = 'cache'
            deleteProgress.value.cacheProgress = deleted
            deleteProgress.value.cacheTotal = total
          }
        }
      } else if (data.type === 'dataset-cache-delete-complete') {
        // Удаление кэша завершено
        console.log(
          '[IndexPage:subscribeToDeleteProgress] === ОБРАБОТКА dataset-cache-delete-complete ===',
          {
            receivedData: data.data,
            expectedDatasetId: datasetId,
            receivedDatasetId: data.data?.datasetId,
            match: data.data?.datasetId === datasetId,
            deletingDatasetId: deletingDatasetId.value,
            currentStage: deleteProgress.value?.stage
          }
        )

        // Обрабатываем событие независимо от datasetId (для пустого кэша datasetId может не совпадать)
        if (!deleteProgress.value) return

        // Если total = 0, значит кэша не было, сразу переходим к удалению датасета
        const total = data.data?.total || 0
        const deleted = data.data?.deleted || 0

        console.log(
          '[IndexPage:subscribeToDeleteProgress] dataset-cache-delete-complete обработано:',
          {
            total,
            deleted,
            action: total === 0 ? 'переход к удалению датасета' : 'обновление прогресса'
          }
        )

        if (total === 0) {
          // Кэша не было - сразу переходим к удалению датасета
          deleteProgress.value.stage = 'dataset'
          deleteProgress.value.cacheProgress = 0
          deleteProgress.value.cacheTotal = 0
          console.log(
            '[IndexPage:subscribeToDeleteProgress] переход к стадии удаления датасета (кэш пуст)'
          )
        } else {
          // Кэш был удален - обновляем прогресс
          deleteProgress.value.stage = 'dataset'
          deleteProgress.value.cacheProgress = deleted
          deleteProgress.value.cacheTotal = total
          console.log('[IndexPage:subscribeToDeleteProgress] обновлен прогресс удаления кэша:', {
            deleted,
            total
          })
        }
      } else if (data.type === 'dataset-delete-complete') {
        // Удаление датасета завершено
        console.log(
          '[IndexPage:subscribeToDeleteProgress] === ОБРАБОТКА dataset-delete-complete ===',
          {
            receivedData: data.data,
            expectedDatasetId: datasetId,
            receivedDatasetId: data.data?.datasetId || data.data?.id,
            deletingDatasetId: deletingDatasetId.value,
            currentStage: deleteProgress.value?.stage
          }
        )

        const eventDatasetId = data.data?.datasetId || data.data?.id

        // Проверяем, что событие относится к нашему датасету
        if (eventDatasetId && eventDatasetId !== datasetId) {
          console.warn('[IndexPage:subscribeToDeleteProgress] datasetId НЕ СОВПАДАЕТ!', {
            received: eventDatasetId,
            expected: datasetId,
            match: false,
            action: 'игнорируем событие'
          })
          return
        }

        // Проверяем, что мы действительно удаляем этот датасет
        if (deletingDatasetId.value && deletingDatasetId.value !== datasetId) {
          console.warn('[IndexPage:subscribeToDeleteProgress] deletingDatasetId НЕ СОВПАДАЕТ!', {
            current: deletingDatasetId.value,
            expected: datasetId,
            match: false,
            action: 'игнорируем событие'
          })
          return
        }

        console.log('[IndexPage:subscribeToDeleteProgress] === УДАЛЕНИЕ ЗАВЕРШЕНО ===', {
          datasetId,
          action: 'удаляем строку из таблицы'
        })
        if (!deleteProgress.value) return
        deleteProgress.value.stage = 'complete'

        // Удаляем строку из таблицы
        removeDatasetFromList(datasetId)

        // Очищаем состояние через небольшую задержку
        setTimeout(() => {
          deletingDatasetId.value = null
          deleteProgress.value = null

          // Отписываемся от WebSocket
          if (socketSubscription.value) {
            if (typeof socketSubscription.value.unsubscribe === 'function') {
              socketSubscription.value.unsubscribe()
            }
            socketSubscription.value = null
          }
        }, 1000)
      } else if (
        data.type === 'dataset-delete-error' ||
        data.type === 'dataset-cache-delete-error'
      ) {
        // Ошибка при удалении
        if (!deleteProgress.value) return
        deleteProgress.value.error = data.data.error || 'Ошибка при удалении'

        // Разблокируем кнопки через 5 секунд
        setTimeout(() => {
          deletingDatasetId.value = null
          deleteProgress.value = null

          // Отписываемся от WebSocket
          if (socketSubscription.value) {
            if (typeof socketSubscription.value.unsubscribe === 'function') {
              socketSubscription.value.unsubscribe()
            }
            socketSubscription.value = null
          }
        }, 5000)
      }
    })
  } catch (error) {
    console.error('[IndexPage] Ошибка подписки на WebSocket:', error)
    if (deleteProgress.value) {
      deleteProgress.value.error = 'Ошибка подключения к серверу'
    }

    // Разблокируем кнопки через 3 секунды
    setTimeout(() => {
      deletingDatasetId.value = null
      deleteProgress.value = null
    }, 3000)
  }
}

// Удалить датасет из списка
function removeDatasetFromList(datasetId) {
  const index = datasets.value.findIndex((d) => d.id === datasetId)
  if (index !== -1) {
    datasets.value.splice(index, 1)
  }
}

// Проверить, удаляется ли датасет
function isDatasetDeleting(datasetId) {
  return deletingDatasetId.value === datasetId
}

// Получить текст прогресса удаления
function getDeleteProgressText() {
  if (!deleteProgress.value) return ''

  if (deleteProgress.value.error) {
    return `Ошибка: ${deleteProgress.value.error}`
  }

  if (deleteProgress.value.stage === 'cache') {
    const total = deleteProgress.value.cacheTotal
    const progress = deleteProgress.value.cacheProgress
    if (total > 0) {
      const percentage = Math.round((progress / total) * 100)
      return `Удаление кэша: ${progress} / ${total} (${percentage}%)`
    }
    return 'Удаление кэша...'
  } else if (deleteProgress.value.stage === 'dataset') {
    return 'Удаление датасета...'
  } else if (deleteProgress.value.stage === 'complete') {
    return 'Удаление завершено'
  }

  return 'Удаление...'
}

// Получить URL для редактирования дашборда
function getDashboardEditUrl(dashboardId) {
  return `${props.apiUrls.dashboardConfig}?id=${dashboardId}`
}

// Получить URL для полноэкранного просмотра дашборда
function getDashboardViewUrl(dashboardId) {
  return `${props.apiUrls.dashboardView}?id=${dashboardId}`
}

// Количество компонентов в дашборде
function getDashboardComponentsCount(dashboard) {
  try {
    const config = JSON.parse(dashboard.config || '{}')
    return config.components?.length || 0
  } catch {
    return 0
  }
}

// Удалить дашборд (через перезагрузку страницы)
function deleteDashboard(dashboardId) {
  if (!confirm('Вы уверены, что хотите удалить этот дашборд?')) {
    return
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = props.apiUrls.deleteDashboard

  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'id'
  input.value = dashboardId

  const redirectInput = document.createElement('input')
  redirectInput.type = 'hidden'
  redirectInput.name = '_redirect'
  redirectInput.value = props.apiUrls.indexPage

  form.appendChild(input)
  form.appendChild(redirectInput)
  document.body.appendChild(form)
  form.submit()
}

onMounted(() => {
  // Тема уже инициализирована в index.tsx до монтирования Vue
  // Здесь только скрываем прелоадер
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
})

onUnmounted(() => {
  // Отписываемся от WebSocket при размонтировании компонента
  if (socketSubscription.value) {
    if (typeof socketSubscription.value.unsubscribe === 'function') {
      socketSubscription.value.unsubscribe()
    }
    socketSubscription.value = null
  }
})
</script>
