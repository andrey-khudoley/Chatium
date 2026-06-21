<script setup lang="ts">
// Карточка «Уровень логирования»: кнопки Debug/Info/Warn/Error/Disable с активным состоянием.
// При монтировании читает уровень из `window.__BOOT__.logLevel` (SSR), сохранение через saveSettingRoute.
// Эмитит выбранный уровень родителю для отображения в статус-баре страницы.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { saveSettingRoute } from '../../api/settings/save'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminLogLevel')

declare const ctx: app.Ctx

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'disable'
const LOG_LEVEL_VALUES = ['debug', 'info', 'warn', 'error', 'disable'] as const
const SAVE_STATUS_DURATION_MS = 1500

const emit = defineEmits<{
  (e: 'update:logLevel', value: LogLevel): void
}>()

const logLevel = ref<LogLevel>('info')
const logLevelError = ref('')
const logLevelSaveStatus = ref<'saved' | 'error' | null>(null)
const logLevelStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showSaveStatus(status: 'saved' | 'error') {
  if (logLevelStatusTimeout.id) clearTimeout(logLevelStatusTimeout.id)
  logLevelSaveStatus.value = status
  logLevelStatusTimeout.id = setTimeout(() => {
    logLevelSaveStatus.value = null
    logLevelStatusTimeout.id = null
  }, SAVE_STATUS_DURATION_MS)
}

const setLogLevel = async (level: LogLevel) => {
  const prev = logLevel.value
  logLevel.value = level
  logLevelError.value = ''
  log.notice('Уровень логирования изменён', { from: prev, to: level })
  try {
    const res = await saveSettingRoute.run(ctx, { key: 'log_level', value: level })
    if (res && (res as { success?: boolean }).success === false) {
      logLevel.value = prev
      const errMsg = (res as { error?: string }).error || 'Ошибка сохранения'
      logLevelError.value = errMsg
      showSaveStatus('error')
      log.error('Не удалось сохранить уровень логирования', errMsg)
    } else {
      showSaveStatus('saved')
      log.info('Уровень логирования успешно сохранён', level)
    }
  } catch (e) {
    logLevel.value = prev
    const errMsg = (e as Error)?.message || 'Ошибка сохранения'
    logLevelError.value = errMsg
    showSaveStatus('error')
    log.error('Не удалось сохранить уровень логирования', errMsg)
  }
}

watch(logLevel, () => emit('update:logLevel', logLevel.value))

onMounted(() => {
  const bootLevel = (window as Window & { __BOOT__?: { logLevel?: string } }).__BOOT__?.logLevel
  log.debug('Boot logLevel from SSR', { bootLevel })
  if (typeof bootLevel === 'string') {
    const normalized = bootLevel.toLowerCase()
    if (LOG_LEVEL_VALUES.includes(normalized as (typeof LOG_LEVEL_VALUES)[number])) {
      logLevel.value = normalized as (typeof LOG_LEVEL_VALUES)[number]
    }
  }
})

onBeforeUnmount(() => {
  if (logLevelStatusTimeout.id) {
    clearTimeout(logLevelStatusTimeout.id)
    logLevelStatusTimeout.id = null
  }
})
</script>

<template>
  <section class="ap-card ap-card--stagger-3">
    <div class="ap-card-hd">
      <h2><i class="fas fa-sliders-h ap-icon-hd"></i> Уровень логирования</h2>
      <span
        v-if="logLevelSaveStatus"
        class="ap-badge"
        :class="logLevelSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        <i :class="logLevelSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
        {{ logLevelSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <div class="ap-lvls">
      <button
        v-for="lvl in LOG_LEVEL_VALUES"
        :key="lvl"
        type="button"
        class="ap-lvl"
        :class="{ active: logLevel === lvl }"
        @click="setLogLevel(lvl)"
      >
        {{ lvl.toUpperCase() }}
      </button>
    </div>
    <p v-if="logLevelError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ logLevelError }}
    </p>
  </section>
</template>
