<script setup lang="ts">
// Карточка настроек доступа GetCourse.
// Блок gateway: gateway_base_url, gc_school_host, gc_school_api_key (password/маска).
// Блок gating: require_user, require_group (включает/блокирует require_user), multiple группы.
// Блок rewards: getcourse_issue_rewards (независим).
// Данные берутся только через API-routes; таблицы/репозитории не импортируются.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { getcourseGroupsRoute } from '../../api/getcourse/groups'
import { createComponentLogger } from '../../shared/logger'

const log = createComponentLogger('AdminGetcourseSettings')

declare const ctx: app.Ctx

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 400

// --- Gateway fields ---
const gatewayBaseUrl = ref('')
const gcSchoolHost = ref('')
const gcSchoolApiKey = ref('') // password-input; пустая строка = не задан
const gcSchoolApiKeySet = ref(false) // индикатор: ключ задан на сервере
const showApiKey = ref(false)

// --- Gating ---
const requireUser = ref(false)
const requireGroup = ref(false)
const requiredGroupIds = ref<number[]>([])

// Групповой gating временно отключён в админке: галочка «членство в группе» серая/неактивная,
// блок выбора групп скрыт. Снять флаг (true), когда операции gateway getUserGroups/getAllGroups
// будут подтверждены end-to-end. Сам тумблер на сервере не трогаем — меняется только UI.
const GROUP_GATING_AVAILABLE = false

// --- Rewards ---
const issueRewards = ref(false)

// --- Groups list ---
const groups = ref<{ id: number; name: string }[]>([])
const groupsError = ref('')
const groupsLoading = ref(false)

// --- Save statuses ---
type SaveStatus = 'saved' | 'error' | null

const gatewayUrlStatus = ref<SaveStatus>(null)
const gatewayUrlError = ref('')
const gatewayUrlTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const gatewayUrlDebounce = { id: null as ReturnType<typeof setTimeout> | null }

const gcHostStatus = ref<SaveStatus>(null)
const gcHostError = ref('')
const gcHostTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const gcHostDebounce = { id: null as ReturnType<typeof setTimeout> | null }

const gcApiKeyStatus = ref<SaveStatus>(null)
const gcApiKeyError = ref('')
const gcApiKeyTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const requireUserStatus = ref<SaveStatus>(null)
const requireUserError = ref('')
const requireUserTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const requireGroupStatus = ref<SaveStatus>(null)
const requireGroupError = ref('')
const requireGroupTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const groupIdsStatus = ref<SaveStatus>(null)
const groupIdsError = ref('')
const groupIdsTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const issueRewardsStatus = ref<SaveStatus>(null)
const issueRewardsError = ref('')
const issueRewardsTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function showStatus(
  statusRef: { value: SaveStatus },
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

async function saveSetting(
  key: string,
  value: unknown,
  statusRef: { value: SaveStatus },
  timeoutHolder: { id: ReturnType<typeof setTimeout> | null },
  errorRef: { value: string }
): Promise<boolean> {
  errorRef.value = ''
  try {
    const res = await saveSettingRoute.run(ctx, { key, value })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      errorRef.value = data.error || 'Ошибка сохранения'
      showStatus(statusRef, timeoutHolder, 'error')
      log.error(`Не удалось сохранить ${key}`, errorRef.value)
      return false
    }
    showStatus(statusRef, timeoutHolder, 'saved')
    log.info(`Настройка ${key} сохранена`)
    return true
  } catch (e) {
    errorRef.value = (e as Error)?.message || 'Ошибка сохранения'
    showStatus(statusRef, timeoutHolder, 'error')
    log.error(`Ошибка сохранения ${key}`, e)
    return false
  }
}

async function loadSetting(key: string): Promise<unknown> {
  try {
    const res = await getSettingRoute.query({ key }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success) return data.value
  } catch (e) {
    log.warning(`Не удалось загрузить ${key}`, e)
  }
  return undefined
}

async function loadGroups() {
  groupsLoading.value = true
  groupsError.value = ''
  try {
    const res = await getcourseGroupsRoute.run(ctx)
    const data = res as {
      success?: boolean
      groups?: { id: number; name: string }[]
      error?: string
    }
    if (data?.success && Array.isArray(data.groups)) {
      groups.value = data.groups
      log.info('Группы GetCourse загружены', { count: data.groups.length })
    } else {
      groupsError.value = data?.error || 'Не удалось загрузить группы'
      groups.value = []
      log.warning('Ошибка загрузки групп GetCourse', groupsError.value)
    }
  } catch (e) {
    groupsError.value = (e as Error)?.message || 'Ошибка загрузки групп'
    groups.value = []
    log.error('Ошибка загрузки групп GetCourse', e)
  } finally {
    groupsLoading.value = false
  }
}

// --- Gateway debounced saves ---
watch(gatewayBaseUrl, () => {
  if (gatewayUrlDebounce.id) clearTimeout(gatewayUrlDebounce.id)
  gatewayUrlDebounce.id = setTimeout(() => {
    gatewayUrlDebounce.id = null
    saveSetting(
      'gateway_base_url',
      gatewayBaseUrl.value,
      gatewayUrlStatus,
      gatewayUrlTimeout,
      gatewayUrlError
    )
  }, INPUT_DEBOUNCE_MS)
})

watch(gcSchoolHost, () => {
  if (gcHostDebounce.id) clearTimeout(gcHostDebounce.id)
  gcHostDebounce.id = setTimeout(() => {
    gcHostDebounce.id = null
    saveSetting('gc_school_host', gcSchoolHost.value, gcHostStatus, gcHostTimeout, gcHostError)
  }, INPUT_DEBOUNCE_MS)
})

async function saveApiKey() {
  await saveSetting(
    'gc_school_api_key',
    gcSchoolApiKey.value,
    gcApiKeyStatus,
    gcApiKeyTimeout,
    gcApiKeyError
  )
  if (gcApiKeyStatus.value === 'saved') {
    gcSchoolApiKeySet.value = gcSchoolApiKey.value.trim().length > 0
    gcSchoolApiKey.value = '' // очищаем поле после сохранения — не хранить в памяти
  }
}

// --- Gating saves ---
// require_user — сохраняется немедленно, но только если require_group не включён
async function saveRequireUser() {
  if (requireGroup.value) return // заблокировано
  await saveSetting(
    'getcourse_require_user',
    requireUser.value,
    requireUserStatus,
    requireUserTimeout,
    requireUserError
  )
}

// require_group — специальный порядок: сначала group_ids, потом флаг
async function saveRequireGroup(newValue: boolean) {
  requireGroup.value = newValue
  requireGroupError.value = ''

  if (newValue) {
    // Автоматически включить require_user при включении require_group
    requireUser.value = true

    if (requiredGroupIds.value.length === 0) {
      requireGroupError.value = 'Выберите хотя бы одну группу перед включением этой опции'
      requireGroup.value = false
      showStatus(requireGroupStatus, requireGroupTimeout, 'error')
      return
    }

    // Сначала сохранить group_ids, затем включить флаг
    const idsOk = await saveSetting(
      'getcourse_required_group_ids',
      requiredGroupIds.value,
      groupIdsStatus,
      groupIdsTimeout,
      groupIdsError
    )
    if (!idsOk) {
      requireGroup.value = false
      return
    }
    await saveSetting(
      'getcourse_require_group',
      true,
      requireGroupStatus,
      requireGroupTimeout,
      requireGroupError
    )
  } else {
    await saveSetting(
      'getcourse_require_group',
      false,
      requireGroupStatus,
      requireGroupTimeout,
      requireGroupError
    )
  }
}

async function saveGroupIds() {
  groupIdsError.value = ''
  await saveSetting(
    'getcourse_required_group_ids',
    requiredGroupIds.value,
    groupIdsStatus,
    groupIdsTimeout,
    groupIdsError
  )
}

function toggleGroupId(id: number) {
  const idx = requiredGroupIds.value.indexOf(id)
  if (idx === -1) {
    requiredGroupIds.value = [...requiredGroupIds.value, id]
  } else {
    requiredGroupIds.value = requiredGroupIds.value.filter((gid) => gid !== id)
  }
  saveGroupIds()
}

async function saveIssueRewards() {
  await saveSetting(
    'getcourse_issue_rewards',
    issueRewards.value,
    issueRewardsStatus,
    issueRewardsTimeout,
    issueRewardsError
  )
}

onMounted(async () => {
  log.info('Компонент смонтирован')

  // Загружаем все нужные настройки и список групп параллельно
  const [
    gwUrl,
    gcHost,
    gcApiKeySetVal,
    requireUserVal,
    requireGroupVal,
    groupIdsVal,
    issueRewardsVal
  ] = await Promise.all([
    loadSetting('gateway_base_url'),
    loadSetting('gc_school_host'),
    loadSetting('gc_school_api_key_set'),
    loadSetting('getcourse_require_user'),
    loadSetting('getcourse_require_group'),
    loadSetting('getcourse_required_group_ids'),
    loadSetting('getcourse_issue_rewards'),
    loadGroups()
  ])

  if (typeof gwUrl === 'string') gatewayBaseUrl.value = gwUrl
  if (typeof gcHost === 'string') gcSchoolHost.value = gcHost
  // gc_school_api_key не передаётся клиенту; только признак gc_school_api_key_set
  gcSchoolApiKeySet.value = gcApiKeySetVal === true
  if (typeof requireUserVal === 'boolean') requireUser.value = requireUserVal
  if (typeof requireGroupVal === 'boolean') requireGroup.value = requireGroupVal
  if (Array.isArray(groupIdsVal)) {
    requiredGroupIds.value = (groupIdsVal as unknown[])
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)
  }
  if (typeof issueRewardsVal === 'boolean') issueRewards.value = issueRewardsVal
})

onBeforeUnmount(() => {
  if (gatewayUrlDebounce.id) clearTimeout(gatewayUrlDebounce.id)
  if (gcHostDebounce.id) clearTimeout(gcHostDebounce.id)
  if (gatewayUrlTimeout.id) clearTimeout(gatewayUrlTimeout.id)
  if (gcHostTimeout.id) clearTimeout(gcHostTimeout.id)
  if (gcApiKeyTimeout.id) clearTimeout(gcApiKeyTimeout.id)
  if (requireUserTimeout.id) clearTimeout(requireUserTimeout.id)
  if (requireGroupTimeout.id) clearTimeout(requireGroupTimeout.id)
  if (groupIdsTimeout.id) clearTimeout(groupIdsTimeout.id)
  if (issueRewardsTimeout.id) clearTimeout(issueRewardsTimeout.id)
})
</script>

<template>
  <section class="ap-card ap-card--stagger-6">
    <div class="ap-card-hd">
      <h2><i class="fas fa-link ap-icon-hd"></i> Настройки GetCourse</h2>
    </div>

    <!-- Блок: Подключение к gateway -->
    <h3 class="ap-section-title">Подключение к gateway</h3>

    <div class="ap-field-row">
      <label class="ap-label" for="gc-gateway-url">Gateway Base URL</label>
      <span
        v-if="gatewayUrlStatus"
        class="ap-badge ap-badge--inline"
        :class="gatewayUrlStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >{{ gatewayUrlStatus === 'saved' ? 'OK' : 'ERR' }}</span
      >
    </div>
    <input
      id="gc-gateway-url"
      v-model="gatewayBaseUrl"
      type="text"
      class="ap-input"
      placeholder="https://..."
    />
    <p v-if="gatewayUrlError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ gatewayUrlError }}
    </p>

    <div class="ap-field-row">
      <label class="ap-label" for="gc-school-host">Хост школы GetCourse</label>
      <span
        v-if="gcHostStatus"
        class="ap-badge ap-badge--inline"
        :class="gcHostStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >{{ gcHostStatus === 'saved' ? 'OK' : 'ERR' }}</span
      >
    </div>
    <input
      id="gc-school-host"
      v-model="gcSchoolHost"
      type="text"
      class="ap-input"
      placeholder="school.getcourse.ru"
    />
    <p v-if="gcHostError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ gcHostError }}
    </p>

    <div class="ap-field-row">
      <label class="ap-label" for="gc-api-key">
        API-ключ школы
        <span v-if="gcSchoolApiKeySet" class="ap-badge ap-badge--ok ap-badge--inline">
          <i class="fas fa-check"></i> задан
        </span>
        <span v-else class="ap-badge ap-badge--err ap-badge--inline">не задан</span>
      </label>
      <span
        v-if="gcApiKeyStatus"
        class="ap-badge ap-badge--inline"
        :class="gcApiKeyStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
        >{{ gcApiKeyStatus === 'saved' ? 'OK' : 'ERR' }}</span
      >
    </div>
    <div class="ap-input-group">
      <input
        id="gc-api-key"
        v-model="gcSchoolApiKey"
        :type="showApiKey ? 'text' : 'password'"
        class="ap-input ap-input--flex"
        placeholder="Введите новый ключ для замены"
        autocomplete="new-password"
      />
      <button
        type="button"
        class="ap-btn ap-btn--icon"
        @click="showApiKey = !showApiKey"
        :title="showApiKey ? 'Скрыть' : 'Показать'"
      >
        <i :class="showApiKey ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
      </button>
      <button
        type="button"
        class="ap-btn ap-btn--sm"
        @click="saveApiKey"
        :disabled="!gcSchoolApiKey"
      >
        <i class="fas fa-save"></i> Сохранить
      </button>
    </div>
    <p v-if="gcApiKeyError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ gcApiKeyError }}
    </p>

    <!-- Блок: Gating -->
    <h3 class="ap-section-title">Проверка доступа</h3>

    <!-- require_user -->
    <div class="ap-field-row ap-field-row--checkbox">
      <label class="ap-label">
        <input
          type="checkbox"
          v-model="requireUser"
          class="ap-checkbox"
          :disabled="requireGroup"
          @change="saveRequireUser"
        />
        Обязательное наличие пользователя в GetCourse
        <span
          v-if="requireUserStatus"
          class="ap-badge ap-badge--inline"
          :class="requireUserStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
          >{{ requireUserStatus === 'saved' ? 'OK' : 'ERR' }}</span
        >
      </label>
    </div>
    <p v-if="requireUserError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ requireUserError }}
    </p>

    <!-- require_group (групповой gating временно недоступен — серая/неактивная галочка) -->
    <div
      class="ap-field-row ap-field-row--checkbox"
      :class="{ 'ap-row--disabled': !GROUP_GATING_AVAILABLE }"
    >
      <label class="ap-label">
        <input
          type="checkbox"
          :checked="GROUP_GATING_AVAILABLE && requireGroup"
          class="ap-checkbox"
          :disabled="!GROUP_GATING_AVAILABLE"
          @change="saveRequireGroup(($event.target as HTMLInputElement).checked)"
        />
        Обязательное членство в группе GetCourse
        <span v-if="!GROUP_GATING_AVAILABLE" class="ap-muted">(временно недоступно)</span>
        <span
          v-if="GROUP_GATING_AVAILABLE && requireGroupStatus"
          class="ap-badge ap-badge--inline"
          :class="requireGroupStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
          >{{ requireGroupStatus === 'saved' ? 'OK' : 'ERR' }}</span
        >
      </label>
    </div>
    <p v-if="requireGroupError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ requireGroupError }}
    </p>

    <!-- Выбор групп (виден если requireGroup или если группы загружены для выбора) -->
    <div
      v-if="GROUP_GATING_AVAILABLE && (requireGroup || requiredGroupIds.length > 0 || groupsError)"
      class="ap-groups-block"
    >
      <div class="ap-field-row">
        <label class="ap-label">
          Обязательные группы
          <span
            v-if="groupIdsStatus"
            class="ap-badge ap-badge--inline"
            :class="groupIdsStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
            >{{ groupIdsStatus === 'saved' ? 'OK' : 'ERR' }}</span
          >
        </label>
      </div>

      <div v-if="groupsLoading" class="ap-loading">
        <i class="fas fa-circle-notch fa-spin"></i> Загрузка групп…
      </div>

      <div v-else-if="groupsError" class="ap-err">
        <i class="fas fa-exclamation-triangle"></i> {{ groupsError }} <br /><span class="ap-muted"
          >Выбор групп недоступен</span
        >
      </div>

      <div v-else-if="groups.length === 0" class="ap-muted">Группы не найдены в gateway</div>

      <div v-else class="ap-groups-list">
        <label v-for="group in groups" :key="group.id" class="ap-group-item">
          <input
            type="checkbox"
            class="ap-checkbox"
            :checked="requiredGroupIds.includes(group.id)"
            :disabled="!!groupsError"
            @change="toggleGroupId(group.id)"
          />
          {{ group.name }}
          <span class="ap-muted">(id: {{ group.id }})</span>
        </label>
      </div>
      <p v-if="groupIdsError" class="ap-err">
        <i class="fas fa-exclamation-circle"></i> {{ groupIdsError }}
      </p>
    </div>

    <!-- Блок: Выдача наград -->
    <h3 class="ap-section-title">Выдача наград</h3>

    <div class="ap-field-row ap-field-row--checkbox">
      <label class="ap-label">
        <input
          type="checkbox"
          v-model="issueRewards"
          class="ap-checkbox"
          @change="saveIssueRewards"
        />
        Выдавать награды в GetCourse (создавать заказ по prizeOfferID)
        <span
          v-if="issueRewardsStatus"
          class="ap-badge ap-badge--inline"
          :class="issueRewardsStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
          >{{ issueRewardsStatus === 'saved' ? 'OK' : 'ERR' }}</span
        >
      </label>
    </div>
    <p v-if="issueRewardsError" class="ap-err">
      <i class="fas fa-exclamation-circle"></i> {{ issueRewardsError }}
    </p>
  </section>
</template>
