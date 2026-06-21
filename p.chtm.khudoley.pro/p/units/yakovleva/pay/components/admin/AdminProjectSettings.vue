<script setup lang="ts">
// Карточка «Название проекта»: input с debounce-сохранением и индикатором OK/ERR.
// Источник истины при первой загрузке — `initialProjectName` (берётся из projectTitle SSR).
// Компонент эмитит изменение текущего значения родителю, чтобы статус-бар показывал актуальное.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminProjectSettings')

declare const ctx: app.Ctx

const props = defineProps<{
  initialProjectName: string
}>()

const emit = defineEmits<{
  (e: 'update:projectName', value: string): void
}>()

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300

const projectName = ref(props.initialProjectName)
const lastSavedProjectName = ref(props.initialProjectName)
const projectNameError = ref('')
const projectNameLoading = ref(false)
const projectNameDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const projectNameSaveStatus = ref<'saved' | 'error' | null>(null)
const projectNameStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showSaveStatus(status: 'saved' | 'error') {
  if (projectNameStatusTimeout.id) clearTimeout(projectNameStatusTimeout.id)
  projectNameSaveStatus.value = status
  projectNameStatusTimeout.id = setTimeout(() => {
    projectNameSaveStatus.value = null
    projectNameStatusTimeout.id = null
  }, SAVE_STATUS_DURATION_MS)
}

const loadProjectName = async () => {
  log.info('loadProjectName entry')
  try {
    const res = await getSettingRoute.query({ key: 'project_name' }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      const loaded = data.value
      projectName.value = loaded
      lastSavedProjectName.value = loaded
      log.info('loadProjectName loaded')
      log.debug('loadProjectName loaded', { value: loaded })
    } else {
      log.info('loadProjectName no value')
    }
  } catch (e) {
    log.warning('Не удалось загрузить имя проекта', e)
  }
}

const saveProjectName = async () => {
  log.info('saveProjectName entry')
  log.debug('saveProjectName entry', { name: projectName.value })
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
      showSaveStatus('error')
    } else {
      lastSavedProjectName.value = projectName.value.trim()
      showSaveStatus('saved')
    }
  } catch (e) {
    projectNameError.value = (e as Error)?.message || 'Ошибка сохранения'
    projectName.value = prev
    showSaveStatus('error')
  } finally {
    projectNameLoading.value = false
    log.info('saveProjectName exit')
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

onMounted(() => {
  loadProjectName()
})

onBeforeUnmount(() => {
  if (projectNameStatusTimeout.id) {
    clearTimeout(projectNameStatusTimeout.id)
    projectNameStatusTimeout.id = null
  }
  if (projectNameDebounceTimer.id) {
    clearTimeout(projectNameDebounceTimer.id)
    projectNameDebounceTimer.id = null
  }
})
</script>

<template>
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
</template>
