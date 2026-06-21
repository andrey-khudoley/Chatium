<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../shared/Header.vue'
import GlobalGlitch from '../shared/GlobalGlitch.vue'
import { apiUpdateAdminSettingsRoute } from '../api/admin-settings'
import { apiResetCountersRoute, apiTestErrorRoute, apiTestWarningRoute } from '../api/admin-logs'

declare const ctx: any

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

interface LogEntry {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  code?: string
  createdAt: string
}

interface LogCounts {
  info: number
  warn: number
  error: number
}

interface AccumulatedCounts {
  error: number
  warn: number
}

interface Props {
  projectName: string
  projectTitle: string
  projectDescription: string
  currentLogLevel: string
  encodedSocketId: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  adminUrl: string
  isAdmin: boolean
  /** Начальные логи, загруженные при рендере страницы (Heap доступен в контексте страницы) */
  initialLogs?: LogEntry[]
  /** Начальные счётчики по уровням */
  initialCounts?: LogCounts
  /** Накопленные счётчики ошибок/предупреждений */
  initialAccumulatedCounts?: AccumulatedCounts
  /** Лимит логов при текущей загрузке (для ссылки «ещё») */
  initialLimit?: number
  /** URL для загрузки следующей порции логов (полная перезагрузка страницы) */
  loadMoreUrl?: string
  /** URL для загрузки всех логов (до 1000) */
  loadAllUrl?: string
  /** Фильтр по уровню с сервера (?level=) */
  initialFilter?: 'all' | 'info' | 'warn' | 'error'
  /** URL вебхука для логов (при создании лога отправляется POST, если вебхук активен) */
  initialWebhookUrl?: string
  /** Вебхук логов включён */
  initialWebhookEnabled?: boolean
}

const props = defineProps<Props>()

const bootLoaderDone = ref(false)

// Состояние формы настроек
const settingsForm = ref({
  project_name: props.projectName,
  project_title: props.projectTitle,
  project_description: props.projectDescription,
  log_level: props.currentLogLevel,
  logs_webhook_url: props.initialWebhookUrl ?? '',
  logs_webhook_enabled: props.initialWebhookEnabled ?? false
})

const isSavingSettings = ref(false)
const settingsMessage = ref('')
const settingsMessageType = ref<'success' | 'error'>('success')

// Состояние логов (инициализируем из props, если переданы при рендере страницы)
const logs = ref<LogEntry[]>(props.initialLogs ?? [])
const logCounts = ref<LogCounts>(props.initialCounts ?? { info: 0, warn: 0, error: 0 })
const accumulatedCounts = ref<AccumulatedCounts>(
  props.initialAccumulatedCounts ?? { error: 0, warn: 0 }
)
const currentLogFilter = ref<'all' | 'info' | 'warn' | 'error'>(props.initialFilter ?? 'all')
const currentLogLimit = ref(props.initialLimit ?? 50)
const currentLogCursor = ref<string | null>(null)
const isLoadingLogs = ref(false)
const isLoadingCounts = ref(false)
const isResettingCounters = ref(false)
const isCreatingTestError = ref(false)
const isCreatingTestWarning = ref(false)
const hasMoreLogs = ref(!!props.loadMoreUrl) // Есть ли ссылка на следующую порцию (серверная пагинация)
const logsError = ref('') // Сообщение об ошибке/подсказка (например, обновить страницу)

// WebSocket подписка
let socketSubscription: any = null

const levelColors: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400'
}

const levelBgColors: Record<string, string> = {
  info: 'bg-blue-900/30 border-blue-700/50',
  warn: 'bg-yellow-900/30 border-yellow-700/50',
  error: 'bg-red-900/30 border-red-700/50'
}

// Функция сохранения настроек
async function saveSettings() {
  isSavingSettings.value = true
  settingsMessage.value = ''

  try {
    const data = await apiUpdateAdminSettingsRoute.run(ctx, settingsForm.value)

    if (data.success) {
      settingsMessage.value = 'Настройки успешно сохранены'
      settingsMessageType.value = 'success'

      // Обновляем форму новыми значениями из ответа
      if (data.settings) {
        settingsForm.value.project_name = data.settings.project_name || ''
        settingsForm.value.project_title = data.settings.project_title || ''
        settingsForm.value.project_description = data.settings.project_description || ''
        settingsForm.value.log_level = data.settings.log_level || 'info'
        settingsForm.value.logs_webhook_url =
          typeof data.settings.logs_webhook_url === 'string' ? data.settings.logs_webhook_url : ''
        settingsForm.value.logs_webhook_enabled =
          data.settings.logs_webhook_enabled === true ||
          data.settings.logs_webhook_enabled === 'true'
      }
    } else {
      settingsMessage.value = data.error || 'Ошибка при сохранении настроек'
      settingsMessageType.value = 'error'
    }
  } catch (error: any) {
    settingsMessage.value = `Ошибка: ${error.message || 'Не удалось сохранить настройки'}`
    settingsMessageType.value = 'error'
  } finally {
    isSavingSettings.value = false

    // Скрыть сообщение через 5 секунд
    setTimeout(() => {
      settingsMessage.value = ''
    }, 5000)
  }
}

// Функция загрузки логов
function getLogKey(log: LogEntry): string {
  if (log.id) return log.id
  return `${log.level}|${log.createdAt}|${log.message}|${log.code || ''}`
}

function sortLogsByTimeDesc(items: LogEntry[]): LogEntry[] {
  return items.slice().sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime() || 0
    const bTime = new Date(b.createdAt).getTime() || 0
    if (aTime !== bTime) return bTime - aTime
    return getLogKey(a).localeCompare(getLogKey(b))
  })
}

function mergeLogs(existing: LogEntry[], incoming: LogEntry[]): LogEntry[] {
  const map = new Map<string, LogEntry>()
  for (const log of existing) {
    map.set(getLogKey(log), log)
  }
  for (const log of incoming) {
    map.set(getLogKey(log), log)
  }
  return sortLogsByTimeDesc(Array.from(map.values()))
}

function refreshCursor() {
  if (logs.value.length === 0) {
    currentLogCursor.value = null
    return
  }
  const sorted = sortLogsByTimeDesc(logs.value)
  const oldest = sorted[sorted.length - 1]
  currentLogCursor.value = oldest?.createdAt || null
}

// Логи и счётчики загружаются только при рендере страницы (admin.tsx); API логов в shared-route не имеет доступа к Heap.
// «Загрузить ещё» / «Показать все» — переход по loadMoreUrl / loadAllUrl (полная перезагрузка страницы).

function buildFilterUrl(filter: 'all' | 'info' | 'warn' | 'error'): string {
  const limit = props.initialLimit ?? 50
  if (filter === 'all') return `${props.adminUrl}?limit=${limit}`
  return `${props.adminUrl}?level=${filter}&limit=${limit}`
}

// Функция сброса счётчиков (API может не иметь доступа к Heap — после успеха предложить обновить страницу)
async function resetLogCounters() {
  isResettingCounters.value = true

  try {
    const raw = await apiResetCountersRoute.run(ctx)
    const data =
      raw && typeof (raw as any).body === 'object'
        ? (raw as any).body
        : raw && typeof (raw as any).data === 'object'
          ? (raw as any).data
          : raw

    if (data?.success) {
      settingsMessage.value = 'Счётчики сброшены. Обновите страницу для обновления данных.'
      settingsMessageType.value = 'success'
      setTimeout(() => {
        settingsMessage.value = ''
      }, 5000)
    } else {
      settingsMessage.value = (data as any)?.error || 'Ошибка сброса счётчиков'
      settingsMessageType.value = 'error'
    }
  } catch (error: any) {
    settingsMessage.value = `Ошибка: ${error.message || 'Не удалось сбросить счётчики'}`
    settingsMessageType.value = 'error'
  } finally {
    isResettingCounters.value = false
  }
}

// Функция создания тестовой ошибки (после успеха — предложить обновить страницу для просмотра логов)
async function createTestError() {
  isCreatingTestError.value = true

  try {
    const raw = await apiTestErrorRoute.run(ctx)
    const data =
      raw && typeof (raw as any).body === 'object'
        ? (raw as any).body
        : raw && typeof (raw as any).data === 'object'
          ? (raw as any).data
          : raw

    if (data?.success) {
      settingsMessage.value = 'Тестовая ошибка создана. Обновите страницу для просмотра логов.'
      settingsMessageType.value = 'success'
      setTimeout(() => {
        settingsMessage.value = ''
      }, 5000)
    } else {
      settingsMessage.value = (data as any)?.error || 'Ошибка создания тестовой ошибки'
      settingsMessageType.value = 'error'
    }
  } catch (error: any) {
    settingsMessage.value = `Ошибка: ${error.message || 'Не удалось создать тестовую ошибку'}`
    settingsMessageType.value = 'error'
  } finally {
    isCreatingTestError.value = false
  }
}

// Функция создания тестового предупреждения
async function createTestWarning() {
  isCreatingTestWarning.value = true

  try {
    const raw = await apiTestWarningRoute.run(ctx)
    const data =
      raw && typeof (raw as any).body === 'object'
        ? (raw as any).body
        : raw && typeof (raw as any).data === 'object'
          ? (raw as any).data
          : raw

    if (data?.success) {
      settingsMessage.value =
        'Тестовое предупреждение создано. Обновите страницу для просмотра логов.'
      settingsMessageType.value = 'success'
      setTimeout(() => {
        settingsMessage.value = ''
      }, 5000)
    } else {
      settingsMessage.value = (data as any)?.error || 'Ошибка создания тестового предупреждения'
      settingsMessageType.value = 'error'
    }
  } catch (error: any) {
    settingsMessage.value = `Ошибка: ${error.message || 'Не удалось создать тестовое предупреждение'}`
    settingsMessageType.value = 'error'
  } finally {
    isCreatingTestWarning.value = false
  }
}

// Изменение фильтра — переход на страницу с query ?level= (серверная выборка)
function changeFilter(filter: 'all' | 'info' | 'warn' | 'error') {
  window.location.href = buildFilterUrl(filter)
}

// Форматирование даты
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Инициализация WebSocket
async function initWebSocket() {
  try {
    const socketClient = await getOrCreateBrowserSocketClient()
    socketSubscription = socketClient.subscribeToData(props.encodedSocketId)

    socketSubscription.listen((data: any) => {
      if (data.type === 'new-log') {
        const newLog = data.data as LogEntry
        logs.value = mergeLogs(logs.value, [newLog]).slice(0, 1000)
        refreshCursor()

        // Обновляем счётчики
        if (newLog.level === 'info') {
          logCounts.value.info++
        } else if (newLog.level === 'warn') {
          logCounts.value.warn++
          accumulatedCounts.value.warn++
        } else if (newLog.level === 'error') {
          logCounts.value.error++
          accumulatedCounts.value.error++
        }
      }
    })
  } catch (error: any) {
    console.error('Ошибка инициализации WebSocket:', error)
  }
}

// Фильтрованные логи для отображения (клиентская фильтрация для real-time логов)
const filteredLogs = computed(() => {
  const baseLogs =
    currentLogFilter.value === 'all'
      ? logs.value
      : logs.value.filter((log) => log.level === currentLogFilter.value)
  return sortLogsByTimeDesc(baseLogs)
})

// При монтировании компонента
onMounted(() => {
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  // Ждём завершения bootloader. Логи и счётчики уже пришли в props с сервера; подключаем только WebSocket.
  const startAfterBootloader = () => {
    bootLoaderDone.value = true
    initWebSocket().catch((error) => {
      console.error('Ошибка инициализации WebSocket:', error)
    })
  }

  if ((window as any).bootLoaderComplete) {
    startAfterBootloader()
  } else {
    window.addEventListener('bootloader-complete', startAfterBootloader)
  }
})

// Очистка при размонтировании
onBeforeUnmount(() => {
  if (socketSubscription) {
    socketSubscription.unsubscribe()
  }
})
</script>

<template>
  <div class="app-layout min-h-screen relative" style="z-index: 100">
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :project-title="projectTitle"
      page-name="Админка"
      :index-url="indexUrl"
      :profile-url="profileUrl"
      :login-url="loginUrl"
      :admin-url="adminUrl"
      :is-authenticated="true"
      :is-admin="isAdmin"
    />

    <main v-if="bootLoaderDone" class="container mx-auto px-4 py-8 max-w-7xl">
      <!-- Настройки проекта -->
      <section class="mb-12">
        <h2
          class="text-2xl font-bold text-[var(--color-text)] mb-6 font-mono flex items-center gap-3"
        >
          <i class="fas fa-cog text-[var(--color-accent)]"></i>
          Настройки проекта
        </h2>

        <div
          class="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6"
        >
          <form @submit.prevent="saveSettings" class="space-y-6">
            <!-- Название проекта -->
            <div>
              <label
                for="project-name"
                class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                Название проекта (отображается на главной странице)
              </label>
              <input
                id="project-name"
                v-model="settingsForm.project_name"
                type="text"
                class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                placeholder="Введите название проекта"
              />
            </div>

            <!-- Title проекта -->
            <div>
              <label
                for="project-title"
                class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                Title проекта (отображается в хедере и браузерном заголовке)
              </label>
              <input
                id="project-title"
                v-model="settingsForm.project_title"
                type="text"
                class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                placeholder="Введите title проекта"
              />
            </div>

            <!-- Описание проекта -->
            <div>
              <label
                for="project-description"
                class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                Описание проекта
              </label>
              <textarea
                id="project-description"
                v-model="settingsForm.project_description"
                rows="3"
                class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                placeholder="Введите описание проекта"
              ></textarea>
            </div>

            <!-- Уровень логирования -->
            <div>
              <label
                for="log-level"
                class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                Уровень логирования
              </label>
              <select
                id="log-level"
                v-model="settingsForm.log_level"
                class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              >
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <!-- Вебхук логов -->
            <div>
              <label
                for="logs-webhook-enabled"
                class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                Вебхук логов (при создании лога отправляется POST в URL, если включён)
              </label>
              <div class="flex items-center gap-3 mb-2">
                <input
                  id="logs-webhook-enabled"
                  v-model="settingsForm.logs_webhook_enabled"
                  type="checkbox"
                  class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span class="text-sm text-[var(--color-text-secondary)]">Включить вебхук</span>
              </div>
              <input
                id="logs-webhook-url"
                v-model="settingsForm.logs_webhook_url"
                type="url"
                class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                placeholder="https://example.com/webhook/logs"
              />
            </div>

            <!-- Кнопка сохранения -->
            <div class="flex items-center gap-4">
              <button
                type="submit"
                :disabled="isSavingSettings"
                class="px-6 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isSavingSettings" class="fas fa-spinner fa-spin mr-2"></i>
                {{ isSavingSettings ? 'Сохранение...' : 'Сохранить' }}
              </button>

              <!-- Сообщение об успехе/ошибке -->
              <div
                v-if="settingsMessage"
                :class="[
                  'text-sm font-medium',
                  settingsMessageType === 'success' ? 'text-green-400' : 'text-red-400'
                ]"
              >
                <i
                  :class="[
                    'fas mr-2',
                    settingsMessageType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
                  ]"
                ></i>
                {{ settingsMessage }}
              </div>
            </div>
          </form>
        </div>
      </section>

      <!-- Логи -->
      <section>
        <h2
          class="text-2xl font-bold text-[var(--color-text)] mb-6 font-mono flex items-center gap-3"
        >
          <i class="fas fa-list text-[var(--color-accent)]"></i>
          Логи системы
        </h2>

        <!-- Счётчики и фильтры -->
        <div
          class="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6 mb-6"
        >
          <!-- Статистика: общие счётчики -->
          <div class="mb-6">
            <h3
              class="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4"
            >
              Статистика логов
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- ERROR -->
              <div
                class="bg-red-950/20 border border-red-900/30 rounded-lg p-4 hover:border-red-800/50 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center"
                    >
                      <i class="fas fa-exclamation-circle text-red-400"></i>
                    </div>
                    <div>
                      <div class="text-xs text-red-400/70 uppercase tracking-wide font-medium">
                        Ошибки
                      </div>
                      <div class="text-2xl font-bold text-red-400 font-mono">
                        {{ logCounts.error }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- WARN -->
              <div
                class="bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-4 hover:border-yellow-800/50 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-yellow-900/30 rounded-lg flex items-center justify-center"
                    >
                      <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                    </div>
                    <div>
                      <div class="text-xs text-yellow-400/70 uppercase tracking-wide font-medium">
                        Предупреждения
                      </div>
                      <div class="text-2xl font-bold text-yellow-400 font-mono">
                        {{ logCounts.warn }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- INFO -->
              <div
                class="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 hover:border-blue-800/50 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center"
                    >
                      <i class="fas fa-info-circle text-blue-400"></i>
                    </div>
                    <div>
                      <div class="text-xs text-blue-400/70 uppercase tracking-wide font-medium">
                        Информация
                      </div>
                      <div class="text-2xl font-bold text-blue-400 font-mono">
                        {{ logCounts.info }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Накопленные счётчики с момента сброса -->
          <div class="mb-6 pb-6 border-b border-[var(--color-border)]">
            <h3
              class="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4"
            >
              С момента сброса
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Accumulated ERROR -->
              <div
                class="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-4"
              >
                <div class="flex items-center gap-3">
                  <i class="fas fa-exclamation-circle text-red-400 text-lg"></i>
                  <div class="flex-1">
                    <div class="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
                      Ошибки
                    </div>
                    <div class="text-xl font-bold text-red-400 font-mono">
                      {{ accumulatedCounts.error }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Accumulated WARN -->
              <div
                class="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-4"
              >
                <div class="flex items-center gap-3">
                  <i class="fas fa-exclamation-triangle text-yellow-400 text-lg"></i>
                  <div class="flex-1">
                    <div class="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
                      Предупреждения
                    </div>
                    <div class="text-xl font-bold text-yellow-400 font-mono">
                      {{ accumulatedCounts.warn }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Управление: кнопки тестирования и сброса -->
          <div class="mb-6 pb-6 border-b border-[var(--color-border)]">
            <h3
              class="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4"
            >
              Управление
            </h3>
            <div class="flex flex-wrap gap-3">
              <button
                @click="createTestError"
                :disabled="isCreatingTestError"
                class="px-4 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium rounded-lg border border-red-700/50 hover:border-red-600 transition-all hover:shadow-lg hover:shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isCreatingTestError" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-bug mr-2"></i>
                Тестовая ошибка
              </button>
              <button
                @click="createTestWarning"
                :disabled="isCreatingTestWarning"
                class="px-4 py-2.5 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 text-sm font-medium rounded-lg border border-yellow-700/50 hover:border-yellow-600 transition-all hover:shadow-lg hover:shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isCreatingTestWarning" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-flask mr-2"></i>
                Тестовое предупреждение
              </button>
              <button
                @click="resetLogCounters"
                :disabled="isResettingCounters"
                class="px-4 py-2.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-sm font-medium rounded-lg border border-[var(--color-border)] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isResettingCounters" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-redo mr-2"></i>
                Сбросить счётчики
              </button>
            </div>
          </div>

          <!-- Фильтры -->
          <div>
            <h3
              class="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4"
            >
              Фильтр
            </h3>
            <div class="flex flex-wrap gap-2">
              <button
                @click="changeFilter('all')"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-all',
                  currentLogFilter === 'all'
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20'
                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]'
                ]"
              >
                <i class="fas fa-layer-group mr-2"></i>
                Все
              </button>
              <button
                @click="changeFilter('info')"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-all',
                  currentLogFilter === 'info'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-blue-400 hover:bg-blue-950/30 hover:border-blue-800/50'
                ]"
              >
                <i class="fas fa-info-circle mr-2"></i>
                Info
              </button>
              <button
                @click="changeFilter('warn')"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-all',
                  currentLogFilter === 'warn'
                    ? 'bg-yellow-600 border-yellow-600 text-white shadow-lg shadow-yellow-600/20'
                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-yellow-400 hover:bg-yellow-950/30 hover:border-yellow-800/50'
                ]"
              >
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Warning
              </button>
              <button
                @click="changeFilter('error')"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-all',
                  currentLogFilter === 'error'
                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-red-400 hover:bg-red-950/30 hover:border-red-800/50'
                ]"
              >
                <i class="fas fa-exclamation-circle mr-2"></i>
                Error
              </button>
            </div>
          </div>
        </div>

        <!-- Окно логов -->
        <div
          class="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6"
        >
          <div
            v-if="logsError"
            class="mb-4 p-4 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm"
          >
            <i class="fas fa-exclamation-circle mr-2"></i>
            {{ logsError }}
          </div>
          <div
            v-if="isLoadingLogs && logs.length === 0"
            class="text-center py-8 text-[var(--color-text-secondary)]"
          >
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Загрузка логов...</p>
          </div>

          <div
            v-else-if="filteredLogs.length === 0"
            class="text-center py-8 text-[var(--color-text-secondary)]"
          >
            <i class="fas fa-inbox text-2xl mb-2"></i>
            <p>Логи отсутствуют</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="log in filteredLogs"
              :key="log.id"
              :class="['p-4 rounded-lg border font-mono text-sm', levelBgColors[log.level]]"
            >
              <div class="flex items-start gap-3">
                <span :class="['font-bold uppercase flex-shrink-0', levelColors[log.level]]">
                  [{{ log.level }}]
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-[var(--color-text)] break-words">{{ log.message }}</p>
                  <div
                    class="flex flex-wrap items-center gap-4 mt-2 text-xs text-[var(--color-text-tertiary)]"
                  >
                    <span>{{ formatDate(log.createdAt) }}</span>
                    <span v-if="log.code" class="text-[var(--color-accent)]">{{ log.code }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Загрузка следующей порции — переход по ссылке (полная перезагрузка страницы, Heap доступен при рендере) -->
          <div
            v-if="filteredLogs.length > 0"
            class="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-[var(--color-border)]"
          >
            <a
              v-if="loadMoreUrl"
              :href="loadMoreUrl"
              class="px-6 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-medium rounded-lg border border-[var(--color-border)] transition-colors inline-flex items-center"
            >
              <i class="fas fa-plus mr-2"></i>
              Показать ещё 50
            </a>
            <a
              v-if="loadAllUrl"
              :href="loadAllUrl"
              class="px-6 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium rounded-lg transition-colors inline-flex items-center"
            >
              <i class="fas fa-list mr-2"></i>
              Показать все (1000)
            </a>

            <div class="text-sm text-[var(--color-text-secondary)]">
              Показано: {{ logs.length }}
              <span v-if="!loadMoreUrl && logs.length > 0" class="text-green-400 ml-2">
                <i class="fas fa-check-circle mr-1"></i>
                все загружены
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
