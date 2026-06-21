<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { createComponentLogger } from '../shared/logger'
import { GW_HEADER_SCHOOL_HOST, GW_HEADER_SCHOOL_API_KEY } from '../shared/gatewayHttpHeaders'
import type { GcTestValues } from '../shared/gatewaySettingKeys'
import type { OperationSummary, ArgsTreeNode } from '../shared/operationsCatalogShared'
import RtFormatHint from './RtFormatHint.vue'
import RtSnapshots from './RtSnapshots.vue'
import RtBodyForm from './RtBodyForm.vue'
import {
  buildLegendRows,
  buildExampleRequest,
  buildFormRows,
  buildFieldErrors,
  buildArgsObject,
  buildUrlAndBody,
  runGatewayRequest
} from '../shared/requestTestForm'
import type { RequestSnapshot, ResponseSnapshot } from '../shared/requestTestForm'

const log = createComponentLogger('RequestTestTab')

const props = defineProps<{
  operationsCatalog?: OperationSummary[]
  projectRoot: string
  // Тестовые значения из Heap (SSR-проп). Пустые строки = настройка не задана.
  testValues?: GcTestValues
}>()

// Клиентский таймаут fetch — страховка от зависания формы. Должен быть БОЛЬШЕ серверного
// таймаута исходящего вызова GC (GW_OUTBOUND_TIMEOUT_MS = 10 с): иначе клиент прервёт запрос
// раньше, чем gateway успеет вернуть осмысленную ошибку INVOKE_GC_TIMEOUT. 10 с + запас.
const FETCH_TIMEOUT_MS = 15000

const catalog = computed<OperationSummary[]>(() => props.operationsCatalog ?? [])

const selectedOp = ref<string>(
  catalog.value.find((e) => e.availability === 'enabled')?.op ?? catalog.value[0]?.op ?? ''
)
const xGcSchoolHost = ref<string>('')
const xGcSchoolApiKey = ref<string>('')
const showApiKey = ref(false)
// Значения полей формы. Ключ — точечный путь поля в дереве аргументов (например, params.user.email).
const argsValues = ref<Record<string, string>>({})
const revealedArgs = ref<Record<string, boolean>>({})
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

const bodyLabel = computed(() =>
  selectedOpEntry.value?.httpMethod === 'GET' ? 'Параметры запроса (query)' : 'Тело запроса (JSON)'
)

// Полное дерево формата запроса (со всеми вложенными ключами), выведенное на сервере.
const argsTree = computed<ArgsTreeNode | null>(() => selectedOpEntry.value?.argsTree ?? null)

const legendRows = computed(() => buildLegendRows(argsTree.value))
const exampleRequest = computed(() =>
  buildExampleRequest(selectedOpEntry.value?.httpMethod ?? '', argsTree.value)
)
// Дерево аргументов, развёрнутое в плоский список строк формы (группы + поля-листья).
const formRows = computed(() => buildFormRows(argsTree.value))

// Доступность кнопок «Подставить» для заголовков — только при наличии тестового значения в пропсах.
const canFillHost = computed(() => !!props.testValues && props.testValues.testSchoolHost !== '')
const canFillApiKey = computed(() => !!props.testValues && props.testValues.testSchoolApiKey !== '')

const fieldErrors = computed<Record<string, string>>(() =>
  buildFieldErrors(formRows.value, argsValues.value, [
    { name: GW_HEADER_SCHOOL_HOST, value: xGcSchoolHost.value },
    { name: GW_HEADER_SCHOOL_API_KEY, value: xGcSchoolApiKey.value }
  ])
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

function fillHost() {
  if (props.testValues?.testSchoolHost) xGcSchoolHost.value = props.testValues.testSchoolHost
}

function fillApiKey() {
  if (props.testValues?.testSchoolApiKey) xGcSchoolApiKey.value = props.testValues.testSchoolApiKey
}

function fillAllTest() {
  fillHost()
  fillApiKey()
  log.info('fillAllTest from props', {
    hostLength: xGcSchoolHost.value.length,
    apiKeyLength: xGcSchoolApiKey.value.length
  })
}

function clearForm() {
  xGcSchoolHost.value = ''
  xGcSchoolApiKey.value = ''
  showApiKey.value = false
  argsValues.value = {}
  revealedArgs.value = {}
  requestSnapshot.value = null
  responseSnapshot.value = null
  responseOk.value = null
  requestError.value = ''
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
  const argsObj = buildArgsObject(formRows.value, argsValues.value)
  const { url, body, query } = buildUrlAndBody(
    entry.httpMethod,
    entry.op,
    argsObj,
    props.projectRoot
  )
  const headers: Record<string, string> = {
    [GW_HEADER_SCHOOL_HOST]: xGcSchoolHost.value.trim(),
    [GW_HEADER_SCHOOL_API_KEY]: xGcSchoolApiKey.value.trim()
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
            {{ entry.httpMethod }} /v1/{{ entry.op }} [{{ entry.contour }}] —
            {{ entry.availability }}
          </option>
        </optgroup>
        <optgroup v-if="otherOps.length" label="Недоступные">
          <option v-for="entry in otherOps" :key="entry.op" :value="entry.op">
            {{ entry.httpMethod }} /v1/{{ entry.op }} [{{ entry.contour }}] —
            {{ entry.availability }}
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
            v-if="canFillHost || canFillApiKey"
            type="button"
            class="rt-btn-secondary"
            @click="fillAllTest"
            title="Подставить значения тестовой школы из настроек"
          >
            <i class="fas fa-flask"></i> Использовать тестовые
          </button>
        </div>
        <div class="rt-row">
          <label class="rt-lbl" for="rt-host"
            >{{ GW_HEADER_SCHOOL_HOST }}<span class="rt-req">*</span></label
          >
          <div class="rt-input-row">
            <input
              id="rt-host"
              class="rt-input rt-input-grow"
              type="text"
              v-model="xGcSchoolHost"
              placeholder="например, school.getcourse.ru"
            />
            <button
              v-if="canFillHost"
              type="button"
              class="rt-btn-secondary"
              @click="fillHost"
              title="Подставить gc_test_school_host"
            >
              <i class="fas fa-flask"></i> Подставить
            </button>
          </div>
          <p v-if="fieldErrors[GW_HEADER_SCHOOL_HOST]" class="rt-err">
            {{ fieldErrors[GW_HEADER_SCHOOL_HOST] }}
          </p>
        </div>
        <div class="rt-row">
          <label class="rt-lbl" for="rt-apikey"
            >{{ GW_HEADER_SCHOOL_API_KEY }}<span class="rt-req">*</span></label
          >
          <div class="rt-input-row">
            <input
              id="rt-apikey"
              class="rt-input rt-input-grow"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="off"
              v-model="xGcSchoolApiKey"
              placeholder="API-ключ школы GetCourse"
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
              v-if="canFillApiKey"
              type="button"
              class="rt-btn-secondary"
              @click="fillApiKey"
              title="Подставить gc_test_school_api_key"
            >
              <i class="fas fa-flask"></i> Подставить
            </button>
          </div>
          <p v-if="fieldErrors[GW_HEADER_SCHOOL_API_KEY]" class="rt-err">
            {{ fieldErrors[GW_HEADER_SCHOOL_API_KEY] }}
          </p>
        </div>
      </div>

      <RtBodyForm
        :form-rows="formRows"
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
        upstream-label="Ответ вышестоящего сервиса (GetCourse)"
      />
    </template>
  </div>
</template>
