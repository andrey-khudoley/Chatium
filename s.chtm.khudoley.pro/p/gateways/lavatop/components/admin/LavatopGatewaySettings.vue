<script setup lang="ts">
// Карточки настроек шлюза Lava.Top: тестовый API-ключ, секрет вебхуков, базовый URL API.
// Компонент самодостаточен (грузит/сохраняет настройки сам, с дебаунсом как имя проекта).
// CSS глобальный (.ap-*), подключается из web/admin/index.tsx.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import {
  LAVA_TEST_APIKEY,
  LAVA_WEBHOOK_SECRET_KEY,
  LAVA_BASE_URL_KEY,
  LAVA_DEFAULT_BASE_URL,
  normalizeLavaBaseUrlInput
} from '../../shared/gatewaySettingKeys'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('LavatopGatewaySettings')

declare const ctx: app.Ctx

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300

const lavaTestApikey = ref('')
const lastSavedLavaTestApikey = ref('')
const lavaTestApikeyError = ref('')
const lavaTestApikeyDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const lavaTestApikeySaveStatus = ref<'saved' | 'error' | null>(null)
const lavaTestApikeyStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const lavaWebhookSecret = ref('')
const lastSavedLavaWebhookSecret = ref('')
const lavaWebhookSecretError = ref('')
const lavaWebhookSecretDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const lavaWebhookSecretSaveStatus = ref<'saved' | 'error' | null>(null)
const lavaWebhookSecretStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const lavaBaseUrl = ref('')
const lastSavedLavaBaseUrl = ref('')
const lavaBaseUrlError = ref('')
const lavaBaseUrlDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const lavaBaseUrlSaveStatus = ref<'saved' | 'error' | null>(null)
const lavaBaseUrlStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

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

const loadLavaTestApikey = async () => {
  try {
    const res = await getSettingRoute.query({ key: LAVA_TEST_APIKEY }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      lavaTestApikey.value = data.value
      lastSavedLavaTestApikey.value = data.value
      log.debug('loadLavaTestApikey loaded', { length: data.value.length })
    }
  } catch (e) {
    log.warning('Не удалось загрузить lava_test_apikey', e)
  }
}

const loadLavaWebhookSecret = async () => {
  try {
    const res = await getSettingRoute.query({ key: LAVA_WEBHOOK_SECRET_KEY }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      lavaWebhookSecret.value = data.value
      lastSavedLavaWebhookSecret.value = data.value
      log.debug('loadLavaWebhookSecret loaded', { length: data.value.length })
    }
  } catch (e) {
    log.warning('Не удалось загрузить lava_webhook_secret', e)
  }
}

const loadLavaBaseUrl = async () => {
  try {
    const res = await getSettingRoute.query({ key: LAVA_BASE_URL_KEY }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string' && data.value.trim()) {
      lavaBaseUrl.value = data.value
      lastSavedLavaBaseUrl.value = normalizeLavaBaseUrlInput(data.value)
      log.debug('loadLavaBaseUrl loaded', { value: data.value })
    }
  } catch (e) {
    log.warning('Не удалось загрузить lava_base_url', e)
  }
}

const saveLavaTestApikey = async () => {
  log.info('saveLavaTestApikey entry')
  lavaTestApikeyError.value = ''
  const trimmed = String(lavaTestApikey.value ?? '').trim()
  if (!trimmed) {
    lavaTestApikeyError.value = 'Значение не должно быть пустым'
    showSaveStatus(lavaTestApikeySaveStatus, lavaTestApikeyStatusTimeout, 'error')
    return
  }
  const prev = lavaTestApikey.value
  try {
    const res = await saveSettingRoute.run(ctx, { key: LAVA_TEST_APIKEY, value: trimmed })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      lavaTestApikeyError.value = data.error || 'Ошибка сохранения'
      lavaTestApikey.value = prev
      showSaveStatus(lavaTestApikeySaveStatus, lavaTestApikeyStatusTimeout, 'error')
    } else {
      lastSavedLavaTestApikey.value = trimmed
      showSaveStatus(lavaTestApikeySaveStatus, lavaTestApikeyStatusTimeout, 'saved')
    }
  } catch (e) {
    lavaTestApikeyError.value = (e as Error)?.message || 'Ошибка сохранения'
    lavaTestApikey.value = prev
    showSaveStatus(lavaTestApikeySaveStatus, lavaTestApikeyStatusTimeout, 'error')
  }
}

const saveLavaWebhookSecret = async () => {
  log.info('saveLavaWebhookSecret entry')
  lavaWebhookSecretError.value = ''
  const trimmed = String(lavaWebhookSecret.value ?? '').trim()
  if (!trimmed) {
    lavaWebhookSecretError.value = 'Значение не должно быть пустым'
    showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'error')
    return
  }
  const prev = lavaWebhookSecret.value
  try {
    const res = await saveSettingRoute.run(ctx, { key: LAVA_WEBHOOK_SECRET_KEY, value: trimmed })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      lavaWebhookSecretError.value = data.error || 'Ошибка сохранения'
      lavaWebhookSecret.value = prev
      showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'error')
    } else {
      lastSavedLavaWebhookSecret.value = trimmed
      showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'saved')
    }
  } catch (e) {
    lavaWebhookSecretError.value = (e as Error)?.message || 'Ошибка сохранения'
    lavaWebhookSecret.value = prev
    showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'error')
  }
}

const saveLavaBaseUrl = async () => {
  log.info('saveLavaBaseUrl entry')
  lavaBaseUrlError.value = ''
  const normalized = normalizeLavaBaseUrlInput(String(lavaBaseUrl.value ?? ''))
  const prev = lavaBaseUrl.value
  try {
    const res = await saveSettingRoute.run(ctx, { key: LAVA_BASE_URL_KEY, value: normalized })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      lavaBaseUrlError.value = data.error || 'Ошибка сохранения'
      lavaBaseUrl.value = prev
      showSaveStatus(lavaBaseUrlSaveStatus, lavaBaseUrlStatusTimeout, 'error')
    } else {
      lastSavedLavaBaseUrl.value = normalized
      showSaveStatus(lavaBaseUrlSaveStatus, lavaBaseUrlStatusTimeout, 'saved')
    }
  } catch (e) {
    lavaBaseUrlError.value = (e as Error)?.message || 'Ошибка сохранения'
    lavaBaseUrl.value = prev
    showSaveStatus(lavaBaseUrlSaveStatus, lavaBaseUrlStatusTimeout, 'error')
  }
}

watch(lavaTestApikey, () => {
  if (lavaTestApikeyDebounceTimer.id) clearTimeout(lavaTestApikeyDebounceTimer.id)
  lavaTestApikeyDebounceTimer.id = setTimeout(() => {
    lavaTestApikeyDebounceTimer.id = null
    const trimmed = String(lavaTestApikey.value ?? '').trim()
    if (trimmed && trimmed !== lastSavedLavaTestApikey.value) {
      saveLavaTestApikey()
    }
  }, INPUT_DEBOUNCE_MS)
})

watch(lavaWebhookSecret, () => {
  if (lavaWebhookSecretDebounceTimer.id) clearTimeout(lavaWebhookSecretDebounceTimer.id)
  lavaWebhookSecretDebounceTimer.id = setTimeout(() => {
    lavaWebhookSecretDebounceTimer.id = null
    const trimmed = String(lavaWebhookSecret.value ?? '').trim()
    if (trimmed && trimmed !== lastSavedLavaWebhookSecret.value) {
      saveLavaWebhookSecret()
    }
  }, INPUT_DEBOUNCE_MS)
})

watch(lavaBaseUrl, () => {
  if (lavaBaseUrlDebounceTimer.id) clearTimeout(lavaBaseUrlDebounceTimer.id)
  lavaBaseUrlDebounceTimer.id = setTimeout(() => {
    lavaBaseUrlDebounceTimer.id = null
    const normalized = normalizeLavaBaseUrlInput(String(lavaBaseUrl.value ?? ''))
    if (normalized !== lastSavedLavaBaseUrl.value) {
      saveLavaBaseUrl()
    }
  }, INPUT_DEBOUNCE_MS)
})

onMounted(() => {
  loadLavaTestApikey()
  loadLavaWebhookSecret()
  loadLavaBaseUrl()
})

onBeforeUnmount(() => {
  if (lavaTestApikeyStatusTimeout.id) {
    clearTimeout(lavaTestApikeyStatusTimeout.id)
    lavaTestApikeyStatusTimeout.id = null
  }
  if (lavaTestApikeyDebounceTimer.id) {
    clearTimeout(lavaTestApikeyDebounceTimer.id)
    lavaTestApikeyDebounceTimer.id = null
  }
  if (lavaWebhookSecretStatusTimeout.id) {
    clearTimeout(lavaWebhookSecretStatusTimeout.id)
    lavaWebhookSecretStatusTimeout.id = null
  }
  if (lavaWebhookSecretDebounceTimer.id) {
    clearTimeout(lavaWebhookSecretDebounceTimer.id)
    lavaWebhookSecretDebounceTimer.id = null
  }
  if (lavaBaseUrlStatusTimeout.id) {
    clearTimeout(lavaBaseUrlStatusTimeout.id)
    lavaBaseUrlStatusTimeout.id = null
  }
  if (lavaBaseUrlDebounceTimer.id) {
    clearTimeout(lavaBaseUrlDebounceTimer.id)
    lavaBaseUrlDebounceTimer.id = null
  }
})
</script>

<template>
  <div class="ap-cfg-row">
    <section class="ap-card ap-card--stagger-2">
      <div class="ap-card-hd">
        <h2><i class="fas fa-key ap-icon-hd"></i> Тестовый API-ключ Lava.Top</h2>
        <span
          v-if="lavaTestApikeySaveStatus"
          class="ap-badge"
          :class="lavaTestApikeySaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >
          <i :class="lavaTestApikeySaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
          {{ lavaTestApikeySaveStatus === 'saved' ? 'OK' : 'ERR' }}
        </span>
      </div>
      <input
        v-model="lavaTestApikey"
        type="password"
        autocomplete="off"
        class="ap-input"
        placeholder="API-ключ тестового магазина Lava.Top"
      />
      <p class="ap-hint">Подставляется в форме «Создать запрос» (заголовок X-Lava-Apikey).</p>
      <p v-if="lavaTestApikeyError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ lavaTestApikeyError }}
      </p>
    </section>

    <section class="ap-card ap-card--stagger-3">
      <div class="ap-card-hd">
        <h2><i class="fas fa-shield-alt ap-icon-hd"></i> Секрет вебхуков Lava.Top</h2>
        <span
          v-if="lavaWebhookSecretSaveStatus"
          class="ap-badge"
          :class="lavaWebhookSecretSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >
          <i :class="lavaWebhookSecretSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
          {{ lavaWebhookSecretSaveStatus === 'saved' ? 'OK' : 'ERR' }}
        </span>
      </div>
      <input
        v-model="lavaWebhookSecret"
        type="password"
        autocomplete="off"
        class="ap-input"
        placeholder="Секрет X-Api-Key / Basic для приёма вебхуков"
      />
      <p class="ap-hint">Сверяется с заголовком входящих вебхуков. Без него приём вернёт 500.</p>
      <p v-if="lavaWebhookSecretError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ lavaWebhookSecretError }}
      </p>
    </section>
  </div>

  <section class="ap-card ap-card--stagger-3">
    <div class="ap-card-hd">
      <h2><i class="fas fa-link ap-icon-hd"></i> Базовый URL API Lava.Top</h2>
      <span
        v-if="lavaBaseUrlSaveStatus"
        class="ap-badge"
        :class="lavaBaseUrlSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        <i :class="lavaBaseUrlSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
        {{ lavaBaseUrlSaveStatus === 'saved' ? 'OK' : 'ERR' }}
      </span>
    </div>
    <input
      v-model="lavaBaseUrl"
      type="text"
      inputmode="url"
      autocomplete="off"
      class="ap-input"
      :placeholder="LAVA_DEFAULT_BASE_URL"
    />
    <p class="ap-hint">
      По умолчанию {{ LAVA_DEFAULT_BASE_URL }}. Пустое значение вернёт URL к дефолту.
    </p>
    <p v-if="lavaBaseUrlError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ lavaBaseUrlError }}
    </p>
  </section>
</template>
