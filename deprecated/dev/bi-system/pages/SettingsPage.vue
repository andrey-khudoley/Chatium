<template>
  <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
    <div class="container mx-auto py-6 px-4 max-w-6xl">
      <div class="card mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold flex items-center gap-3">
            <i class="fas fa-list" style="color: var(--color-primary)"></i>
            Параметры системы
          </h2>
          <button @click="showAddModal = true" class="btn btn-primary">
            <i class="fas fa-plus mr-2"></i>
            Добавить
          </button>
        </div>

        <div
          class="mb-6 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-sm"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <i class="fas fa-bug text-lg" style="color: var(--color-primary)"></i>
                <span class="text-lg font-semibold text-[var(--color-text)]"
                  >Уровень логирования</span
                >
              </div>
              <p class="text-sm text-[var(--color-text-secondary)]">
                Упрвляет количеством и детализацией отображаемой в логах информации
              </p>
            </div>
          </div>
          <div class="mt-4 grid gap-2 md:grid-cols-3">
            <div
              v-for="option in LOG_LEVEL_OPTIONS"
              :key="option.value + '-desc'"
              role="button"
              tabindex="0"
              class="p-3 rounded-lg border text-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
              :aria-pressed="logLevel === option.value"
              :class="
                logLevel === option.value
                  ? 'border-[var(--color-primary)] bg-[var(--color-border)] shadow-sm'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-bg-secondary)]'
              "
              @click="changeLogLevel(option.value)"
              @keydown.enter="changeLogLevel(option.value)"
              @keydown.space.prevent="changeLogLevel(option.value)"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold">{{ option.label }}</span>
                <span
                  v-if="logLevel === option.value"
                  class="text-xs uppercase text-[var(--color-primary)]"
                  >активен</span
                >
              </div>
              <p class="text-[var(--color-text-secondary)]">{{ option.description }}</p>
            </div>
          </div>
          <div
            v-if="logLevelStatus"
            class="mt-4 text-sm"
            :class="logLevelStatus.success ? 'text-green-600' : 'text-red-500'"
          >
            <i
              :class="
                logLevelStatus.success
                  ? 'fas fa-check-circle mr-2'
                  : 'fas fa-exclamation-triangle mr-2'
              "
            ></i>
            {{ logLevelStatus.message }}
          </div>
        </div>

        <div
          class="mb-6 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-sm"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <i class="fas fa-tasks text-lg" style="color: var(--color-primary)"></i>
                <span class="text-lg font-semibold text-[var(--color-text)]"
                  >Управление задачами</span
                >
              </div>
              <p class="text-sm text-[var(--color-text-secondary)]">
                Остановка всех активных фоновых задач (загрузка кэша, мониторинг событий и т.д.)
              </p>
            </div>
          </div>
          <div class="mt-4">
            <button
              @click="stopAllJobs"
              :disabled="stoppingJobs"
              class="btn"
              :class="stoppingJobs ? 'opacity-50 cursor-not-allowed' : ''"
              style="background: var(--color-danger); color: white; padding: 0.75rem 1.5rem"
            >
              <i v-if="stoppingJobs" class="fas fa-spinner animate-spin mr-2"></i>
              <i v-else class="fas fa-stop-circle mr-2"></i>
              {{ stoppingJobs ? 'Останавливаю...' : 'Остановить все задачи' }}
            </button>
          </div>
          <div
            v-if="stopJobsStatus"
            class="mt-4 text-sm"
            :class="stopJobsStatus.success ? 'text-green-600' : 'text-red-500'"
          >
            <i
              :class="
                stopJobsStatus.success
                  ? 'fas fa-check-circle mr-2'
                  : 'fas fa-exclamation-triangle mr-2'
              "
            ></i>
            {{ stopJobsStatus.message }}
          </div>
        </div>

        <div v-if="loading" class="text-center py-12">
          <i class="fas fa-spinner animate-spin text-4xl" style="color: var(--color-primary)"></i>
          <p class="mt-4 text-[var(--color-text-secondary)]">Загрузка настроек...</p>
        </div>

        <div v-else-if="error" class="text-center py-12">
          <i
            class="fas fa-exclamation-triangle text-4xl mb-4"
            style="color: var(--color-danger)"
          ></i>
          <p style="color: var(--color-danger)">{{ error }}</p>
          <button @click="loadSettings" class="btn btn-primary mt-4">
            <i class="fas fa-redo mr-2"></i>
            Попробовать снова
          </button>
        </div>

        <div v-else-if="filteredSettings.length === 0" class="text-center py-12">
          <i class="fas fa-inbox text-4xl mb-4 text-[var(--color-text-tertiary)]"></i>
          <p class="text-[var(--color-text-secondary)]">Настройки не добавлены</p>
          <p class="text-sm text-[var(--color-text-tertiary)] mt-2">
            Добавьте первую настройку, нажав на кнопку "Добавить"
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Ключ</th>
                <th>Значение</th>
                <th>Описание</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="setting in filteredSettings" :key="setting.id">
                <td>
                  <code class="text-sm text-[var(--color-primary)]">{{ setting.key }}</code>
                </td>
                <td>{{ setting.value }}</td>
                <td class="text-[var(--color-text-secondary)]">{{ setting.description }}</td>
                <td class="text-right">
                  <button
                    @click="editSetting(setting)"
                    class="btn btn-primary mr-2"
                    style="padding: 0.5rem 1rem"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="deleteSetting(setting.id)"
                    class="btn"
                    style="background: var(--color-danger); color: white; padding: 0.5rem 1rem"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-[var(--color-text)]">
            {{ showEditModal ? 'Редактировать настройку' : 'Добавить настройку' }}
          </h3>
          <button
            @click="closeModal"
            class="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>

        <form @submit.prevent="saveSetting">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 text-[var(--color-text)]">
              Ключ настройки
            </label>
            <input
              v-model="currentSetting.key"
              type="text"
              class="input"
              placeholder="api_key"
              required
              :disabled="showEditModal"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 text-[var(--color-text)]">
              Значение
            </label>
            <input
              v-model="currentSetting.value"
              type="text"
              class="input"
              placeholder="Значение настройки"
              required
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2 text-[var(--color-text)]">
              Описание
            </label>
            <textarea
              v-model="currentSetting.description"
              class="input"
              rows="3"
              placeholder="Описание настройки..."
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1" :disabled="saving">
              <i v-if="saving" class="fas fa-spinner animate-spin mr-2"></i>
              <i v-else class="fas fa-save mr-2"></i>
              {{ saving ? 'Сохранение...' : 'Сохранить' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="btn"
              style="background: var(--color-border)"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGetSettingsRoute, apiUpdateSettingRoute, apiDeleteSettingRoute } from '../api/settings'

const props = defineProps({
  apiUrls: {
    type: Object,
    required: true
  }
})

const settings = ref([])
const loading = ref(true)
const error = ref(null)
const saving = ref(false)
const LOG_LEVEL_KEY = 'log_level'
const LOG_LEVEL_OPTIONS = [
  {
    value: 'info',
    label: 'INFO',
    description: 'Максимум деталей: каждая операция и шаг'
  },
  {
    value: 'warn',
    label: 'WARN',
    description: 'Только предупреждения и ошибки'
  },
  {
    value: 'error',
    label: 'ERROR',
    description: 'Критичные ошибки и исключения'
  }
]
const logLevel = ref('error')
const logLevelSaving = ref(false)
const logLevelStatus = ref(null)
const stoppingJobs = ref(false)
const stopJobsStatus = ref(null)

const showAddModal = ref(false)
const showEditModal = ref(false)
const currentSetting = ref({
  id: '',
  key: '',
  value: '',
  description: ''
})

// URL получаем из props (генерируются на сервере через route.url())
const indexPageUrl = computed(() => props.apiUrls.indexPage)

// Отфильтрованные настройки (скрываем служебные настройки)
const filteredSettings = computed(() => {
  const hiddenKeys = ['events_filter', LOG_LEVEL_KEY]
  return settings.value.filter((s) => !hiddenKeys.includes(s.key))
})

onMounted(async () => {
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  await loadSettings()
})

function parseLogLevel(value) {
  const normalized = (value || '').toString().toLowerCase()
  return ['info', 'warn', 'error'].includes(normalized) ? normalized : 'error'
}

function syncLogLevelFromSettings() {
  const levelSetting = settings.value.find((s) => s.key === LOG_LEVEL_KEY)
  logLevel.value = parseLogLevel(levelSetting?.value || 'error')
}

async function loadSettings(showLoader = true) {
  if (showLoader) {
    loading.value = true
  }
  error.value = null

  try {
    const result = await apiGetSettingsRoute.run(ctx)

    if (result.success) {
      settings.value = result.settings
      syncLogLevelFromSettings()
    } else {
      error.value = result.error
    }
  } catch (e) {
    error.value = e.message
  } finally {
    if (showLoader) {
      loading.value = false
    }
  }
}

async function changeLogLevel(level) {
  const normalized = parseLogLevel(level)
  if (normalized === logLevel.value || logLevelSaving.value) {
    return
  }

  logLevelSaving.value = true
  logLevelStatus.value = null

  try {
    const result = await apiUpdateSettingRoute.run(ctx, {
      key: LOG_LEVEL_KEY,
      value: normalized,
      description: 'Уровень детализации логов Debug'
    })

    if (!result.success) {
      throw new Error(result.error || 'Не удалось сохранить уровень логирования')
    }

    logLevel.value = normalized
    await loadSettings(false)

    logLevelStatus.value = {
      success: true,
      message: `Уровень обновлён на ${normalized.toUpperCase()}`
    }
  } catch (e) {
    logLevelStatus.value = {
      success: false,
      message: e.message || 'Не удалось обновить уровень логирования'
    }
  } finally {
    logLevelSaving.value = false
    setTimeout(() => {
      logLevelStatus.value = null
    }, 5000)
  }
}

function editSetting(setting) {
  currentSetting.value = {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    description: setting.description
  }
  showEditModal.value = true
}

async function saveSetting() {
  saving.value = true

  try {
    const result = await apiUpdateSettingRoute.run(ctx, {
      key: currentSetting.value.key,
      value: currentSetting.value.value,
      description: currentSetting.value.description
    })

    if (result.success) {
      await loadSettings()
      closeModal()
    } else {
      alert('Ошибка: ' + result.error)
    }
  } catch (e) {
    alert('Ошибка: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function deleteSetting(id) {
  if (!confirm('Вы уверены, что хотите удалить эту настройку?')) {
    return
  }

  try {
    const result = await apiDeleteSettingRoute.run(ctx, { id })

    if (result.success) {
      await loadSettings()
    } else {
      alert('Ошибка: ' + result.error)
    }
  } catch (e) {
    alert('Ошибка: ' + e.message)
  }
}

function closeModal() {
  showAddModal.value = false
  showEditModal.value = false
  currentSetting.value = {
    id: '',
    key: '',
    value: '',
    description: ''
  }
}

async function stopAllJobs() {
  if (stoppingJobs.value) {
    return
  }

  if (
    !confirm(
      'Вы уверены, что хотите остановить все активные задачи? Это может прервать загрузку кэша, мониторинг событий и другие фоновые процессы.'
    )
  ) {
    return
  }

  stoppingJobs.value = true
  stopJobsStatus.value = null

  try {
    // Используем fetch для POST запроса
    const stopAllJobsUrl = props.apiUrls.stopAllJobs

    if (!stopAllJobsUrl) {
      throw new Error('URL для остановки задач не указан')
    }

    const response = await fetch(stopAllJobsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Отправляем пустой JSON объект
    })

    // Проверяем статус HTTP ответа
    if (!response.ok) {
      let errorMessage = `HTTP ошибка: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message
        }
      } catch (parseError) {
        // Если не удалось распарсить ответ, используем стандартное сообщение
      }
      throw new Error(errorMessage)
    }

    // Парсим JSON ответ
    let result
    try {
      result = await response.json()
    } catch (parseError) {
      throw new Error('Не удалось обработать ответ сервера')
    }

    // Обрабатываем результат
    if (result.success) {
      // Используем сообщение из ответа, если оно есть, иначе формируем своё
      const message =
        result.message ||
        (result.stopped > 0
          ? `Остановлено задач: ${result.stopped}${result.errors > 0 ? `. Ошибок: ${result.errors}` : ''}`
          : 'Активных задач не найдено')

      stopJobsStatus.value = {
        success: true,
        message: message
      }
    } else {
      // Обрабатываем ошибки
      let errorMessage = 'Неизвестная ошибка'

      if (result.message) {
        errorMessage = result.message
      } else if (result.errorsList && result.errorsList.length > 0) {
        errorMessage = result.errorsList.join(', ')
      } else if (result.error) {
        errorMessage = result.error
      }

      stopJobsStatus.value = {
        success: false,
        message: `Ошибка остановки задач: ${errorMessage}`
      }
    }
  } catch (e) {
    // Обрабатываем различные типы ошибок
    let errorMessage = 'Не удалось остановить задачи'

    if (e instanceof TypeError && e.message.includes('fetch')) {
      errorMessage = 'Ошибка сети: не удалось подключиться к серверу'
    } else if (e instanceof SyntaxError) {
      errorMessage = 'Ошибка обработки ответа сервера'
    } else if (e instanceof Error) {
      errorMessage = e.message
    } else if (typeof e === 'string') {
      errorMessage = e
    } else {
      errorMessage = `Неизвестная ошибка: ${String(e)}`
    }

    stopJobsStatus.value = {
      success: false,
      message: errorMessage
    }
  } finally {
    stoppingJobs.value = false
    setTimeout(() => {
      stopJobsStatus.value = null
    }, 10000)
  }
}
</script>
