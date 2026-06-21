<script setup lang="ts">
// Карточка настроек GetCourse (ключ разработчика, тестовый ключ школы, хост).
// Самодостаточна: грузит/сохраняет значения через api/settings. CSS глобальный (.ap-gc-*).
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import {
  GC_DEVELOPER_API_KEY,
  GC_TEST_SCHOOL_API_KEY,
  GC_TEST_SCHOOL_HOST
} from '../../shared/gatewaySettingKeys'
import { getGcSchoolHostFieldError } from '../../shared/gcSchoolHostValidation'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('GcSchoolSettings')

declare const ctx: app.Ctx

const SAVE_STATUS_DURATION_MS = 1500

const gcDevKey = ref('')
const gcSchoolApiKey = ref('')
const gcSchoolHost = ref('')
const showGcDevKey = ref(false)
const showGcSchoolKey = ref(false)
const gcGatewayErrors = ref({ dev: '', school: '', host: '' })
const gcGatewaySaveLoading = ref(false)
const gcGatewaySaveStatus = ref<'saved' | 'error' | null>(null)
const gcGatewayStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showSaveStatus(status: 'saved' | 'error') {
  if (gcGatewayStatusTimeout.id) clearTimeout(gcGatewayStatusTimeout.id)
  gcGatewaySaveStatus.value = status
  gcGatewayStatusTimeout.id = setTimeout(() => {
    gcGatewaySaveStatus.value = null
    gcGatewayStatusTimeout.id = null
  }, SAVE_STATUS_DURATION_MS)
}

async function readSettingString(key: string): Promise<string> {
  try {
    const res = await getSettingRoute.query({ key }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      return data.value
    }
  } catch (e) {
    log.warning('Не удалось прочитать настройку', { key, e })
  }
  return ''
}

const loadGcGatewaySettings = async () => {
  gcDevKey.value = await readSettingString(GC_DEVELOPER_API_KEY)
  gcSchoolApiKey.value = await readSettingString(GC_TEST_SCHOOL_API_KEY)
  gcSchoolHost.value = await readSettingString(GC_TEST_SCHOOL_HOST)
  gcGatewayErrors.value = { dev: '', school: '', host: '' }
}

const saveGcGatewaySettings = async () => {
  gcGatewayErrors.value = { dev: '', school: '', host: '' }
  gcGatewaySaveStatus.value = null
  const dev = gcDevKey.value.trim()
  const school = gcSchoolApiKey.value.trim()
  const hostRaw = gcSchoolHost.value
  if (!dev) {
    gcGatewayErrors.value.dev =
      'Ключ разработчика GetCourse: укажите непустое значение после обрезки пробелов (разд. 5.4 manual).'
    showSaveStatus('error')
    return
  }
  if (!school) {
    gcGatewayErrors.value.school =
      'Тестовый ключ школы: укажите непустое значение после обрезки пробелов (разд. 5.4–5.5 manual).'
    showSaveStatus('error')
    return
  }
  const hostErr = getGcSchoolHostFieldError(hostRaw)
  if (hostErr) {
    gcGatewayErrors.value.host = hostErr
    showSaveStatus('error')
    return
  }
  const host = hostRaw.trim()

  gcGatewaySaveLoading.value = true
  try {
    const pairs: Array<{ key: string; value: string }> = [
      { key: GC_DEVELOPER_API_KEY, value: dev },
      { key: GC_TEST_SCHOOL_API_KEY, value: school },
      { key: GC_TEST_SCHOOL_HOST, value: host }
    ]
    for (const { key, value } of pairs) {
      const res = await saveSettingRoute.run(ctx, { key, value })
      const data = res as { success?: boolean; error?: string }
      if (data?.success === false) {
        const msg = data.error || 'Ошибка сохранения'
        if (key === GC_DEVELOPER_API_KEY) gcGatewayErrors.value.dev = msg
        else if (key === GC_TEST_SCHOOL_API_KEY) gcGatewayErrors.value.school = msg
        else gcGatewayErrors.value.host = msg
        showSaveStatus('error')
        return
      }
    }
    showSaveStatus('saved')
    await loadGcGatewaySettings()
  } catch (e) {
    gcGatewayErrors.value.dev = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus('error')
  } finally {
    gcGatewaySaveLoading.value = false
  }
}

onMounted(loadGcGatewaySettings)
onBeforeUnmount(() => {
  if (gcGatewayStatusTimeout.id) clearTimeout(gcGatewayStatusTimeout.id)
})
</script>

<template>
  <section class="ap-card ap-card--stagger-4 ap-card--gc">
    <div class="ap-card-hd">
      <h2><i class="fas fa-key ap-icon-hd"></i> GetCourse — тестовая школа</h2>
      <span
        v-if="gcGatewaySaveStatus"
        class="ap-badge"
        :class="gcGatewaySaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        <i :class="gcGatewaySaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
        {{ gcGatewaySaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <p class="ap-gc-lead">
      Значения пишутся в Heap через <code class="ap-gc-code">api/settings/save</code>. Пустые и
      пробельные значения ключей отклоняются; хост — без схемы и без пробелов, как для заголовка
      <code class="ap-gc-code">X-Gc-School-Host</code> (разд. 5.4 и 2.5 в gateway-operation-manual).
    </p>

    <div class="ap-gc-field">
      <label class="ap-gc-label" for="gc-dev-key-input">Ключ разработчика GetCourse</label>
      <div class="ap-gc-input-row">
        <input
          id="gc-dev-key-input"
          v-model="gcDevKey"
          :type="showGcDevKey ? 'text' : 'password'"
          class="ap-input ap-input--grow"
          autocomplete="off"
          spellcheck="false"
          placeholder="devKey из GetCourse"
        />
        <button
          type="button"
          class="ap-btn ap-btn--sm ap-gc-toggle"
          :aria-pressed="showGcDevKey"
          :title="showGcDevKey ? 'Скрыть' : 'Показать'"
          @click="showGcDevKey = !showGcDevKey"
        >
          <i :class="showGcDevKey ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
        </button>
      </div>
      <p v-if="gcGatewayErrors.dev" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ gcGatewayErrors.dev }}
      </p>
    </div>

    <div class="ap-gc-field">
      <label class="ap-gc-label" for="gc-school-key-input">Тестовый ключ школы</label>
      <div class="ap-gc-input-row">
        <input
          id="gc-school-key-input"
          v-model="gcSchoolApiKey"
          :type="showGcSchoolKey ? 'text' : 'password'"
          class="ap-input ap-input--grow"
          autocomplete="off"
          spellcheck="false"
          placeholder="API-ключ тестовой школы"
        />
        <button
          type="button"
          class="ap-btn ap-btn--sm ap-gc-toggle"
          :aria-pressed="showGcSchoolKey"
          :title="showGcSchoolKey ? 'Скрыть' : 'Показать'"
          @click="showGcSchoolKey = !showGcSchoolKey"
        >
          <i :class="showGcSchoolKey ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
        </button>
      </div>
      <p v-if="gcGatewayErrors.school" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ gcGatewayErrors.school }}
      </p>
    </div>

    <div class="ap-gc-field">
      <label class="ap-gc-label" for="gc-host-input">Хост тестовой школы</label>
      <input
        id="gc-host-input"
        v-model="gcSchoolHost"
        type="text"
        class="ap-input"
        autocomplete="off"
        spellcheck="false"
        placeholder="schoolname.getcourse.ru (без https://)"
      />
      <p v-if="gcGatewayErrors.host" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ gcGatewayErrors.host }}
      </p>
    </div>

    <div class="ap-gc-actions">
      <button
        type="button"
        class="ap-btn"
        :disabled="gcGatewaySaveLoading"
        @click="saveGcGatewaySettings"
      >
        <i :class="gcGatewaySaveLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
        Сохранить настройки GetCourse
      </button>
    </div>
  </section>
</template>
