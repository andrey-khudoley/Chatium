<script setup lang="ts">
// Карточка настроек колеса: wheel_enabled, wheel_max_spins, theme.
// Загружает настройки через getSettingRoute, сохраняет через saveSettingRoute.
// Варианты тем передаются пропом themeOptions от AdminPage (список берётся из SSR).
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { resetWheelRoute } from '../../api/admin/wheel/reset'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminWheelSettings')

declare const ctx: app.Ctx

const props = defineProps<{
  themeOptions: { id: string; name: string }[]
  winnersUrl?: string
}>()

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300

// wheel_enabled
const wheelEnabled = ref(true)
const enabledSaveStatus = ref<'saved' | 'error' | null>(null)
const enabledStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const enabledError = ref('')

// wheel_max_spins
const maxSpins = ref(1)
const lastSavedMaxSpins = ref(1)
const maxSpinsError = ref('')
const maxSpinsDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const maxSpinsSaveStatus = ref<'saved' | 'error' | null>(null)
const maxSpinsStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

// theme
const selectedTheme = ref('gold')
const themeSaveStatus = ref<'saved' | 'error' | null>(null)
const themeStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const themeError = ref('')

// wheel_brand_label — подпись бренда на странице колеса
const brandLabel = ref('')
const lastSavedBrandLabel = ref('')
const brandLabelError = ref('')
const brandLabelDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const brandLabelSaveStatus = ref<'saved' | 'error' | null>(null)
const brandLabelStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

// reset wheel — сброс попыток и результатов
const resetConfirmVisible = ref(false)
const resetLoading = ref(false)
const resetSaveStatus = ref<'saved' | 'error' | null>(null)
const resetStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const resetError = ref('')

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

async function loadSetting(key: string): Promise<unknown> {
  try {
    const res = await getSettingRoute.query({ key }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success) return data.value
  } catch (e) {
    log.warning(`Не удалось загрузить настройку ${key}`, e)
  }
  return undefined
}

async function saveSetting(
  key: string,
  value: unknown,
  statusRef: { value: 'saved' | 'error' | null },
  timeoutHolder: { id: ReturnType<typeof setTimeout> | null },
  errorRef: { value: string }
): Promise<boolean> {
  errorRef.value = ''
  try {
    const res = await saveSettingRoute.run(ctx, { key, value })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      errorRef.value = data.error || 'Ошибка сохранения'
      showSaveStatus(statusRef, timeoutHolder, 'error')
      log.error(`Не удалось сохранить ${key}`, errorRef.value)
      return false
    }
    showSaveStatus(statusRef, timeoutHolder, 'saved')
    log.info(`Настройка ${key} сохранена`, value)
    return true
  } catch (e) {
    errorRef.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(statusRef, timeoutHolder, 'error')
    log.error(`Ошибка сохранения ${key}`, e)
    return false
  }
}

async function toggleWheelEnabled() {
  wheelEnabled.value = !wheelEnabled.value
  await saveSetting(
    'wheel_enabled',
    wheelEnabled.value,
    enabledSaveStatus,
    enabledStatusTimeout,
    enabledError
  )
}

async function saveMaxSpins() {
  const val = maxSpins.value
  if (!Number.isInteger(val) || val < 1) {
    maxSpinsError.value = 'Введите целое положительное число'
    showSaveStatus(maxSpinsSaveStatus, maxSpinsStatusTimeout, 'error')
    return
  }
  maxSpinsError.value = ''
  const ok = await saveSetting(
    'wheel_max_spins',
    val,
    maxSpinsSaveStatus,
    maxSpinsStatusTimeout,
    maxSpinsError
  )
  if (ok) lastSavedMaxSpins.value = val
}

async function saveTheme(themeId: string) {
  selectedTheme.value = themeId
  await saveSetting('theme', themeId, themeSaveStatus, themeStatusTimeout, themeError)
}

async function saveBrandLabel() {
  const val = brandLabel.value.trim()
  const ok = await saveSetting(
    'wheel_brand_label',
    val,
    brandLabelSaveStatus,
    brandLabelStatusTimeout,
    brandLabelError
  )
  if (ok) lastSavedBrandLabel.value = val
}

function showResetConfirm() {
  resetConfirmVisible.value = true
}

function cancelReset() {
  resetConfirmVisible.value = false
}

async function confirmReset() {
  resetConfirmVisible.value = false
  resetLoading.value = true
  resetError.value = ''
  try {
    const res = await resetWheelRoute.run(ctx)
    const data = res as {
      success?: boolean
      deletedSpins?: number
      deletedGrants?: number
      error?: string
    }
    if (data?.success === false) {
      resetError.value = data.error || 'Ошибка сброса'
      showSaveStatus(resetSaveStatus, resetStatusTimeout, 'error')
      log.error('Ошибка сброса колеса', resetError.value)
    } else {
      showSaveStatus(resetSaveStatus, resetStatusTimeout, 'saved')
      log.info('Колесо сброшено', {
        deletedSpins: data?.deletedSpins,
        deletedGrants: data?.deletedGrants
      })
    }
  } catch (e) {
    resetError.value = (e as Error)?.message || 'Ошибка сброса'
    showSaveStatus(resetSaveStatus, resetStatusTimeout, 'error')
    log.error('Ошибка сброса колеса', e)
  } finally {
    resetLoading.value = false
  }
}

// Debounce для maxSpins
watch(maxSpins, () => {
  if (maxSpinsDebounceTimer.id) clearTimeout(maxSpinsDebounceTimer.id)
  maxSpinsDebounceTimer.id = setTimeout(() => {
    maxSpinsDebounceTimer.id = null
    if (maxSpins.value !== lastSavedMaxSpins.value) {
      saveMaxSpins()
    }
  }, INPUT_DEBOUNCE_MS)
})

// Debounce для brandLabel
watch(brandLabel, () => {
  if (brandLabelDebounceTimer.id) clearTimeout(brandLabelDebounceTimer.id)
  brandLabelDebounceTimer.id = setTimeout(() => {
    brandLabelDebounceTimer.id = null
    if (brandLabel.value.trim() !== lastSavedBrandLabel.value) {
      saveBrandLabel()
    }
  }, INPUT_DEBOUNCE_MS)
})

onMounted(async () => {
  log.info('Компонент смонтирован')

  const [enabled, spins, theme, brand] = await Promise.all([
    loadSetting('wheel_enabled'),
    loadSetting('wheel_max_spins'),
    loadSetting('theme'),
    loadSetting('wheel_brand_label')
  ])

  if (typeof enabled === 'boolean') wheelEnabled.value = enabled

  const spinsNum = typeof spins === 'number' ? spins : parseInt(String(spins ?? '1'), 10)
  if (Number.isInteger(spinsNum) && spinsNum >= 1) {
    maxSpins.value = spinsNum
    lastSavedMaxSpins.value = spinsNum
  }

  if (typeof theme === 'string' && theme.trim()) {
    selectedTheme.value = theme.trim()
  }

  if (typeof brand === 'string') {
    brandLabel.value = brand
    lastSavedBrandLabel.value = brand.trim()
  }
})

onBeforeUnmount(() => {
  if (enabledStatusTimeout.id) clearTimeout(enabledStatusTimeout.id)
  if (maxSpinsDebounceTimer.id) clearTimeout(maxSpinsDebounceTimer.id)
  if (maxSpinsStatusTimeout.id) clearTimeout(maxSpinsStatusTimeout.id)
  if (themeStatusTimeout.id) clearTimeout(themeStatusTimeout.id)
  if (brandLabelDebounceTimer.id) clearTimeout(brandLabelDebounceTimer.id)
  if (brandLabelStatusTimeout.id) clearTimeout(brandLabelStatusTimeout.id)
  if (resetStatusTimeout.id) clearTimeout(resetStatusTimeout.id)
})
</script>

<template>
  <section class="ap-card ap-card--stagger-4">
    <div class="ap-card-hd">
      <h2><i class="fas fa-cog ap-icon-hd"></i> Настройки колеса</h2>
      <span
        v-if="enabledSaveStatus || maxSpinsSaveStatus || themeSaveStatus"
        class="ap-badge"
        :class="
          (enabledSaveStatus || maxSpinsSaveStatus || themeSaveStatus) === 'saved'
            ? 'ap-badge--ok'
            : 'ap-badge--err'
        "
      >
        <i
          :class="
            (enabledSaveStatus || maxSpinsSaveStatus || themeSaveStatus) === 'saved'
              ? 'fas fa-check'
              : 'fas fa-times'
          "
        ></i>
        {{
          (enabledSaveStatus || maxSpinsSaveStatus || themeSaveStatus) === 'saved' ? 'OK' : 'ERR'
        }}
      </span>
    </div>

    <!-- wheel_enabled -->
    <div class="ap-field-row">
      <label class="ap-label">Колесо включено</label>
      <button
        type="button"
        class="ap-toggle"
        :class="{ 'ap-toggle--on': wheelEnabled }"
        @click="toggleWheelEnabled"
        :aria-pressed="wheelEnabled"
        aria-label="Включить или выключить колесо"
      >
        <span class="ap-toggle__track"></span>
        <span class="ap-toggle__thumb"></span>
        <span class="ap-toggle__label">{{ wheelEnabled ? 'ВКЛ' : 'ВЫКЛ' }}</span>
      </button>
      <span
        v-if="enabledSaveStatus"
        class="ap-badge ap-badge--inline"
        :class="enabledSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        {{ enabledSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <p v-if="enabledError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ enabledError }}
    </p>

    <!-- wheel_max_spins -->
    <div class="ap-field-row">
      <label class="ap-label" for="wheel-max-spins">Макс. попыток (базовый лимит)</label>
      <span
        v-if="maxSpinsSaveStatus"
        class="ap-badge ap-badge--inline"
        :class="maxSpinsSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        {{ maxSpinsSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <input
      id="wheel-max-spins"
      v-model.number="maxSpins"
      type="number"
      min="1"
      step="1"
      class="ap-input"
      placeholder="1"
    />
    <p v-if="maxSpinsError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ maxSpinsError }}
    </p>

    <!-- theme -->
    <div class="ap-field-row">
      <label class="ap-label" for="wheel-theme">Тема оформления</label>
      <span
        v-if="themeSaveStatus"
        class="ap-badge ap-badge--inline"
        :class="themeSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        {{ themeSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <select
      id="wheel-theme"
      class="ap-input"
      :value="selectedTheme"
      @change="saveTheme(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="t in themeOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
    <p v-if="themeError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ themeError }}
    </p>

    <!-- wheel_brand_label -->
    <div class="ap-field-row">
      <label class="ap-label" for="wheel-brand-label">Подпись бренда (над колесом)</label>
      <span
        v-if="brandLabelSaveStatus"
        class="ap-badge ap-badge--inline"
        :class="brandLabelSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        {{ brandLabelSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <input
      id="wheel-brand-label"
      v-model="brandLabel"
      type="text"
      class="ap-input"
      placeholder="Онлайн-школа · Анастасия Ларина"
    />
    <p v-if="brandLabelError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ brandLabelError }}
    </p>

    <!-- Ссылка на список победителей (§7) -->
    <div v-if="winnersUrl" class="ap-field-row" style="margin-top: 8px">
      <a
        :href="winnersUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="ap-label"
        style="text-decoration: underline; cursor: pointer"
      >
        <i class="fas fa-trophy" style="margin-right: 6px"></i>Список победителей
      </a>
    </div>

    <!-- Сброс попыток и результатов (§7) -->
    <div class="ap-field-row" style="margin-top: 16px">
      <label class="ap-label">Сброс данных колеса</label>
      <span
        v-if="resetSaveStatus"
        class="ap-badge ap-badge--inline"
        :class="resetSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        {{ resetSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>

    <!-- Inline-подтверждение (§7) -->
    <div v-if="resetConfirmVisible" class="ap-confirm">
      <p class="ap-confirm__msg">
        <i class="fas fa-exclamation-triangle" style="color: #e07070; margin-right: 6px"></i>
        Точно? Это удалит все попытки и результаты
      </p>
      <div class="ap-confirm__actions">
        <button
          type="button"
          class="ap-btn ap-btn--danger"
          :disabled="resetLoading"
          @click="confirmReset"
        >
          {{ resetLoading ? 'Сброс…' : 'Да, сбросить' }}
        </button>
        <button
          type="button"
          class="ap-btn ap-btn--secondary"
          :disabled="resetLoading"
          @click="cancelReset"
        >
          Отмена
        </button>
      </div>
    </div>

    <button
      v-if="!resetConfirmVisible"
      type="button"
      class="ap-btn ap-btn--danger"
      :disabled="resetLoading"
      @click="showResetConfirm"
    >
      <i class="fas fa-trash-alt" style="margin-right: 6px"></i>
      Сбросить попытки и результаты
    </button>

    <p v-if="resetError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ resetError }}
    </p>
  </section>
</template>
