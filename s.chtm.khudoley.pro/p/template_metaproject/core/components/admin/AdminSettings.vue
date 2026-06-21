<script setup lang="ts">
// Карточки настроек админки: «Название проекта» и «Уровень логирования».
// Компонент самодостаточен (грузит/сохраняет настройки сам) и эмитит изменения,
// чтобы статус-бар страницы отображал актуальные значения.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminSettings')

declare const ctx: app.Ctx

const props = defineProps<{
  initialProjectName: string
}>()

const emit = defineEmits<{
  (e: 'update:projectName', value: string): void
  (e: 'update:logLevel', value: 'debug' | 'info' | 'warn' | 'error' | 'disable'): void
}>()

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300
const LOG_LEVEL_VALUES = ['debug', 'info', 'warn', 'error', 'disable'] as const

const projectName = ref(props.initialProjectName)
const lastSavedProjectName = ref(props.initialProjectName)
const projectNameError = ref('')
const projectNameLoading = ref(false)
const projectNameDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const projectNameSaveStatus = ref<'saved' | 'error' | null>(null)
const projectNameStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const logLevel = ref<'debug' | 'info' | 'warn' | 'error' | 'disable'>('info')
const logLevelError = ref('')
const logLevelSaveStatus = ref<'saved' | 'error' | null>(null)
const logLevelStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showSaveStatus(
  statusRef: { value: 'saved' | 'error' | null },
  timeoutHolder: { id: ReturnType<typeof setTimeout> | null },
  status: 'saved' | 'error'
) {
  if (timeoutHolder.id) clearTimeout(timeoutHolder.id)
  statusRef.value = status
  timeoutHolder.id = setTimeout(() => {
    statusRef.value = null
    timeoutHolder.id = null
  }, SAVE_STATUS_DURATION_MS)
}

const loadProjectName = async () => {
  try {
    const res = await getSettingRoute.query({ key: 'project_name' }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      projectName.value = data.value
      lastSavedProjectName.value = data.value
    }
  } catch (e) {
    log.warning('Не удалось загрузить имя проекта', e)
  }
}

const saveProjectName = async () => {
  projectNameError.value = ''
  projectNameLoading.value = true
  const prev = projectName.value
  try {
    const res = await saveSettingRoute.run(ctx, {
      key: 'project_name',
      value: projectName.value.trim()
    })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      projectNameError.value = data.error || 'Ошибка сохранения'
      projectName.value = prev
      showSaveStatus(projectNameSaveStatus, projectNameStatusTimeout, 'error')
    } else {
      lastSavedProjectName.value = projectName.value.trim()
      showSaveStatus(projectNameSaveStatus, projectNameStatusTimeout, 'saved')
    }
  } catch (e) {
    projectNameError.value = (e as Error)?.message || 'Ошибка сохранения'
    projectName.value = prev
    showSaveStatus(projectNameSaveStatus, projectNameStatusTimeout, 'error')
  } finally {
    projectNameLoading.value = false
  }
}

const setLogLevel = async (level: 'debug' | 'info' | 'warn' | 'error' | 'disable') => {
  const prev = logLevel.value
  logLevel.value = level
  logLevelError.value = ''
  log.notice('Уровень логирования изменён', { from: prev, to: level })
  try {
    const res = await saveSettingRoute.run(ctx, { key: 'log_level', value: level })
    if (res && (res as { success?: boolean }).success === false) {
      logLevel.value = prev
      logLevelError.value = (res as { error?: string }).error || 'Ошибка сохранения'
      showSaveStatus(logLevelSaveStatus, logLevelStatusTimeout, 'error')
      log.error('Не удалось сохранить уровень логирования', logLevelError.value)
    } else {
      showSaveStatus(logLevelSaveStatus, logLevelStatusTimeout, 'saved')
      log.info('Уровень логирования успешно сохранён', level)
    }
  } catch (e) {
    logLevel.value = prev
    logLevelError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(logLevelSaveStatus, logLevelStatusTimeout, 'error')
    log.error('Не удалось сохранить уровень логирования', logLevelError.value)
  }
}

watch(projectName, () => {
  emit('update:projectName', projectName.value)
  if (projectNameDebounceTimer.id) clearTimeout(projectNameDebounceTimer.id)
  projectNameDebounceTimer.id = setTimeout(() => {
    projectNameDebounceTimer.id = null
    const trimmed = String(projectName.value ?? '').trim()
    if (trimmed !== lastSavedProjectName.value) {
      saveProjectName()
    }
  }, INPUT_DEBOUNCE_MS)
})

watch(logLevel, () => emit('update:logLevel', logLevel.value))

onMounted(() => {
  loadProjectName()
  const bootLevel = (window as Window & { __BOOT__?: { logLevel?: string } }).__BOOT__?.logLevel
  if (typeof bootLevel === 'string') {
    const normalized = bootLevel.toLowerCase()
    if (LOG_LEVEL_VALUES.includes(normalized as (typeof LOG_LEVEL_VALUES)[number])) {
      logLevel.value = normalized as (typeof LOG_LEVEL_VALUES)[number]
    }
  }
})

onBeforeUnmount(() => {
  if (projectNameStatusTimeout.id) clearTimeout(projectNameStatusTimeout.id)
  if (logLevelStatusTimeout.id) clearTimeout(logLevelStatusTimeout.id)
  if (projectNameDebounceTimer.id) clearTimeout(projectNameDebounceTimer.id)
})
</script>

<template>
  <div class="ap-cfg-row">
    <section class="ap-card ap-card--stagger-2">
      <div class="ap-card-hd">
        <h2><i class="fas fa-pen ap-icon-hd"></i> Название проекта</h2>
        <span
          v-if="projectNameSaveStatus"
          class="ap-badge"
          :class="projectNameSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >
          <i :class="projectNameSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
          {{ projectNameSaveStatus === 'saved' ? 'OK' : 'ERR' }}
        </span>
      </div>
      <input v-model="projectName" type="text" class="ap-input" placeholder="Имя проекта" />
      <p v-if="projectNameError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ projectNameError }}
      </p>
    </section>

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
  </div>
</template>
