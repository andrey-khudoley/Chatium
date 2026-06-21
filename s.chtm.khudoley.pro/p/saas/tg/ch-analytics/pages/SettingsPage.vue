<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { apiSaveLogLevelRoute } from '../api/settings'
import { LOG_LEVEL_SETTING_KEY, DEFAULT_LOG_LEVEL } from '../lib/logging'
import type { DebugLevel } from '../shared/debug'

declare const ctx: any

interface Setting {
  id: string
  key: string
  value: any
}

const props = defineProps<{
  settings: Setting[]
  projectTitle: string
}>()

const logLevel = ref<DebugLevel>(DEFAULT_LOG_LEVEL)
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

const logLevelSetting = computed(() => {
  return props.settings.find((s) => s.key === LOG_LEVEL_SETTING_KEY)
})

const logLevels: { value: DebugLevel; label: string; description: string }[] = [
  { value: 'info', label: 'Info', description: 'Все логи (info, warn, error)' },
  { value: 'warn', label: 'Warn', description: 'Предупреждения и ошибки (warn, error)' },
  { value: 'error', label: 'Error', description: 'Только ошибки (error)' }
]

// Отслеживаем изменения настроек для корректной инициализации уровня логирования
watch(
  logLevelSetting,
  (newSetting) => {
    if (newSetting) {
      const value = String(newSetting.value).toLowerCase()
      console.log('[SettingsPage] Найден уровень логирования в настройках:', value)
      if (value === 'info' || value === 'warn' || value === 'error') {
        logLevel.value = value as DebugLevel
        console.log('[SettingsPage] Уровень логирования установлен из настроек:', logLevel.value)
      } else {
        console.warn('[SettingsPage] Некорректный уровень логирования в настройках:', value)
        console.log('[SettingsPage] Используется уровень по умолчанию:', DEFAULT_LOG_LEVEL)
      }
    } else {
      console.log(
        '[SettingsPage] Настройка уровня логирования не найдена, используется по умолчанию:',
        DEFAULT_LOG_LEVEL
      )
    }
  },
  { immediate: true }
) // immediate: true для выполнения при монтировании

const saveLogLevel = async () => {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  console.log('[SettingsPage] Начало сохранения уровня логирования:', logLevel.value)

  try {
    const result = await apiSaveLogLevelRoute.run(ctx, {
      level: logLevel.value
    })

    console.log('[SettingsPage] Результат сохранения:', result)

    if (result.success) {
      console.log('[SettingsPage] Уровень логирования успешно сохранён:', result.level)
      saveSuccess.value = true
      setTimeout(() => {
        saveSuccess.value = false
        console.log('[SettingsPage] Сообщение об успехе скрыто')
      }, 3000)
    } else {
      const errorMsg = result.error || 'Ошибка при сохранении уровня логирования'
      console.warn('[SettingsPage] Ошибка в ответе API:', errorMsg)
      saveError.value = errorMsg
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Ошибка при сохранении уровня логирования'
    console.error('[SettingsPage] Исключение при сохранении уровня логирования:', error)
    console.error('[SettingsPage] Stack trace:', error.stack)
    saveError.value = errorMsg
  } finally {
    saving.value = false
    console.log('[SettingsPage] Сохранение завершено, saving установлен в false')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <!-- Header -->
    <header class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] py-4">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow"
          >
            <i class="fas fa-chart-line text-white"></i>
          </div>
          <h1 class="text-xl font-bold text-[var(--color-text)]">{{ projectTitle }}</h1>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 py-8">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="card">
          <div class="flex items-center gap-3 mb-6">
            <i class="fas fa-cog text-xl" style="color: var(--color-primary)"></i>
            <h2 class="text-2xl font-bold">Настройки</h2>
          </div>

          <!-- Настройка уровня логирования -->
          <div class="setting-section mb-8">
            <div class="setting-header mb-4">
              <div class="flex items-center gap-3">
                <i class="fas fa-bug text-lg" style="color: var(--color-primary)"></i>
                <h3 class="text-lg font-semibold">Уровень логирования</h3>
              </div>
              <p class="text-sm text-[var(--color-text-secondary)] mt-2">
                Выберите уровень детализации логов для модуля
              </p>
            </div>

            <div class="setting-content">
              <div class="log-level-selector">
                <div
                  v-for="level in logLevels"
                  :key="level.value"
                  class="log-level-option"
                  :class="{ active: logLevel === level.value }"
                  @click="logLevel = level.value"
                >
                  <div class="log-level-header">
                    <input
                      type="radio"
                      :id="`log-level-${level.value}`"
                      :value="level.value"
                      v-model="logLevel"
                      class="log-level-radio"
                    />
                    <label :for="`log-level-${level.value}`" class="log-level-label">
                      <span class="log-level-name">{{ level.label }}</span>
                      <span class="log-level-badge" :class="`badge-${level.value}`">
                        {{ level.value }}
                      </span>
                    </label>
                  </div>
                  <p class="log-level-description">{{ level.description }}</p>
                </div>
              </div>

              <div class="setting-actions mt-4">
                <button
                  @click="saveLogLevel"
                  :disabled="saving"
                  class="save-btn"
                  :class="{ saving: saving }"
                >
                  <i v-if="!saving" class="fas fa-save"></i>
                  <i v-else class="fas fa-spinner fa-spin"></i>
                  <span>{{ saving ? 'Сохранение...' : 'Сохранить' }}</span>
                </button>

                <div v-if="saveError" class="error-message mt-2">
                  <i class="fas fa-exclamation-circle"></i>
                  <span>{{ saveError }}</span>
                </div>

                <div v-if="saveSuccess" class="success-message mt-2">
                  <i class="fas fa-check-circle"></i>
                  <span>Уровень логирования успешно сохранён</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Остальные настройки -->
          <div class="settings-list">
            <div class="setting-header mb-4">
              <div class="flex items-center gap-3">
                <i class="fas fa-list text-lg" style="color: var(--color-primary)"></i>
                <h3 class="text-lg font-semibold">Все настройки</h3>
              </div>
            </div>

            <div v-if="settings.length === 0" class="text-center py-12">
              <i class="fas fa-inbox text-4xl mb-4 text-[var(--color-text-tertiary)]"></i>
              <p class="text-[var(--color-text-secondary)]">Нет настроек</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Ключ</th>
                    <th>Значение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="setting in settings" :key="setting.id">
                    <td class="font-medium">{{ setting.key }}</td>
                    <td>{{ String(setting.value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] py-4">
      <div class="container mx-auto px-4 max-w-4xl">
        <div
          class="flex items-center justify-center gap-2 text-[var(--color-text-secondary)] text-sm"
        >
          <i class="fas fa-chart-line"></i>
          <span>{{ projectTitle }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --color-bg: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-tertiary: #64748b;
  --color-border: #334155;
  --color-primary: #38bdf8;
  --color-primary-hover: #0ea5e9;
  --transition: all 0.2s ease;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  letter-spacing: 0.03em;
}

/* Стилизация выделения текста */
::selection {
  background: #e0335a;
  color: #ffffff;
}

::-moz-selection {
  background: #e0335a;
  color: #ffffff;
}

.card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
  border: 1.5px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.table th {
  font-weight: 400;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
}

.table tr:hover {
  background: var(--color-bg-secondary);
}

/* Настройка уровня логирования */
.setting-section {
  margin-bottom: 2rem;
}

.setting-header {
  margin-bottom: 1rem;
}

.setting-content {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.log-level-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-level-option {
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: var(--transition);
  background: var(--color-bg-secondary);
}

.log-level-option:hover {
  border-color: var(--color-primary);
  background: var(--color-bg);
}

.log-level-option.active {
  border-color: var(--color-primary);
  background: var(--color-bg);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.log-level-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.log-level-radio {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.log-level-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  flex: 1;
}

.log-level-name {
  font-weight: 500;
  font-size: 1rem;
}

.log-level-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-info {
  background: rgba(56, 189, 248, 0.2);
  color: var(--color-primary);
}

.badge-warn {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.badge-error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.log-level-description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
  margin-left: 2rem;
}

.setting-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  max-width: 200px;
}

.save-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn.saving {
  opacity: 0.8;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 0.5rem;
  color: #22c55e;
  font-size: 0.875rem;
}

.settings-list {
  margin-top: 2rem;
}

/* Глобальный эффект глитча для всей страницы */
.global-glitch-active {
  animation: global-page-glitch 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both !important;
}

@keyframes global-page-glitch {
  0%,
  100% {
    transform: translate(0) skew(0deg);
    filter: none;
  }
  10% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
      hue-rotate(90deg);
  }
  20% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
      hue-rotate(-90deg);
  }
  30% {
    transform: translate(-2px, 0) skew(-0.3deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.8))
      brightness(1.2);
  }
  40% {
    transform: translate(2px, 0) skew(0.3deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.8))
      contrast(1.3);
  }
  50% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
      saturate(2);
  }
  60% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
      invert(0.1);
  }
  70% {
    transform: translate(-2px, 0) skew(-0.2deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.6))
      brightness(1.1);
  }
  80% {
    transform: translate(2px, 0) skew(0.2deg);
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(1px 0 0 rgba(0, 255, 255, 0.6))
      contrast(1.2);
  }
  90% {
    transform: translate(-1px, 0) skew(0deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.5))
      brightness(1.05);
  }
}

.global-glitch-active * {
  pointer-events: none !important;
}
</style>
