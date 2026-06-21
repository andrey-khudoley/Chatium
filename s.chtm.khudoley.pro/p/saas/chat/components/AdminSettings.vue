<template>
  <div class="admin-settings">
    <div class="settings-header">
      <h2>Настройки приложения</h2>
      <p class="subtitle">Управление конфигурацией приложения</p>
    </div>

    <!-- Логирование и метрики -->
    <AppSection
      title="Логирование и метрики"
      icon="fas fa-list-alt"
      description="Уровень логирования и счётчики событий (обработанные сообщения, ошибки)."
    >
      <AppNotification v-if="loggingLoadError" type="error" :message="loggingLoadError" />
      <template v-else>
        <div class="form-row">
          <AppSelect v-model="logLevel" label="Уровень логирования" :options="logLevelOptions" />
          <AppButton
            variant="primary"
            :loading="logLevelSaving"
            loading-text="Сохранение…"
            @click="saveLogLevel"
          >
            Сохранить уровень
          </AppButton>
        </div>
        <AppCard title="Счётчики событий" class="metrics-card">
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">Обработано сообщений</span>
              <span class="metric-value">{{ metrics.processedMessages ?? 0 }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Ошибки</span>
              <span class="metric-value">{{ metrics.errors ?? 0 }}</span>
            </div>
          </div>
          <AppButton
            variant="secondary"
            :loading="resetMetricsLoading"
            loading-text="Сброс…"
            @click="resetMetrics"
          >
            Сбросить
          </AppButton>
        </AppCard>
      </template>
    </AppSection>

    <!-- Roadmap -->
    <AppSection title="План развития" icon="fas fa-road">
      <ul class="roadmap-list">
        <li><i class="fas fa-check"></i> WebSocket (real-time сообщения)</li>
        <li><i class="fas fa-check"></i> Inbox API (счётчики непрочитанных)</li>
        <li><i class="fas fa-check"></i> Голосовые сообщения и видео-заметки</li>
        <li><i class="fas fa-check"></i> AI-агенты в чатах</li>
        <li><i class="fas fa-check"></i> Платные чаты и подписки</li>
      </ul>
    </AppSection>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppSection from './ui/AppSection.vue'
import AppSelect from './ui/AppSelect.vue'
import AppButton from './ui/AppButton.vue'
import AppNotification from './ui/AppNotification.vue'
import AppCard from './ui/AppCard.vue'
import { apiLoggingGetLevelRoute } from '../api/logging/get-level'
import { apiLoggingSetLevelRoute } from '../api/logging/set-level'
import { apiLoggingGetMetricsRoute } from '../api/logging/get-metrics'
import { apiLoggingResetMetricsRoute } from '../api/logging/reset-metrics'

const logLevelOptions = [
  { value: 'Disable', label: 'Выключено' },
  { value: 'Error', label: 'Error' },
  { value: 'Warn', label: 'Warn' },
  { value: 'Info', label: 'Info' },
  { value: 'Debug', label: 'Debug' }
]

const logLevel = ref('Info')
const logLevelSaving = ref(false)
const metrics = ref({ processedMessages: 0, errors: 0 })
const resetMetricsLoading = ref(false)
const loggingLoadError = ref('')

async function loadLogging() {
  try {
    const levelRes = await apiLoggingGetLevelRoute.run(ctx)
    if (levelRes?.level) logLevel.value = levelRes.level
    const metricsRes = await apiLoggingGetMetricsRoute.run(ctx)
    if (metricsRes?.metrics) metrics.value = { ...metrics.value, ...metricsRes.metrics }
  } catch (e) {
    loggingLoadError.value = e?.message || 'Не удалось загрузить настройки логирования'
  }
}

async function saveLogLevel() {
  logLevelSaving.value = true
  try {
    const res = await apiLoggingSetLevelRoute.run(ctx, { level: logLevel.value })
    if (!res?.success) loggingLoadError.value = res?.error || 'Ошибка сохранения'
    else loggingLoadError.value = ''
  } finally {
    logLevelSaving.value = false
  }
}

async function resetMetrics() {
  resetMetricsLoading.value = true
  try {
    await apiLoggingResetMetricsRoute.run(ctx)
    await loadLogging()
  } finally {
    resetMetricsLoading.value = false
  }
}

onMounted(() => {
  loadLogging()
})
</script>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.settings-header {
  margin-bottom: 32px;
}

.settings-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 8px;
}

.subtitle {
  color: var(--c-text-secondary);
  margin: 0;
}

.metrics-card {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border);
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.roadmap-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.roadmap-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text-primary);
}

.roadmap-list li:last-child {
  border-bottom: none;
}

.roadmap-list li i {
  width: 20px;
  text-align: center;
}

.roadmap-list li i.fa-check {
  color: var(--c-success);
}

.roadmap-list li i.fa-times {
  color: var(--c-danger);
}

.metrics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text-primary);
}
</style>
