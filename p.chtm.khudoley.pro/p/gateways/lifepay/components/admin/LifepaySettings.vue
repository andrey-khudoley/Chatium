<script setup lang="ts">
// Карточки настроек LifePay-шлюза: «Тестовый API-ключ LifePay» и «Тестовый логин LifePay».
// Самодостаточен: грузит/сохраняет значения через api/settings; debounce-автосейв.
// CSS глобальный (стандартные классы .ap-card/.ap-input — инжектятся на странице админки).
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { LP_TEST_APIKEY, LP_TEST_LOGIN, isValidLpLogin } from '../../shared/gatewaySettingKeys'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('LifepaySettings')

declare const ctx: app.Ctx

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300

const lpTestApikey = ref('')
const lastSavedLpTestApikey = ref('')
const lpTestApikeyError = ref('')
const lpTestApikeyDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const lpTestApikeySaveStatus = ref<'saved' | 'error' | null>(null)
const lpTestApikeyStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const lpTestLogin = ref('')
const lastSavedLpTestLogin = ref('')
const lpTestLoginError = ref('')
const lpTestLoginDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const lpTestLoginSaveStatus = ref<'saved' | 'error' | null>(null)
const lpTestLoginStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

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

const loadLpTestApikey = async () => {
  log.info('loadLpTestApikey entry')
  try {
    const res = await getSettingRoute.query({ key: LP_TEST_APIKEY }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      lpTestApikey.value = data.value
      lastSavedLpTestApikey.value = data.value
      log.debug('loadLpTestApikey loaded', { length: data.value.length })
    }
  } catch (e) {
    log.warning('Не удалось загрузить lp_test_apikey', e)
  }
}

const loadLpTestLogin = async () => {
  log.info('loadLpTestLogin entry')
  try {
    const res = await getSettingRoute.query({ key: LP_TEST_LOGIN }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      lpTestLogin.value = data.value
      lastSavedLpTestLogin.value = data.value
      log.debug('loadLpTestLogin loaded', { length: data.value.length })
    }
  } catch (e) {
    log.warning('Не удалось загрузить lp_test_login', e)
  }
}

const saveLpTestApikey = async () => {
  log.info('saveLpTestApikey entry')
  lpTestApikeyError.value = ''
  const trimmed = String(lpTestApikey.value ?? '').trim()
  if (!trimmed) {
    lpTestApikeyError.value = 'Значение не должно быть пустым'
    showSaveStatus(lpTestApikeySaveStatus, lpTestApikeyStatusTimeout, 'error')
    return
  }
  const prev = lpTestApikey.value
  try {
    const res = await saveSettingRoute.run(ctx, { key: LP_TEST_APIKEY, value: trimmed })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      lpTestApikeyError.value = data.error || 'Ошибка сохранения'
      lpTestApikey.value = prev
      showSaveStatus(lpTestApikeySaveStatus, lpTestApikeyStatusTimeout, 'error')
    } else {
      lastSavedLpTestApikey.value = trimmed
      showSaveStatus(lpTestApikeySaveStatus, lpTestApikeyStatusTimeout, 'saved')
    }
  } catch (e) {
    lpTestApikeyError.value = (e as Error)?.message || 'Ошибка сохранения'
    lpTestApikey.value = prev
    showSaveStatus(lpTestApikeySaveStatus, lpTestApikeyStatusTimeout, 'error')
  }
}

const saveLpTestLogin = async () => {
  log.info('saveLpTestLogin entry')
  lpTestLoginError.value = ''
  const trimmed = String(lpTestLogin.value ?? '').trim()
  if (!trimmed) {
    lpTestLoginError.value = 'Значение не должно быть пустым'
    showSaveStatus(lpTestLoginSaveStatus, lpTestLoginStatusTimeout, 'error')
    return
  }
  if (!isValidLpLogin(trimmed)) {
    lpTestLoginError.value = 'Ожидаются 11 цифр, первая 7 (формат 7XXXXXXXXXX)'
    showSaveStatus(lpTestLoginSaveStatus, lpTestLoginStatusTimeout, 'error')
    return
  }
  const prev = lpTestLogin.value
  try {
    const res = await saveSettingRoute.run(ctx, { key: LP_TEST_LOGIN, value: trimmed })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      lpTestLoginError.value = data.error || 'Ошибка сохранения'
      lpTestLogin.value = prev
      showSaveStatus(lpTestLoginSaveStatus, lpTestLoginStatusTimeout, 'error')
    } else {
      lastSavedLpTestLogin.value = trimmed
      showSaveStatus(lpTestLoginSaveStatus, lpTestLoginStatusTimeout, 'saved')
    }
  } catch (e) {
    lpTestLoginError.value = (e as Error)?.message || 'Ошибка сохранения'
    lpTestLogin.value = prev
    showSaveStatus(lpTestLoginSaveStatus, lpTestLoginStatusTimeout, 'error')
  }
}

watch(lpTestApikey, () => {
  if (lpTestApikeyDebounceTimer.id) clearTimeout(lpTestApikeyDebounceTimer.id)
  lpTestApikeyDebounceTimer.id = setTimeout(() => {
    lpTestApikeyDebounceTimer.id = null
    const trimmed = String(lpTestApikey.value ?? '').trim()
    if (trimmed && trimmed !== lastSavedLpTestApikey.value) {
      saveLpTestApikey()
    }
  }, INPUT_DEBOUNCE_MS)
})

watch(lpTestLogin, () => {
  if (lpTestLoginDebounceTimer.id) clearTimeout(lpTestLoginDebounceTimer.id)
  lpTestLoginDebounceTimer.id = setTimeout(() => {
    lpTestLoginDebounceTimer.id = null
    const trimmed = String(lpTestLogin.value ?? '').trim()
    if (trimmed && trimmed !== lastSavedLpTestLogin.value) {
      saveLpTestLogin()
    }
  }, INPUT_DEBOUNCE_MS)
})

onMounted(() => {
  loadLpTestApikey()
  loadLpTestLogin()
})

onBeforeUnmount(() => {
  if (lpTestApikeyStatusTimeout.id) {
    clearTimeout(lpTestApikeyStatusTimeout.id)
    lpTestApikeyStatusTimeout.id = null
  }
  if (lpTestApikeyDebounceTimer.id) {
    clearTimeout(lpTestApikeyDebounceTimer.id)
    lpTestApikeyDebounceTimer.id = null
  }
  if (lpTestLoginStatusTimeout.id) {
    clearTimeout(lpTestLoginStatusTimeout.id)
    lpTestLoginStatusTimeout.id = null
  }
  if (lpTestLoginDebounceTimer.id) {
    clearTimeout(lpTestLoginDebounceTimer.id)
    lpTestLoginDebounceTimer.id = null
  }
})
</script>

<template>
  <div class="ap-cfg-row">
    <section class="ap-card ap-card--stagger-2">
      <div class="ap-card-hd">
        <h2><i class="fas fa-key ap-icon-hd"></i> Тестовый API-ключ LifePay</h2>
        <span
          v-if="lpTestApikeySaveStatus"
          class="ap-badge"
          :class="lpTestApikeySaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >
          <i :class="lpTestApikeySaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
          {{ lpTestApikeySaveStatus === 'saved' ? 'OK' : 'ERR' }}
        </span>
      </div>
      <input
        v-model="lpTestApikey"
        type="password"
        autocomplete="off"
        class="ap-input"
        placeholder="apikey тестового магазина LifePay"
      />
      <p v-if="lpTestApikeyError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ lpTestApikeyError }}
      </p>
    </section>

    <section class="ap-card ap-card--stagger-3">
      <div class="ap-card-hd">
        <h2><i class="fas fa-phone ap-icon-hd"></i> Тестовый логин LifePay</h2>
        <span
          v-if="lpTestLoginSaveStatus"
          class="ap-badge"
          :class="lpTestLoginSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >
          <i :class="lpTestLoginSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"></i>
          {{ lpTestLoginSaveStatus === 'saved' ? 'OK' : 'ERR' }}
        </span>
      </div>
      <input
        v-model="lpTestLogin"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        class="ap-input"
        placeholder="7XXXXXXXXXX"
      />
      <p v-if="lpTestLoginError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ lpTestLoginError }}
      </p>
    </section>
  </div>
</template>
