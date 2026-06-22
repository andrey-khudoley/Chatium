<script setup lang="ts">
// Карточки настроек админки: «Название проекта», «Уровень логирования» и «GetCourse».
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

// GetCourse настройки
const GC_PLAIN_KEYS = [
  { key: 'gateway_base_url', label: 'URL гейтвея (gateway_base_url)', placeholder: 'https://...' },
  {
    key: 'gc_school_host',
    label: 'Хост школы (gc_school_host)',
    placeholder: 'school.getcourse.ru'
  },
  {
    key: 'gc_default_offer_id',
    label: 'Оффер по умолчанию (gc_default_offer_id)',
    placeholder: '12345'
  },
  { key: 'gc_paid_status', label: 'Статус «оплачен» в GC (gc_paid_status)', placeholder: 'payed' }
] as const

const GC_SECRET_KEYS = [
  { key: 'gc_school_api_key', label: 'API-ключ школы (gc_school_api_key)' },
  { key: 'webhook_path_token', label: 'Токен вебхука (webhook_path_token)' }
] as const

type PlainKeyType = (typeof GC_PLAIN_KEYS)[number]['key']
type SecretKeyType = (typeof GC_SECRET_KEYS)[number]['key']

const gcPlainValues = ref<Record<PlainKeyType, string>>({
  gateway_base_url: '',
  gc_school_host: '',
  gc_default_offer_id: '',
  gc_paid_status: ''
})
const gcPlainErrors = ref<Record<PlainKeyType, string>>({
  gateway_base_url: '',
  gc_school_host: '',
  gc_default_offer_id: '',
  gc_paid_status: ''
})
const gcPlainSaveStatus = ref<Record<PlainKeyType, 'saved' | 'error' | null>>({
  gateway_base_url: null,
  gc_school_host: null,
  gc_default_offer_id: null,
  gc_paid_status: null
})
const gcPlainDebounceTimers: Record<PlainKeyType, { id: ReturnType<typeof setTimeout> | null }> = {
  gateway_base_url: { id: null },
  gc_school_host: { id: null },
  gc_default_offer_id: { id: null },
  gc_paid_status: { id: null }
}
const gcPlainLastSaved = ref<Record<PlainKeyType, string>>({
  gateway_base_url: '',
  gc_school_host: '',
  gc_default_offer_id: '',
  gc_paid_status: ''
})
const gcPlainStatusTimeouts: Record<PlainKeyType, { id: ReturnType<typeof setTimeout> | null }> = {
  gateway_base_url: { id: null },
  gc_school_host: { id: null },
  gc_default_offer_id: { id: null },
  gc_paid_status: { id: null }
}

const gcSecretValues = ref<Record<SecretKeyType, string>>({
  gc_school_api_key: '',
  webhook_path_token: ''
})
const gcSecretConfigured = ref<Record<SecretKeyType, boolean>>({
  gc_school_api_key: false,
  webhook_path_token: false
})
const gcSecretErrors = ref<Record<SecretKeyType, string>>({
  gc_school_api_key: '',
  webhook_path_token: ''
})
const gcSecretSaveStatus = ref<Record<SecretKeyType, 'saved' | 'error' | null>>({
  gc_school_api_key: null,
  webhook_path_token: null
})
const gcSecretStatusTimeouts: Record<SecretKeyType, { id: ReturnType<typeof setTimeout> | null }> =
  {
    gc_school_api_key: { id: null },
    webhook_path_token: { id: null }
  }

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

function showFieldSaveStatus<T extends string>(
  statusRef: { value: Record<T, 'saved' | 'error' | null> },
  timeoutHolder: { id: ReturnType<typeof setTimeout> | null },
  key: T,
  status: 'saved' | 'error'
) {
  if (timeoutHolder.id) clearTimeout(timeoutHolder.id)
  statusRef.value[key] = status
  timeoutHolder.id = setTimeout(() => {
    statusRef.value[key] = null
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

// ---------------------------------------------------------------------------
// GetCourse — несекретные поля
// ---------------------------------------------------------------------------

const loadGcPlain = async () => {
  for (const { key } of GC_PLAIN_KEYS) {
    try {
      const res = await getSettingRoute.query({ key }).run(ctx)
      const data = res as { success?: boolean; value?: unknown }
      if (data?.success && typeof data.value === 'string') {
        gcPlainValues.value[key as PlainKeyType] = data.value
        gcPlainLastSaved.value[key as PlainKeyType] = data.value
      }
    } catch (e) {
      log.warning(`Не удалось загрузить ${key}`, e)
    }
  }
}

const saveGcPlain = async (key: PlainKeyType) => {
  gcPlainErrors.value[key] = ''
  const value = gcPlainValues.value[key].trim()
  try {
    const res = await saveSettingRoute.run(ctx, { key, value })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      gcPlainErrors.value[key] = data.error || 'Ошибка сохранения'
      showFieldSaveStatus(gcPlainSaveStatus, gcPlainStatusTimeouts[key], key, 'error')
    } else {
      gcPlainLastSaved.value[key] = value
      showFieldSaveStatus(gcPlainSaveStatus, gcPlainStatusTimeouts[key], key, 'saved')
    }
  } catch (e) {
    gcPlainErrors.value[key] = (e as Error)?.message || 'Ошибка сохранения'
    showFieldSaveStatus(gcPlainSaveStatus, gcPlainStatusTimeouts[key], key, 'error')
  }
}

const onGcPlainInput = (key: PlainKeyType) => {
  if (gcPlainDebounceTimers[key].id) clearTimeout(gcPlainDebounceTimers[key].id)
  gcPlainDebounceTimers[key].id = setTimeout(() => {
    gcPlainDebounceTimers[key].id = null
    const trimmed = gcPlainValues.value[key].trim()
    if (trimmed !== gcPlainLastSaved.value[key]) {
      void saveGcPlain(key)
    }
  }, INPUT_DEBOUNCE_MS)
}

// ---------------------------------------------------------------------------
// GetCourse — секреты (write-only)
// ---------------------------------------------------------------------------

const loadGcSecretConfigured = async () => {
  for (const { key } of GC_SECRET_KEYS) {
    try {
      const res = await getSettingRoute.query({ key }).run(ctx)
      const data = res as { success?: boolean; value?: unknown }
      if (data?.success) {
        const val = data.value as { configured?: boolean } | undefined
        gcSecretConfigured.value[key as SecretKeyType] = !!val?.configured
      }
    } catch (e) {
      log.warning(`Не удалось проверить ${key}`, e)
    }
  }
}

const saveGcSecret = async (key: SecretKeyType) => {
  const value = gcSecretValues.value[key]
  if (!value.trim()) {
    // Не сохраняем пустое значение
    return
  }
  gcSecretErrors.value[key] = ''
  try {
    const res = await saveSettingRoute.run(ctx, { key, value })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      gcSecretErrors.value[key] = data.error || 'Ошибка сохранения'
      showFieldSaveStatus(gcSecretSaveStatus, gcSecretStatusTimeouts[key], key, 'error')
    } else {
      gcSecretValues.value[key] = '' // очищаем поле после сохранения
      gcSecretConfigured.value[key] = true
      showFieldSaveStatus(gcSecretSaveStatus, gcSecretStatusTimeouts[key], key, 'saved')
    }
  } catch (e) {
    gcSecretErrors.value[key] = (e as Error)?.message || 'Ошибка сохранения'
    showFieldSaveStatus(gcSecretSaveStatus, gcSecretStatusTimeouts[key], key, 'error')
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
  void loadGcPlain()
  void loadGcSecretConfigured()
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
  for (const key of Object.keys(gcPlainDebounceTimers) as PlainKeyType[]) {
    if (gcPlainDebounceTimers[key].id) clearTimeout(gcPlainDebounceTimers[key].id!)
    if (gcPlainStatusTimeouts[key].id) clearTimeout(gcPlainStatusTimeouts[key].id!)
  }
  for (const key of Object.keys(gcSecretStatusTimeouts) as SecretKeyType[]) {
    if (gcSecretStatusTimeouts[key].id) clearTimeout(gcSecretStatusTimeouts[key].id!)
  }
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

    <section class="ap-card ap-card--stagger-4">
      <div class="ap-card-hd">
        <h2><i class="fas fa-link ap-icon-hd"></i> GetCourse</h2>
      </div>

      <!-- Несекретные поля -->
      <div v-for="field in GC_PLAIN_KEYS" :key="field.key" class="ap-field">
        <label class="ap-label">{{ field.label }}</label>
        <div class="ap-input-row">
          <input
            v-model="gcPlainValues[field.key]"
            type="text"
            class="ap-input"
            :placeholder="field.placeholder"
            @input="onGcPlainInput(field.key)"
          />
          <span
            v-if="gcPlainSaveStatus[field.key]"
            class="ap-badge"
            :class="gcPlainSaveStatus[field.key] === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
          >
            <i
              :class="gcPlainSaveStatus[field.key] === 'saved' ? 'fas fa-check' : 'fas fa-times'"
            ></i>
            {{ gcPlainSaveStatus[field.key] === 'saved' ? 'OK' : 'ERR' }}
          </span>
        </div>
        <p v-if="gcPlainErrors[field.key]" class="ap-err">
          <i class="fas fa-exclamation-circle"></i> {{ gcPlainErrors[field.key] }}
        </p>
      </div>

      <!-- Секреты (write-only) -->
      <div v-for="secret in GC_SECRET_KEYS" :key="secret.key" class="ap-field">
        <label class="ap-label">
          {{ secret.label }}
          <span v-if="gcSecretConfigured[secret.key]" class="ap-badge ap-badge--ok ap-badge--sm">
            <i class="fas fa-lock"></i> задан
          </span>
          <span v-else class="ap-badge ap-badge--warn ap-badge--sm">
            <i class="fas fa-lock-open"></i> не задан
          </span>
        </label>
        <div class="ap-input-row">
          <input
            v-model="gcSecretValues[secret.key]"
            type="password"
            class="ap-input"
            placeholder="Введите новое значение"
            autocomplete="off"
          />
          <button
            type="button"
            class="ap-btn"
            :disabled="!gcSecretValues[secret.key].trim()"
            @click="saveGcSecret(secret.key)"
          >
            Сохранить
          </button>
          <span
            v-if="gcSecretSaveStatus[secret.key]"
            class="ap-badge"
            :class="gcSecretSaveStatus[secret.key] === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
          >
            <i
              :class="gcSecretSaveStatus[secret.key] === 'saved' ? 'fas fa-check' : 'fas fa-times'"
            ></i>
            {{ gcSecretSaveStatus[secret.key] === 'saved' ? 'OK' : 'ERR' }}
          </span>
        </div>
        <p v-if="gcSecretErrors[secret.key]" class="ap-err">
          <i class="fas fa-exclamation-circle"></i> {{ gcSecretErrors[secret.key] }}
        </p>
      </div>
    </section>
  </div>
</template>
