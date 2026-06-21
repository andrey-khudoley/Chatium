<template>
  <div
    class="min-h-screen"
    :class="isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'"
  >
    <!-- Основной контент -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Кнопки действий -->
      <div class="mb-6 flex justify-end items-start">
        <div class="flex space-x-3">
          <button
            @click="saveDataset"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            "
            :disabled="isSaving"
          >
            <i class="fas fa-save mr-2"></i>
            {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <a
            :href="indexUrl"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            "
          >
            <i class="fas fa-times mr-2"></i>
            Отменить
          </a>
        </div>
      </div>

      <!-- Прогресс загрузки кэша -->
      <div
        v-if="cacheLoading.show"
        class="mb-6 p-6 rounded-lg border-2"
        :class="isDark ? 'bg-gray-800 border-blue-500' : 'bg-white border-blue-500'"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">
            <i class="fas fa-database mr-2"></i>
            Загрузка кэша датасета
          </h3>
          <button
            v-if="cacheLoading.error"
            @click="cacheLoading.show = false"
            class="text-red-500 hover:text-red-600"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Общий прогресс -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium">Общий прогресс</span>
            <span class="text-sm font-bold">{{ cacheLoading.overallProgress }}%</span>
          </div>
          <div
            class="w-full bg-gray-200 rounded-full h-3"
            :class="isDark ? 'bg-gray-700' : 'bg-gray-200'"
          >
            <div
              :class="
                cacheLoading.error
                  ? 'bg-red-500'
                  : cacheLoading.complete && !cacheLoading.error
                    ? 'bg-green-500'
                    : 'bg-blue-500'
              "
              class="h-3 rounded-full transition-all duration-300"
              :style="{ width: cacheLoading.overallProgress + '%' }"
            ></div>
          </div>
          <div class="text-xs mt-1 opacity-70">
            Компонент {{ cacheLoading.currentComponent }} из {{ cacheLoading.totalComponents }}
          </div>
        </div>

        <!-- Прогресс по компонентам -->
        <div v-if="cacheLoading.components && cacheLoading.components.length > 0" class="space-y-3">
          <div
            v-for="(comp, index) in cacheLoading.components"
            :key="comp.componentId"
            class="p-3 rounded-lg"
            :class="isDark ? 'bg-gray-700' : 'bg-gray-50'"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">{{ comp.componentTitle || comp.componentId }}</span>
              <span class="text-sm font-bold">{{ comp.percentage }}%</span>
            </div>
            <div
              class="w-full bg-gray-200 rounded-full h-2"
              :class="isDark ? 'bg-gray-600' : 'bg-gray-200'"
            >
              <div
                :class="comp.isDeleting ? 'bg-red-500' : 'bg-green-500'"
                class="h-2 rounded-full transition-all duration-300"
                :style="{ width: comp.percentage + '%' }"
              ></div>
            </div>
            <div class="text-xs mt-1 opacity-70">
              {{ comp.isDeleting ? 'Очищено' : 'Загружено' }} {{ comp.loaded }} из {{ comp.total }}
            </div>
          </div>
        </div>

        <!-- Сообщение об ошибке -->
        <div
          v-if="cacheLoading.error"
          class="mt-4 p-3 rounded-lg bg-red-100 border border-red-300"
          :class="isDark ? 'bg-red-900 border-red-700' : 'bg-red-100 border-red-300'"
        >
          <div class="flex items-center">
            <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
            <span
              class="text-red-700 font-medium"
              :class="isDark ? 'text-red-300' : 'text-red-700'"
            >
              Ошибка загрузки: {{ cacheLoading.error }}
            </span>
          </div>
        </div>
      </div>

      <!-- Основные данные датасета -->
      <div class="mb-6 p-6 rounded-lg" :class="isDark ? 'bg-gray-800' : 'bg-white'">
        <h2 class="text-xl font-bold mb-4">
          <i class="fas fa-info-circle mr-2"></i>
          Основная информация
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Название датасета</label>
            <input
              v-model="datasetName"
              type="text"
              placeholder="Введите название датасета"
              class="w-full px-4 py-2 rounded-lg border transition-colors"
              :class="
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              "
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Описание (опционально)</label>
            <textarea
              v-model="datasetDescription"
              rows="3"
              placeholder="Введите описание датасета"
              class="w-full px-4 py-2 rounded-lg border transition-colors"
              :class="
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              "
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Компоненты датасета -->
      <div class="mb-6 p-6 rounded-lg" :class="isDark ? 'bg-gray-800' : 'bg-white'">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">
            <i class="fas fa-database mr-2"></i>
            Компоненты датасета
          </h2>
          <button
            @click="addNewComponent"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="
              isDark
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            "
          >
            <i class="fas fa-plus mr-2"></i>
            Добавить компонент
          </button>
        </div>

        <!-- Список компонентов -->
        <div v-if="components.length === 0" class="text-center py-8 opacity-70">
          <i class="fas fa-inbox text-4xl mb-4"></i>
          <p>Пока нет компонентов. Добавьте первый компонент, чтобы начать!</p>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="(component, index) in components"
            :key="component.id"
            class="p-4 rounded-lg border transition-all relative"
            :class="
              isDark
                ? 'bg-gray-700 border-gray-600 hover:border-gray-500'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            "
          >
            <!-- Индикатор каскадной связи -->
            <div
              v-if="index > 0"
              class="absolute -top-2 left-8 px-2 py-0.5 rounded text-xs font-medium"
              :class="isDark ? 'bg-blue-600 text-blue-100' : 'bg-blue-100 text-blue-800'"
            >
              <i class="fas fa-link mr-1"></i>
              Уточнение предыдущих
            </div>

            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <i class="fas fa-chart-bar text-lg"></i>
                  <span class="font-medium">{{ component.title }}</span>
                  <span
                    v-if="index === 0"
                    class="text-xs px-2 py-0.5 rounded"
                    :class="
                      isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                    "
                  >
                    Базовый
                  </span>
                </div>
                <div class="text-sm opacity-70 mb-1">
                  Событие: {{ getComponentEventDescription(component) }}
                </div>
                <div
                  v-if="index > 0"
                  class="text-xs opacity-60 mt-1 mb-1 italic"
                  :class="isDark ? 'text-blue-300' : 'text-blue-700'"
                >
                  <i class="fas fa-database mr-1"></i>
                  Загружено записей: {{ getComponentRecordCount(component.id) }}
                </div>
                <div v-if="component.settings?.description" class="text-sm opacity-70 mt-1">
                  {{ component.settings.description }}
                </div>
                <div
                  v-if="
                    component.settings?.filter &&
                    ((component.settings.filter.operator &&
                      Array.isArray(component.settings.filter.conditions) &&
                      component.settings.filter.conditions.length > 0) ||
                      (Array.isArray(component.settings.filter) &&
                        component.settings.filter.length > 0))
                  "
                  class="text-sm opacity-70 mt-1"
                >
                  <i class="fas fa-filter mr-1"></i>
                  Фильтры:
                  {{
                    getFilterDescription(
                      component.settings.filter.conditions || component.settings.filter
                    )
                  }}
                </div>
                <div
                  v-else-if="component.settings?.urls && component.settings.urls.length > 0"
                  class="text-sm opacity-70 mt-1"
                >
                  <i class="fas fa-filter mr-1"></i>
                  URL: {{ component.settings.urls.join(' или ') }}
                </div>
              </div>
              <div class="flex space-x-2">
                <button
                  @click="editComponent(index)"
                  class="p-2 rounded transition-colors"
                  :class="isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'"
                  title="Редактировать"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  @click="removeComponent(index)"
                  class="p-2 rounded transition-colors text-red-500 hover:bg-red-100"
                  :class="isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-100'"
                  title="Удалить"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Сообщения -->
      <div
        v-if="message"
        class="mb-6 p-4 rounded-lg"
        :class="
          message.type === 'success'
            ? isDark
              ? 'bg-green-900/50 text-green-300'
              : 'bg-green-100 text-green-800'
            : isDark
              ? 'bg-red-900/50 text-red-300'
              : 'bg-red-100 text-red-800'
        "
      >
        <i
          :class="message.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"
          class="mr-2"
        ></i>
        {{ message.text }}
      </div>
    </div>

    <!-- Модальное окно редактирования компонента -->
    <div
      v-if="editingComponentIndex !== null"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-24"
      @click.self="cancelEdit"
    >
      <div
        class="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        :class="isDark ? 'bg-gray-800' : 'bg-white'"
      >
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">
              <i class="fas fa-edit mr-2"></i>
              Редактирование компонента
            </h3>
            <button @click="cancelEdit" class="p-2 rounded hover:bg-gray-700">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="space-y-6" v-if="editingComponent">
            <!-- Название компонента -->
            <div>
              <label class="block text-sm font-medium mb-2">Название компонента</label>
              <input
                v-model="editingComponent.title"
                type="text"
                placeholder="Например: Регистрации пользователей"
                class="w-full px-4 py-2 rounded-lg border"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                "
              />
            </div>

            <!-- Описание -->
            <div>
              <label class="block text-sm font-medium mb-2">Описание (опционально)</label>
              <textarea
                v-model="editingComponent.settings.description"
                rows="2"
                placeholder="Краткое описание компонента"
                class="w-full px-4 py-2 rounded-lg border"
                :class="
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                "
              ></textarea>
            </div>

            <!-- Выбор ОДНОГО типа события -->
            <div>
              <label class="block text-sm font-medium mb-2">Тип события из ClickHouse</label>
              <div
                class="border rounded-lg p-4 max-h-48 overflow-y-auto"
                :class="isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'"
              >
                <!-- HTTP События -->
                <div class="mb-4">
                  <div class="font-medium mb-2 flex items-center">
                    <i class="fas fa-globe mr-2"></i>
                    HTTP События
                  </div>
                  <div class="space-y-2 ml-6">
                    <label
                      v-for="event in trafficEvents"
                      :key="event.name"
                      class="flex items-center space-x-2 cursor-pointer hover:opacity-80"
                    >
                      <input
                        type="radio"
                        name="eventType"
                        :value="event.name"
                        v-model="editingComponent.eventType"
                        class="rounded"
                      />
                      <span class="text-sm">{{ event.description }} ({{ event.name }})</span>
                    </label>
                  </div>
                </div>

                <!-- События GetCourse -->
                <div class="mb-4">
                  <div class="font-medium mb-2 flex items-center">
                    <i class="fas fa-graduation-cap mr-2"></i>
                    События GetCourse
                  </div>
                  <div class="space-y-2 ml-6">
                    <label
                      v-for="event in getcourseEvents"
                      :key="event.name"
                      class="flex items-center space-x-2 cursor-pointer hover:opacity-80"
                    >
                      <input
                        type="radio"
                        name="eventType"
                        :value="event.name"
                        v-model="editingComponent.eventType"
                        class="rounded"
                      />
                      <span class="text-sm">{{ event.description }} ({{ event.name }})</span>
                    </label>
                  </div>
                </div>

                <!-- Категории -->
                <div>
                  <div class="font-medium mb-2 flex items-center">
                    <i class="fas fa-folder mr-2"></i>
                    Категории (паттерны)
                  </div>
                  <div class="space-y-2 ml-6">
                    <label
                      v-for="event in eventCategories"
                      :key="event.name"
                      class="flex items-center space-x-2 cursor-pointer hover:opacity-80"
                    >
                      <input
                        type="radio"
                        name="eventType"
                        :value="event.name"
                        v-model="editingComponent.eventType"
                        class="rounded"
                      />
                      <span class="text-sm">{{ event.description }}</span>
                    </label>
                  </div>
                </div>
              </div>
              <p class="text-xs mt-2 opacity-70">
                Выбрано:
                {{
                  editingComponent.eventType
                    ? getComponentEventDescription({ eventType: editingComponent.eventType })
                    : 'не выбрано'
                }}
              </p>
            </div>

            <!-- Динамические настройки события -->
            <div v-if="showEventSettings" :key="`settings-${editingComponent.eventType}`">
              <div
                class="border-t pt-4 mt-4"
                :class="isDark ? 'border-gray-700' : 'border-gray-200'"
              >
                <h3 class="text-sm font-semibold mb-3">
                  <i class="fas fa-sliders-h mr-2"></i>
                  Настройки события
                </h3>
                <component
                  v-if="eventSettingsComponent"
                  :is="eventSettingsComponent"
                  :key="editingComponent.eventType"
                  :settings="editingComponent.settings"
                  :isDark="isDark"
                  @update:settings="updateEventSettings"
                />
              </div>
            </div>

            <!-- Кнопки действий -->
            <div
              class="flex justify-end space-x-3 pt-4 border-t"
              :class="isDark ? 'border-gray-700' : 'border-gray-200'"
            >
              <button
                @click="cancelEdit"
                class="px-4 py-2 rounded-lg font-medium transition-colors"
                :class="
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                "
              >
                Отменить
              </button>
              <button
                @click="saveEditingComponent"
                class="px-4 py-2 rounded-lg font-medium transition-colors"
                :class="
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                "
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  getTrafficEvents,
  getGetCourseEvents,
  getEventCategories,
  getAllEvents
} from '../shared/eventTypes'
import PageviewEventSettings from '../components/dataset-event-settings/PageviewEventSettings.vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

// Props
const props = defineProps({
  initialDataset: {
    type: Object,
    default: null
  },
  apiUrls: {
    type: Object,
    required: true // ОБЯЗАТЕЛЬНО! Без хардкода!
  }
})

// Состояние темы
const isDark = ref(false)

// Основные данные датасета
const datasetId = ref(props.initialDataset?.id || null)
const datasetName = ref(props.initialDataset?.name || '')
const datasetDescription = ref(props.initialDataset?.description || '')
const components = ref([])
const componentCounts = ref({})

// Состояния UI
const isSaving = ref(false)
const editingComponentIndex = ref(null)
const editingComponent = ref(null)
const message = ref(null)

// Состояние загрузки кэша
const cacheLoading = ref({
  show: false,
  overallProgress: 0,
  currentComponent: 0,
  totalComponents: 0,
  components: [],
  error: null,
  complete: false
})

// WebSocket для прогресса
let socketClient = null
let socketSubscription = null

// Типы событий из ClickHouse
const trafficEvents = getTrafficEvents()
const getcourseEvents = getGetCourseEvents()
const eventCategories = getEventCategories()
const availableEvents = getAllEvents()

// Определение компонента настроек в зависимости от типа события
const eventSettingsComponent = computed(() => {
  const eventType = editingComponent.value?.eventType

  if (!eventType) {
    return null
  }

  // Настройки для конкретных событий
  switch (eventType) {
    case 'pageview':
      return PageviewEventSettings

    // Другие события пока не имеют специфичных настроек
    default:
      return null
  }
})

// Показывать ли блок настроек события
const showEventSettings = computed(() => {
  return !!eventSettingsComponent.value && !!editingComponent.value?.eventType
})

// Вычисляемые свойства
const isEditMode = computed(() => !!datasetId.value)
const indexUrl = computed(() => props.apiUrls.indexPage)

// Загрузка количества записей для компонентов
async function loadComponentCounts() {
  if (!datasetId.value) {
    return
  }

  try {
    // Получаем URL для API endpoint
    // URL имеет формат /api/datasets/component-counts/:datasetId, нужно заменить :datasetId
    let apiUrl = props.apiUrls.componentCounts
    if (apiUrl && apiUrl.includes(':datasetId')) {
      apiUrl = apiUrl.replace(':datasetId', datasetId.value)
    } else {
      // Fallback, если URL не передан или не содержит :datasetId
      apiUrl = `/api/datasets/component-counts/${datasetId.value}`
    }

    const response = await fetch(apiUrl)
    const result = await response.json()

    if (result.success && result.componentCounts) {
      componentCounts.value = result.componentCounts
    }
  } catch (error) {
    console.error('Error loading component counts:', error)
  }
}

// Загрузка конфигурации при монтировании
onMounted(async () => {
  // Загрузка темы из localStorage
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'

  // Загрузка конфигурации датасета
  if (props.initialDataset?.config) {
    try {
      const config = JSON.parse(props.initialDataset.config)

      // Загружаем компоненты
      const loadedComponents = config.components || []

      // Нормализация компонентов - гарантируем наличие всех обязательных полей
      components.value = loadedComponents.map((comp) => {
        const settings = comp.settings || {}
        // Поддерживаем новый формат (filter), старый формат (urlGroups) и очень старый (urls) для обратной совместимости
        const normalizedSettings = {
          description: settings.description || ''
        }

        // Если есть новый формат filter - используем его
        // Поддерживаем и объект { operator, conditions }, и массив (для обратной совместимости)
        if (settings.filter) {
          if (settings.filter.operator && Array.isArray(settings.filter.conditions)) {
            // Новый формат: объект с operator и conditions
            normalizedSettings.filter = {
              operator: settings.filter.operator || 'OR',
              conditions: JSON.parse(JSON.stringify(settings.filter.conditions))
            }
          } else if (Array.isArray(settings.filter) && settings.filter.length > 0) {
            // Старый формат: массив (для обратной совместимости)
            normalizedSettings.filter = JSON.parse(JSON.stringify(settings.filter))
          }
        } else if (
          settings.urlGroups &&
          Array.isArray(settings.urlGroups) &&
          settings.urlGroups.length > 0
        ) {
          // Старый формат urlGroups - сохраняем для обратной совместимости, компонент преобразует
          normalizedSettings.urlGroups = settings.urlGroups.map((group) => ({
            urls: Array.isArray(group.urls) ? [...group.urls] : []
          }))
        } else if (settings.urls && Array.isArray(settings.urls) && settings.urls.length > 0) {
          // Очень старый формат - сохраняем для обратной совместимости, компонент преобразует
          normalizedSettings.urls = [...settings.urls]
          normalizedSettings.urlOperator = settings.urlOperator || 'OR'
        }

        return {
          id: comp.id || `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: comp.title || 'Компонент без названия',
          eventType: comp.eventType || comp.eventTypes?.[0] || '', // Поддержка старого формата
          settings: normalizedSettings
        }
      })

      // Загружаем количество записей для компонентов
      await loadComponentCounts()
    } catch (error) {
      console.error('Error parsing dataset config:', error)
      components.value = []
    }
  }
})

// Блокировка скролла при открытии модального окна
watch(editingComponentIndex, (newValue) => {
  if (newValue !== null) {
    // Модальное окно открыто - блокируем скролл
    document.body.style.overflow = 'hidden'
  } else {
    // Модальное окно закрыто - разблокируем скролл
    document.body.style.overflow = ''
  }
})

// Очистка специфичных настроек при смене типа события
watch(
  () => editingComponent.value?.eventType,
  (newType, oldType) => {
    if (newType && oldType && newType !== oldType && editingComponent.value) {
      // Сохраняем только description, очищаем остальные настройки
      const description = editingComponent.value.settings.description
      editingComponent.value.settings = {
        description: description || '',
        urlGroups: []
      }
    }
  }
)

// Восстанавливаем скролл при размонтировании компонента
onUnmounted(() => {
  document.body.style.overflow = ''
})

// Переключение темы
function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Получить описание события компонента
function getComponentEventDescription(component) {
  if (!component.eventType) {
    return 'Событие не выбрано'
  }
  const event = availableEvents.find((e) => e.name === component.eventType)
  return event ? event.description : component.eventType
}

// Получить описание фильтров
function getFilterDescription(filter) {
  if (!filter || !Array.isArray(filter) || filter.length === 0) {
    return 'нет фильтров'
  }

  const count = filter.length
  if (count === 1) {
    const item = filter[0]
    if ('property' in item) {
      return `${item.property} ${item.operator} ${item.value || ''}`
    } else if ('conditions' in item) {
      return `Группа ${item.operator} (${item.conditions.length} правил)`
    }
  }

  return `${count} правил`
}

// Получить количество записей для компонента
function getComponentRecordCount(componentId) {
  const count = componentCounts.value[componentId]
  if (count === undefined || count === null) {
    return '—'
  }
  return count.toLocaleString('ru-RU')
}

// Добавить новый компонент
function addNewComponent() {
  const newComponent = {
    id: `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: `Компонент ${components.value.length + 1}`,
    eventType: '', // Один тип события
    settings: {
      description: '',
      filter: []
    }
  }
  components.value.push(newComponent)
  // Сразу открываем редактирование
  editComponent(components.value.length - 1)
}

// Редактирование компонента
function editComponent(index) {
  editingComponentIndex.value = index
  const component = components.value[index]

  // Создаём глубокую копию для редактирования с гарантией всех полей
  const settings = component.settings || {}
  const normalizedSettings = {
    description: settings.description || ''
  }

  // Поддерживаем новый формат (filter), старый формат (urlGroups) и очень старый (urls) для обратной совместимости
  // Поддерживаем и объект { operator, conditions }, и массив (для обратной совместимости)
  if (settings.filter) {
    if (settings.filter.operator && Array.isArray(settings.filter.conditions)) {
      // Новый формат: объект с operator и conditions
      normalizedSettings.filter = {
        operator: settings.filter.operator || 'OR',
        conditions: JSON.parse(JSON.stringify(settings.filter.conditions))
      }
    } else if (Array.isArray(settings.filter) && settings.filter.length > 0) {
      // Старый формат: массив (для обратной совместимости)
      normalizedSettings.filter = JSON.parse(JSON.stringify(settings.filter))
    }
  } else if (
    settings.urlGroups &&
    Array.isArray(settings.urlGroups) &&
    settings.urlGroups.length > 0
  ) {
    // Старый формат - сохраняем для обратной совместимости, компонент преобразует
    normalizedSettings.urlGroups = settings.urlGroups.map((group) => ({
      urls: Array.isArray(group.urls) ? [...group.urls] : []
    }))
  } else if (settings.urls && Array.isArray(settings.urls) && settings.urls.length > 0) {
    // Очень старый формат - сохраняем для обратной совместимости, компонент преобразует
    normalizedSettings.urls = [...settings.urls]
    normalizedSettings.urlOperator = settings.urlOperator || 'OR'
  } else {
    normalizedSettings.filter = []
  }

  editingComponent.value = {
    id: component.id,
    title: component.title,
    eventType: component.eventType || '',
    settings: normalizedSettings
  }
}

// Сохранить изменения компонента
function saveEditingComponent() {
  if (!editingComponent.value.title.trim()) {
    showMessage('Название компонента обязательно', 'error')
    return
  }
  if (!editingComponent.value.eventType) {
    showMessage('Выберите тип события', 'error')
    return
  }

  console.log('[DatasetConfigPage] saveEditingComponent вызвана')
  console.log(
    '[DatasetConfigPage] editingComponent.value.settings:',
    editingComponent.value.settings
  )

  // Создаём глубокую копию для сохранения
  const componentToSave = {
    ...editingComponent.value,
    settings: {
      ...editingComponent.value.settings
    }
  }

  // Убеждаемся, что filter правильно сериализуется
  if (componentToSave.settings.filter) {
    if (
      componentToSave.settings.filter.operator &&
      Array.isArray(componentToSave.settings.filter.conditions)
    ) {
      // Уже правильный формат
      componentToSave.settings.filter = {
        operator: componentToSave.settings.filter.operator,
        conditions: JSON.parse(JSON.stringify(componentToSave.settings.filter.conditions))
      }
    }
  }

  console.log('[DatasetConfigPage] componentToSave перед сохранением:', componentToSave)

  components.value[editingComponentIndex.value] = componentToSave
  cancelEdit()
  showMessage('Компонент обновлён', 'success')
}

// Отменить редактирование
function cancelEdit() {
  editingComponentIndex.value = null
  editingComponent.value = null
}

// Удаление компонента
function removeComponent(index) {
  if (confirm('Вы уверены, что хотите удалить этот компонент?')) {
    components.value.splice(index, 1)
    showMessage('Компонент удалён', 'success')
  }
}

// Обновить настройки события из дочернего компонента
function updateEventSettings(newSettings) {
  console.log('[DatasetConfigPage] updateEventSettings вызвана с:', newSettings)
  editingComponent.value.settings = {
    ...editingComponent.value.settings,
    ...newSettings
  }
  console.log(
    '[DatasetConfigPage] editingComponent.value.settings после обновления:',
    editingComponent.value.settings
  )
}

// Сохранение датасета
async function saveDataset() {
  // Валидация
  if (!datasetName.value.trim()) {
    showMessage('Название датасета обязательно', 'error')
    return
  }

  // Если уже идет сохранение, не запускаем повторно
  if (isSaving.value) {
    console.warn('[DatasetConfigPage] saveDataset уже выполняется, пропускаем')
    return
  }

  isSaving.value = true

  try {
    const config = JSON.stringify({
      components: components.value
    })

    let result
    if (isEditMode.value) {
      // Обновление существующего датасета
      const response = await fetch(props.apiUrls.update, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: datasetId.value,
          name: datasetName.value,
          description: datasetDescription.value,
          config
        })
      })
      result = await response.json()
    } else {
      // Создание нового датасета
      const response = await fetch(props.apiUrls.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datasetName.value,
          description: datasetDescription.value,
          config
        })
      })
      result = await response.json()
    }

    if (result.success) {
      showMessage('Датасет успешно сохранён!', 'success')

      // Обновляем datasetId если это было создание
      if (!isEditMode.value && result.dataset?.id) {
        datasetId.value = result.dataset.id
        // Обновляем URL, добавляя параметр ?id=... для дальнейшего редактирования
        if (props.apiUrls.datasetConfig) {
          const newUrl = `${props.apiUrls.datasetConfig}?id=${result.dataset.id}`
          window.history.pushState({}, '', newUrl)
        }
      }

      // Если есть socketId, подписываемся на WebSocket и показываем прогресс
      if (result.socketId && result.dataset?.id) {
        // Инициализируем прогресс-бар
        cacheLoading.value = {
          show: true,
          overallProgress: 0,
          currentComponent: 0,
          totalComponents: components.value.length || 1,
          components:
            components.value.length > 0
              ? components.value.map((comp) => ({
                  componentId: comp.id,
                  componentTitle: comp.title,
                  percentage: 0,
                  loaded: 0,
                  total: 0
                }))
              : [],
          error: null,
          complete: false
        }

        // Подписываемся на WebSocket и ждем завершения
        try {
          await subscribeToCacheProgress(result.socketId)
        } catch (wsError) {
          console.error('[DatasetConfigPage] Ошибка при подписке на WebSocket:', wsError)
          // Не блокируем сохранение из-за ошибки WebSocket
        }
      }
    } else {
      showMessage(result.error || 'Ошибка при сохранении датасета', 'error')
    }
  } catch (error) {
    console.error('[DatasetConfigPage] Error saving dataset:', error)
    showMessage('Ошибка при сохранении датасета', 'error')
  } finally {
    // Гарантируем, что isSaving всегда сбрасывается
    isSaving.value = false
    console.log('[DatasetConfigPage] saveDataset завершена, isSaving = false')
  }
}

// Показать сообщение
function showMessage(text, type = 'info') {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 5000)
}

// Подписка на WebSocket для отслеживания прогресса кэша
async function subscribeToCacheProgress(socketId) {
  // Очищаем предыдущую подписку
  if (socketSubscription) {
    try {
      if (typeof socketSubscription.unsubscribe === 'function') {
        socketSubscription.unsubscribe()
      } else if (typeof socketSubscription.onClose === 'function') {
        socketSubscription.onClose()
      }
    } catch (error) {
      console.warn('[DatasetConfigPage] Ошибка при очистке предыдущей подписки:', error)
    }
    socketSubscription = null
  }

  try {
    // Подключаемся к WebSocket
    socketClient = await getOrCreateBrowserSocketClient()
    socketSubscription = socketClient.subscribeToData(socketId)

    if (!socketSubscription || typeof socketSubscription.listen !== 'function') {
      console.error('[DatasetConfigPage] Не удалось создать подписку на WebSocket')
      cacheLoading.value.error = 'Ошибка подключения к WebSocket'
      return
    }

    // Устанавливаем обработчик сообщений
    socketSubscription.listen((message) => {
      console.log('[DatasetConfigPage] WebSocket message:', message.type, message.data)

      if (message.type === 'dataset-cache-delete-start') {
        // Начало удаления кэша
        // Убеждаемся, что прогресс-бар виден
        if (!cacheLoading.value.show) {
          cacheLoading.value.show = true
          cacheLoading.value.complete = false
          cacheLoading.value.error = null
          cacheLoading.value.overallProgress = 0
        }

        const compId = message.data.componentId
        let compIndex = cacheLoading.value.components.findIndex((c) => c.componentId === compId)
        if (compIndex === -1) {
          cacheLoading.value.components.push({
            componentId: compId,
            componentTitle: `Удаление компонента`,
            percentage: 0,
            loaded: 0,
            total: message.data.total || 0,
            isDeleting: true
          })
          cacheLoading.value.totalComponents = cacheLoading.value.components.length
        } else {
          // Обновляем данные компонента
          cacheLoading.value.components[compIndex].percentage = 0
          cacheLoading.value.components[compIndex].loaded = 0
          cacheLoading.value.components[compIndex].total = message.data.total || 0
          cacheLoading.value.components[compIndex].isDeleting = true
        }
      } else if (message.type === 'dataset-cache-delete-progress') {
        // Прогресс удаления
        const compId = message.data.componentId
        let compIndex = cacheLoading.value.components.findIndex((c) => c.componentId === compId)
        if (compIndex === -1) {
          compIndex =
            cacheLoading.value.components.push({
              componentId: compId,
              componentTitle: `Удаление компонента`,
              percentage: message.data.progress || 0,
              loaded: message.data.deleted || 0,
              total: message.data.total || 0,
              isDeleting: true
            }) - 1
          cacheLoading.value.totalComponents = cacheLoading.value.components.length
        } else {
          cacheLoading.value.components[compIndex].percentage = message.data.progress || 0
          cacheLoading.value.components[compIndex].loaded = message.data.deleted || 0
          cacheLoading.value.components[compIndex].total = message.data.total || 0
          cacheLoading.value.components[compIndex].isDeleting = true
        }
        // Обновляем общий прогресс
        updateOverallProgress()
      } else if (message.type === 'dataset-cache-delete-complete') {
        // Удаление завершено
        const compId = message.data.componentId
        let compIndex = cacheLoading.value.components.findIndex((c) => c.componentId === compId)
        if (compIndex !== -1) {
          cacheLoading.value.components[compIndex].percentage = 100
          cacheLoading.value.components[compIndex].loaded =
            cacheLoading.value.components[compIndex].total
          cacheLoading.value.components[compIndex].isDeleting = true
        } else {
          // Компонент не найден - добавляем его как завершенный
          cacheLoading.value.components.push({
            componentId: compId,
            componentTitle: `Удаление компонента`,
            percentage: 100,
            loaded: message.data.deleted || 0,
            total: message.data.deleted || 0,
            isDeleting: true
          })
          cacheLoading.value.totalComponents = cacheLoading.value.components.length
        }
        updateOverallProgress()

        // Если нет компонентов для загрузки, проверяем, все ли удаления завершены
        if (components.value.length === 0) {
          const allComplete =
            cacheLoading.value.components.length > 0 &&
            cacheLoading.value.components.every((c) => c.percentage === 100)
          if (allComplete) {
            cacheLoading.value.complete = true
            cacheLoading.value.overallProgress = 100
            setTimeout(() => {
              cacheLoading.value.show = false
              cleanupWebSocket()
            }, 2000)
          }
        }
      } else if (message.type === 'dataset-cache-start') {
        // Начало загрузки кэша
        cacheLoading.value.error = null
        cacheLoading.value.complete = false
        cacheLoading.value.totalComponents = message.data.totalComponents || components.value.length
        cacheLoading.value.show = true // Убеждаемся, что прогресс-бар виден
        cacheLoading.value.overallProgress = 0
        cacheLoading.value.currentComponent = 0
      } else if (message.type === 'dataset-cache-progress') {
        // Прогресс загрузки компонента
        const compId = message.data.componentId
        let compIndex = cacheLoading.value.components.findIndex((c) => c.componentId === compId)

        // Если компонент не найден, добавляем его
        if (compIndex === -1) {
          // Ищем компонент в списке components для получения названия
          const component = components.value.find((c) => c.id === compId)
          cacheLoading.value.components.push({
            componentId: compId,
            componentTitle: component?.title || `Компонент ${compId}`,
            percentage: message.data.progress || 0,
            loaded: message.data.loaded || 0,
            total: message.data.total || 0,
            isDeleting: false
          })
          cacheLoading.value.totalComponents = cacheLoading.value.components.length
          compIndex = cacheLoading.value.components.length - 1
        } else {
          // Обновляем существующий компонент
          cacheLoading.value.components[compIndex].percentage = message.data.progress || 0
          cacheLoading.value.components[compIndex].loaded = message.data.loaded || 0
          cacheLoading.value.components[compIndex].total = message.data.total || 0
          // При получении события dataset-cache-progress это всегда загрузка, а не удаление
          // Поэтому всегда устанавливаем isDeleting = false
          cacheLoading.value.components[compIndex].isDeleting = false
        }

        // Обновляем общий прогресс после обновления компонента
        updateOverallProgress()
      } else if (message.type === 'dataset-cache-overall-progress') {
        // Общий прогресс теперь вычисляется на клиенте в updateOverallProgress()
        // Это событие больше не используется, но оставляем для совместимости
        // Общий прогресс обновляется автоматически при обновлении прогресса компонента
        if (message.data.totalComponents) {
          cacheLoading.value.totalComponents = message.data.totalComponents
        }
        if (message.data.currentComponent) {
          cacheLoading.value.currentComponent = message.data.currentComponent
        }
        // Не устанавливаем overallProgress из сообщения, т.к. он вычисляется из прогресса компонентов
      } else if (message.type === 'dataset-cache-complete') {
        // Загрузка завершена
        cacheLoading.value.complete = true
        cacheLoading.value.overallProgress = 100
        // Не скрываем прогресс-бар сразу, т.к. может начаться удаление
        // Скрываем только если нет компонентов для удаления
        if (components.value.length === 0) {
          setTimeout(() => {
            cacheLoading.value.show = false
            cleanupWebSocket()
          }, 2000)
        }
      } else if (
        message.type === 'dataset-cache-error' ||
        message.type === 'dataset-cache-delete-error'
      ) {
        // Ошибка
        cacheLoading.value.error = message.data?.error || 'Неизвестная ошибка'
        showMessage(`Ошибка: ${cacheLoading.value.error}`, 'error')
        setTimeout(() => {
          cacheLoading.value.show = false
          cleanupWebSocket()
        }, 3000)
      }
    })

    // Ждем завершения операции (максимум 5 минут)
    await new Promise((resolve) => {
      // Проверяем сразу, может быть уже завершено
      if (cacheLoading.value.complete || cacheLoading.value.error) {
        resolve()
        return
      }

      const checkInterval = setInterval(() => {
        if (cacheLoading.value.complete || cacheLoading.value.error) {
          clearInterval(checkInterval)
          console.log('[DatasetConfigPage] Операция завершена, разрешаем Promise')
          resolve()
        }
      }, 100) // Уменьшаем интервал для более быстрой реакции

      setTimeout(
        () => {
          clearInterval(checkInterval)
          if (!cacheLoading.value.complete && !cacheLoading.value.error) {
            console.warn(
              '[DatasetConfigPage] Превышено время ожидания, но продолжаем слушать WebSocket сообщения'
            )
            // НЕ закрываем WebSocket и НЕ скрываем прогресс-бар
            // Показываем предупреждение, но продолжаем получать обновления прогресса
            showMessage(
              'Загрузка занимает больше времени, чем ожидалось. Пожалуйста, подождите...',
              'warning'
            )
            // НЕ вызываем cleanupWebSocket() и НЕ скрываем прогресс-бар
            // Promise разрешаем, чтобы не блокировать основной поток,
            // но подписка продолжит работать и получать сообщения
          }
          resolve()
        },
        5 * 60 * 1000
      )
    })

    console.log('[DatasetConfigPage] subscribeToCacheProgress завершена')
  } catch (error) {
    console.error('[DatasetConfigPage] Ошибка подключения к WebSocket:', error)
    cacheLoading.value.error = `Ошибка подключения: ${error.message || String(error)}`
    cacheLoading.value.show = false
  }
}

// Обновление общего прогресса на основе прогресса всех компонентов
function updateOverallProgress() {
  if (cacheLoading.value.components.length === 0) {
    cacheLoading.value.overallProgress = 0
    return
  }

  // Вычисляем общий прогресс на основе загруженных/всего записей, а не среднего процента
  // Это правильно, т.к. разные компоненты могут иметь разное количество записей
  const totalLoaded = cacheLoading.value.components.reduce(
    (sum, comp) => sum + (comp.loaded || 0),
    0
  )
  const totalNeed = cacheLoading.value.components.reduce((sum, comp) => sum + (comp.total || 0), 0)

  if (totalNeed === 0) {
    cacheLoading.value.overallProgress = 0
    return
  }

  cacheLoading.value.overallProgress = Math.round((totalLoaded / totalNeed) * 100)
}

// Очистка WebSocket подписки
function cleanupWebSocket() {
  if (socketSubscription) {
    try {
      if (typeof socketSubscription.unsubscribe === 'function') {
        socketSubscription.unsubscribe()
      } else if (typeof socketSubscription.onClose === 'function') {
        socketSubscription.onClose()
      }
    } catch (error) {
      console.warn('[DatasetConfigPage] Ошибка при очистке WebSocket:', error)
    }
    socketSubscription = null
  }
}
// Очистка при размонтировании
onUnmounted(() => {
  cleanupWebSocket()
  socketClient = null
})
</script>
