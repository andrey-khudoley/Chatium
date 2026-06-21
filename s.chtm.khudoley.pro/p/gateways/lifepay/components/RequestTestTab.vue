<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { createComponentLogger } from '../shared/logger'
import { getSettingRoute } from '../api/settings/get'
import { LP_TEST_APIKEY, LP_TEST_LOGIN } from '../shared/gatewaySettingKeys'
import type { LpTestValues } from '../shared/gatewaySettingKeys'
import type {
  OperationSummary,
  ArgsFieldSchema,
  ArgsTreeNode
} from '../shared/operationsCatalogShared'
import RtFormatHint from './RtFormatHint.vue'
import RtSnapshots from './RtSnapshots.vue'
import RtBodyForm from './RtBodyForm.vue'
import {
  buildLegendRows,
  buildExampleRequest,
  buildFieldErrors,
  buildArgsObject,
  buildUrlAndBody,
  runGatewayRequest
} from '../shared/requestTestForm'
import type { RequestSnapshot, ResponseSnapshot } from '../shared/requestTestForm'

declare const ctx: app.Ctx

const log = createComponentLogger('RequestTestTab')

const props = defineProps<{
  operationsCatalog?: OperationSummary[]
  projectRoot: string
  // Тестовые значения из Heap, переданные через SSR-пропсы (вкладка панели).
  // Если не заданы (контекст TestsPage, Admin) — кнопка «Использовать тестовые» делает
  // fallback на getSettingRoute (требует роль Admin).
  testValues?: LpTestValues
}>()

// Клиентский таймаут fetch — страховка от зависания формы. Должен быть БОЛЬШЕ серверного
// таймаута исходящего вызова LifePay (GW_OUTBOUND_TIMEOUT_MS = 10 с): иначе клиент прервёт запрос
// раньше, чем gateway успеет вернуть осмысленную ошибку таймаута upstream. 10 с + запас.
const FETCH_TIMEOUT_MS = 15000

const catalog = computed<OperationSummary[]>(() => props.operationsCatalog ?? [])

const selectedOp = ref<string>(
  catalog.value.find((e) => e.availability === 'enabled')?.op ?? catalog.value[0]?.op ?? ''
)
const xLpApikey = ref<string>('')
const xLpLogin = ref<string>('')
const showApiKey = ref(false)
const argsValues = ref<Record<string, string>>({})
const revealedArgs = ref<Record<string, boolean>>({})
const useTestPending = ref(false)
const useTestError = ref<string>('')
const requestPending = ref(false)
const requestError = ref<string>('')
const requestSnapshot = ref<RequestSnapshot | null>(null)
const responseSnapshot = ref<ResponseSnapshot | null>(null)
const responseOk = ref<boolean | null>(null)

const selectedOpEntry = computed<OperationSummary | null>(
  () => catalog.value.find((e) => e.op === selectedOp.value) ?? null
)

const isSelectedOpEnabled = computed(() => selectedOpEntry.value?.availability === 'enabled')

// Дропдаун операций: сначала доступные (enabled), затем — недоступные (отдельной группой-разделителем).
const enabledOps = computed<OperationSummary[]>(() =>
  catalog.value.filter((e) => e.availability === 'enabled')
)
const otherOps = computed<OperationSummary[]>(() =>
  catalog.value.filter((e) => e.availability !== 'enabled')
)

const argsFields = computed<ArgsFieldSchema[]>(() => selectedOpEntry.value?.argsSchema.fields ?? [])

const bodyLabel = computed(() =>
  selectedOpEntry.value?.httpMethod === 'GET' ? 'Параметры запроса (query)' : 'Тело запроса (JSON)'
)

// Полное дерево формата запроса (со всеми вложенными ключами), выведенное на сервере.
const argsTree = computed<ArgsTreeNode | null>(() => selectedOpEntry.value?.argsTree ?? null)

const legendRows = computed(() => buildLegendRows(argsTree.value))
const exampleRequest = computed(() =>
  buildExampleRequest(selectedOpEntry.value?.httpMethod ?? '', argsTree.value)
)

// Доступность кнопок «Подставить» для заголовков — только при наличии тестового значения в пропсах.
const canFillApikey = computed(() => !!props.testValues && props.testValues.testApiKey !== '')
const canFillLogin = computed(() => !!props.testValues && props.testValues.testLogin !== '')

const fieldErrors = computed<Record<string, string>>(() =>
  buildFieldErrors(argsFields.value, argsValues.value, xLpApikey.value, xLpLogin.value)
)

const hasErrors = computed(() => Object.values(fieldErrors.value).some((e) => e !== ''))

const canSubmit = computed(
  () => isSelectedOpEnabled.value && !hasErrors.value && !requestPending.value
)

watch(selectedOp, () => {
  argsValues.value = {}
  revealedArgs.value = {}
  showApiKey.value = false
  requestSnapshot.value = null
  responseSnapshot.value = null
  responseOk.value = null
  requestError.value = ''
})

function fillApikey() {
  if (props.testValues?.testApiKey) xLpApikey.value = props.testValues.testApiKey
}

function fillLogin() {
  if (props.testValues?.testLogin) xLpLogin.value = props.testValues.testLogin
}

async function useTestCredentials() {
  if (useTestPending.value) return
  useTestError.value = ''
  // Если проп testValues передан (вкладка панели) — подставляем синхронно из него,
  // без сетевого запроса к Admin-only роуту. Пустые строки = настройки не заданы в проекте.
  if (props.testValues) {
    if (props.testValues.testApiKey !== '') xLpApikey.value = props.testValues.testApiKey
    if (props.testValues.testLogin !== '') xLpLogin.value = props.testValues.testLogin
    const missing: string[] = []
    if (props.testValues.testApiKey === '') missing.push('lp_test_apikey')
    if (props.testValues.testLogin === '') missing.push('lp_test_login')
    if (missing.length > 0) {
      useTestError.value = `Не заданы в настройках проекта: ${missing.join(', ')}.`
    }
    log.info('useTestCredentials from props', {
      apikeyLength: xLpApikey.value.length,
      loginLength: xLpLogin.value.length
    })
    return
  }
  // Fallback: контекст TestsPage (Admin, проп не передан) — читаем настройки через getSettingRoute.
  useTestPending.value = true
  try {
    const [apikeyRes, loginRes] = await Promise.all([
      getSettingRoute.query({ key: LP_TEST_APIKEY }).run(ctx),
      getSettingRoute.query({ key: LP_TEST_LOGIN }).run(ctx)
    ])
    const a = apikeyRes as { success?: boolean; value?: unknown; error?: string }
    const l = loginRes as { success?: boolean; value?: unknown; error?: string }
    if (a?.success && typeof a.value === 'string') {
      xLpApikey.value = a.value
    } else {
      useTestError.value = `Не удалось получить lp_test_apikey${a?.error ? `: ${a.error}` : ''}`
    }
    if (l?.success && typeof l.value === 'string') {
      xLpLogin.value = l.value
    } else if (!useTestError.value) {
      useTestError.value = `Не удалось получить lp_test_login${l?.error ? `: ${l.error}` : ''}`
    }
    log.info('useTestCredentials done', {
      apikeyLength: xLpApikey.value.length,
      loginLength: xLpLogin.value.length
    })
  } catch (e) {
    useTestError.value = `Ошибка загрузки настроек: ${String(e)}`
    log.error('useTestCredentials_failed', { error: String(e) })
  } finally {
    useTestPending.value = false
  }
}

function clearForm() {
  xLpApikey.value = ''
  xLpLogin.value = ''
  showApiKey.value = false
  argsValues.value = {}
  requestSnapshot.value = null
  responseSnapshot.value = null
  responseOk.value = null
  requestError.value = ''
  useTestError.value = ''
  log.info('clearForm')
}

async function sendRequest() {
  if (!canSubmit.value || !selectedOpEntry.value) return

  requestPending.value = true
  requestError.value = ''
  requestSnapshot.value = null
  responseSnapshot.value = null
  responseOk.value = null

  const entry = selectedOpEntry.value
  const argsObj = buildArgsObject(argsFields.value, argsValues.value)
  const { url, body, query } = buildUrlAndBody(
    entry.httpMethod,
    entry.op,
    argsObj,
    props.projectRoot
  )
  const headers: Record<string, string> = {
    'X-Lp-Apikey': xLpApikey.value.trim(),
    'X-Lp-Login': xLpLogin.value.trim()
  }
  if (body !== null) headers['Content-Type'] = 'application/json'

  requestSnapshot.value = { method: entry.httpMethod, url, headers, body, query }
  log.info('RequestTestTab.sendRequest', { op: entry.op, method: entry.httpMethod, url })

  const result = await runGatewayRequest(url, entry.httpMethod, headers, body, FETCH_TIMEOUT_MS)
  if (result.ok) {
    responseSnapshot.value = result.snapshot
    responseOk.value = result.responseOk
  } else {
    requestError.value = result.error
    log.error('RequestTestTab.fetch_failed', { error: result.error })
  }
  requestPending.value = false
}

function onSelectOpChange(event: Event) {
  selectedOp.value = (event.target as HTMLSelectElement).value
}
</script>

<template>
  <div class="rt">
    <div class="rt-row">
      <label class="rt-lbl" for="rt-op">Операция</label>
      <select id="rt-op" class="rt-input" :value="selectedOp" @change="onSelectOpChange">
        <optgroup v-if="enabledOps.length" label="Доступные">
          <option v-for="entry in enabledOps" :key="entry.op" :value="entry.op">
            {{ entry.httpMethod }} /v1/{{ entry.op }} — {{ entry.availability }}
          </option>
        </optgroup>
        <optgroup v-if="otherOps.length" label="Недоступные">
          <option v-for="entry in otherOps" :key="entry.op" :value="entry.op">
            {{ entry.httpMethod }} /v1/{{ entry.op }} — {{ entry.availability }}
          </option>
        </optgroup>
      </select>
    </div>

    <div v-if="selectedOpEntry && !isSelectedOpEnabled" class="rt-warn">
      <i class="fas fa-exclamation-triangle"></i>
      Метод недоступен (availability = {{ selectedOpEntry.availability }}). Отправка заблокирована.
    </div>

    <template v-if="selectedOpEntry">
      <RtFormatHint
        :http-method="selectedOpEntry.httpMethod"
        :op="selectedOpEntry.op"
        :example-request="exampleRequest"
        :legend-rows="legendRows"
      />

      <div class="rt-section">
        <div class="rt-section-hd-row">
          <div class="rt-section-hd">Заголовки</div>
          <button
            type="button"
            class="rt-btn-secondary"
            :disabled="useTestPending"
            @click="useTestCredentials"
            title="Подставить значения lp_test_apikey и lp_test_login из настроек"
          >
            <i v-if="useTestPending" class="fas fa-circle-notch fa-spin"></i>
            <i v-else class="fas fa-flask"></i>
            {{ useTestPending ? 'Загрузка...' : 'Использовать тестовые' }}
          </button>
        </div>
        <p v-if="useTestError" class="rt-err">{{ useTestError }}</p>
        <div class="rt-row">
          <label class="rt-lbl" for="rt-apikey">X-Lp-Apikey<span class="rt-req">*</span></label>
          <div class="rt-input-row">
            <input
              id="rt-apikey"
              class="rt-input rt-input-grow"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="off"
              v-model="xLpApikey"
              placeholder="API-ключ магазина LifePay"
            />
            <button
              type="button"
              class="rt-btn-secondary"
              @click="showApiKey = !showApiKey"
              :title="showApiKey ? 'Скрыть' : 'Показать'"
            >
              <i class="fas" :class="showApiKey ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
            <button
              v-if="canFillApikey"
              type="button"
              class="rt-btn-secondary"
              @click="fillApikey"
              title="Подставить lp_test_apikey"
            >
              <i class="fas fa-flask"></i> Подставить
            </button>
          </div>
          <p v-if="fieldErrors['X-Lp-Apikey']" class="rt-err">{{ fieldErrors['X-Lp-Apikey'] }}</p>
        </div>
        <div class="rt-row">
          <label class="rt-lbl" for="rt-login">X-Lp-Login<span class="rt-req">*</span></label>
          <div class="rt-input-row">
            <input
              id="rt-login"
              class="rt-input rt-input-grow"
              type="text"
              inputmode="numeric"
              v-model="xLpLogin"
              placeholder="7XXXXXXXXXX"
            />
            <button
              v-if="canFillLogin"
              type="button"
              class="rt-btn-secondary"
              @click="fillLogin"
              title="Подставить lp_test_login"
            >
              <i class="fas fa-flask"></i> Подставить
            </button>
          </div>
          <p v-if="fieldErrors['X-Lp-Login']" class="rt-err">{{ fieldErrors['X-Lp-Login'] }}</p>
        </div>
      </div>

      <RtBodyForm
        :args-fields="argsFields"
        :args-values="argsValues"
        :revealed-args="revealedArgs"
        :field-errors="fieldErrors"
        :body-label="bodyLabel"
      />

      <div class="rt-actions">
        <button type="button" class="rt-btn-primary" :disabled="!canSubmit" @click="sendRequest">
          <i v-if="requestPending" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-paper-plane"></i>
          {{ requestPending ? 'Отправка...' : 'Отправить' }}
        </button>
        <button
          type="button"
          class="rt-btn-secondary"
          :disabled="requestPending"
          @click="clearForm"
          title="Очистить форму"
        >
          <i class="fas fa-eraser"></i> Очистить
        </button>
        <span
          v-if="responseOk !== null"
          class="rt-status"
          :class="responseOk ? 'rt-status--ok' : 'rt-status--fail'"
        >
          {{ responseOk ? 'УСПЕХ' : 'ПРОВАЛ' }}
        </span>
      </div>

      <p v-if="requestError" class="rt-err">{{ requestError }}</p>

      <RtSnapshots
        :request-snapshot="requestSnapshot"
        :response-snapshot="responseSnapshot"
        upstream-label="Ответ вышестоящего сервиса (LifePay)"
      />
    </template>
  </div>
</template>
