<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { maxControlGetRoute } from '../../api/max/control/get'
import { maxControlSaveRoute } from '../../api/max/control/save'
import { maxSecretsGetRoute } from '../../api/max/secrets/get'
import { maxSecretsSaveRoute } from '../../api/max/secrets/save'
import { maxSubscriptionApplyRoute } from '../../api/max/subscription/apply'
import { maxSubscriptionDeleteRoute } from '../../api/max/subscription/delete'
import { maxPollOnceRoute } from '../../api/max/poll/once'
import { maxPollResetMarkerRoute } from '../../api/max/poll/reset-marker'
import { maxChatsListRoute } from '../../api/max/chats/list'
import { maxChatsRefreshRoute } from '../../api/max/chats/refresh'
import { maxBrokerRetryRoute } from '../../api/max/broker/retry'
import { createComponentLogger } from '../../shared/logger'

declare const ctx: app.Ctx

type ReceiveMode = 'webhook' | 'long_polling' | 'disabled'
type DedupPolicy = 'none' | 'fingerprint'

type SecretState = {
  botTokenConfigured: boolean
  webhookSecretConfigured: boolean
  brokerModuleTokenConfigured: boolean
}

type MaxSettings = Record<string, unknown>

type MaxChat = {
  chatId: string
  title: string
  type: string
  status: string
  historyMessageCount: number
  lastHistoryRefreshStatus: string
  lastError: string
}

type MaxRun = {
  runId?: string
  chatId?: string
  status?: string
  processedMessages?: number
  error?: string
}

const log = createComponentLogger('MaxControlPanel')

const loading = ref(false)
const actionLoading = ref('')
const error = ref('')
const saveStatus = ref<'saved' | 'error' | null>(null)
const secrets = ref<SecretState>({
  botTokenConfigured: false,
  webhookSecretConfigured: false,
  brokerModuleTokenConfigured: false
})

const receiveMode = ref<ReceiveMode>('webhook')
const publishEnabled = ref(true)
const moduleKey = ref('p/units/aley/bpm/interfaces/max')
const updateTypesText = ref('')
const pollingLimit = ref(100)
const pollingTimeoutSec = ref(30)
const pollingIntervalSec = ref(5)
const pollingMarker = ref('')
const dedupPolicy = ref<DedupPolicy>('fingerprint')
const chatDiscoveryEnabled = ref(true)
const historyEnabled = ref(true)
const historyBatchSize = ref(50)
const historyDeleteBatchSize = ref(500)
const historyJobBudgetMs = ref(8000)
const historyMaxBatches = ref(3)
const miniappsEnabled = ref(true)
const miniappDefaultPage = ref('root')
const miniappTtlSec = ref(600)

const botAccessToken = ref('')
const webhookSecret = ref('')
const brokerModuleToken = ref('')
const chats = ref<MaxChat[]>([])
const runs = ref<MaxRun[]>([])
const brokerPending = ref(0)
const knownChats = ref(0)
const lastAction = ref('')

const secretLabel = computed(() =>
  [
    secrets.value.botTokenConfigured ? 'BOT' : '',
    secrets.value.webhookSecretConfigured ? 'WH' : '',
    secrets.value.brokerModuleTokenConfigured ? 'BRK' : ''
  ]
    .filter(Boolean)
    .join(' · ')
)

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function applySettings(settings: MaxSettings) {
  receiveMode.value = ['webhook', 'long_polling', 'disabled'].includes(
    asString(settings.max_receive_mode)
  )
    ? (settings.max_receive_mode as ReceiveMode)
    : 'webhook'
  publishEnabled.value = asBool(settings.core_broker_publish_enabled, true)
  moduleKey.value = asString(settings.core_broker_module_key, moduleKey.value)
  updateTypesText.value = asStringArray(settings.max_update_types).join('\n')
  pollingLimit.value = asNumber(settings.max_polling_limit, 100)
  pollingTimeoutSec.value = asNumber(settings.max_polling_timeout_sec, 30)
  pollingIntervalSec.value = asNumber(settings.max_polling_interval_sec, 5)
  pollingMarker.value =
    settings.max_polling_marker === null || settings.max_polling_marker === undefined
      ? ''
      : String(settings.max_polling_marker)
  dedupPolicy.value = settings.max_raw_dedup_policy === 'none' ? 'none' : 'fingerprint'
  chatDiscoveryEnabled.value = asBool(settings.max_chat_discovery_enabled, true)
  historyEnabled.value = asBool(settings.max_history_refresh_enabled, true)
  historyBatchSize.value = asNumber(settings.max_history_batch_size, 50)
  historyDeleteBatchSize.value = asNumber(settings.max_history_delete_batch_size, 500)
  historyJobBudgetMs.value = asNumber(settings.max_history_job_budget_ms, 8000)
  historyMaxBatches.value = asNumber(settings.max_history_max_batches_per_job, 3)
  miniappsEnabled.value = asBool(settings.max_miniapps_enabled, true)
  miniappDefaultPage.value = asString(settings.max_miniapp_default_page, 'root')
  miniappTtlSec.value = asNumber(settings.max_miniapp_init_data_ttl_sec, 600)
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [controlResult, secretResult, chatResult] = await Promise.all([
      maxControlGetRoute.run(ctx),
      maxSecretsGetRoute.run(ctx),
      maxChatsListRoute.query({ limit: '12' }).run(ctx)
    ])
    const control = controlResult as {
      success?: boolean
      settings?: MaxSettings
      status?: { knownChats?: number; brokerPending?: number; latestRuns?: MaxRun[] }
      error?: string
    }
    if (!control.success || !control.settings) throw new Error(control.error || 'MAX status error')
    applySettings(control.settings)
    knownChats.value = control.status?.knownChats ?? 0
    brokerPending.value = control.status?.brokerPending ?? 0
    runs.value = control.status?.latestRuns ?? []

    const secretData = secretResult as SecretState & { success?: boolean; error?: string }
    if (!secretData.success) throw new Error(secretData.error || 'MAX secrets error')
    secrets.value = {
      botTokenConfigured: secretData.botTokenConfigured === true,
      webhookSecretConfigured: secretData.webhookSecretConfigured === true,
      brokerModuleTokenConfigured: secretData.brokerModuleTokenConfigured === true
    }

    const chatData = chatResult as { success?: boolean; chats?: MaxChat[]; runs?: MaxRun[] }
    chats.value = chatData.success && Array.isArray(chatData.chats) ? chatData.chats : []
    if (chatData.success && Array.isArray(chatData.runs)) runs.value = chatData.runs
  } catch (e) {
    error.value = (e as Error)?.message || 'MAX load failed'
    log.error('Не удалось загрузить MAX состояние', error.value)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  actionLoading.value = 'settings'
  error.value = ''
  const updateTypes = updateTypesText.value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  try {
    const result = await maxControlSaveRoute.run(ctx, {
      core_broker_publish_enabled: publishEnabled.value,
      core_broker_module_key: moduleKey.value,
      max_receive_mode: receiveMode.value,
      max_update_types: updateTypes,
      max_polling_limit: pollingLimit.value,
      max_polling_timeout_sec: pollingTimeoutSec.value,
      max_polling_interval_sec: pollingIntervalSec.value,
      max_polling_marker: pollingMarker.value.trim() ? Number(pollingMarker.value) : null,
      max_raw_dedup_policy: dedupPolicy.value,
      max_chat_discovery_enabled: chatDiscoveryEnabled.value,
      max_history_refresh_enabled: historyEnabled.value,
      max_history_batch_size: historyBatchSize.value,
      max_history_delete_batch_size: historyDeleteBatchSize.value,
      max_history_job_budget_ms: historyJobBudgetMs.value,
      max_history_max_batches_per_job: historyMaxBatches.value,
      max_miniapps_enabled: miniappsEnabled.value,
      max_miniapp_default_page: miniappDefaultPage.value,
      max_miniapp_init_data_ttl_sec: miniappTtlSec.value
    })
    const data = result as { success?: boolean; settings?: MaxSettings; error?: string }
    if (!data.success) throw new Error(data.error || 'MAX settings save failed')
    if (data.settings) applySettings(data.settings)
    saveStatus.value = 'saved'
    lastAction.value = 'settings saved'
  } catch (e) {
    saveStatus.value = 'error'
    error.value = (e as Error)?.message || 'MAX settings save failed'
  } finally {
    actionLoading.value = ''
  }
}

async function saveSecrets(clearKey?: 'bot' | 'webhook' | 'broker') {
  actionLoading.value = 'secrets'
  error.value = ''
  try {
    const result = await maxSecretsSaveRoute.run(ctx, {
      botAccessToken: clearKey ? undefined : botAccessToken.value,
      webhookSecret: clearKey ? undefined : webhookSecret.value,
      brokerModuleToken: clearKey ? undefined : brokerModuleToken.value,
      clearBotAccessToken: clearKey === 'bot',
      clearWebhookSecret: clearKey === 'webhook',
      clearBrokerModuleToken: clearKey === 'broker'
    })
    const data = result as SecretState & { success?: boolean; error?: string }
    if (!data.success) throw new Error(data.error || 'MAX secrets save failed')
    secrets.value = {
      botTokenConfigured: data.botTokenConfigured === true,
      webhookSecretConfigured: data.webhookSecretConfigured === true,
      brokerModuleTokenConfigured: data.brokerModuleTokenConfigured === true
    }
    botAccessToken.value = ''
    webhookSecret.value = ''
    brokerModuleToken.value = ''
    lastAction.value = clearKey ? `${clearKey} cleared` : 'secrets saved'
  } catch (e) {
    error.value = (e as Error)?.message || 'MAX secrets save failed'
  } finally {
    actionLoading.value = ''
  }
}

async function runAction(name: string, action: () => Promise<unknown>) {
  actionLoading.value = name
  error.value = ''
  try {
    const result = (await action()) as { success?: boolean; error?: string }
    if (!result.success) throw new Error(result.error || `${name} failed`)
    lastAction.value = name
    await loadAll()
  } catch (e) {
    error.value = (e as Error)?.message || `${name} failed`
  } finally {
    actionLoading.value = ''
  }
}

onMounted(loadAll)
</script>

<template>
  <section class="ap-card ap-card--stagger-4">
    <div class="ap-card-hd">
      <h2><i class="fas fa-satellite-dish ap-icon-hd"></i> MAX Broker</h2>
      <span class="ap-badge" :class="brokerPending ? 'ap-badge--warn' : 'ap-badge--ok'">
        {{ loading ? '...' : `${knownChats} chats · ${brokerPending} pending` }}
      </span>
    </div>

    <div class="ap-cfg-row">
      <div>
        <label class="ap-label">Receive</label>
        <select v-model="receiveMode" class="ap-input">
          <option value="webhook">webhook</option>
          <option value="long_polling">long_polling</option>
          <option value="disabled">disabled</option>
        </select>
      </div>
      <div>
        <label class="ap-label">Module key</label>
        <input v-model="moduleKey" class="ap-input" />
      </div>
    </div>

    <div class="ap-cfg-row">
      <label class="ap-check">
        <input v-model="publishEnabled" type="checkbox" />
        broker publish
      </label>
      <label class="ap-check">
        <input v-model="chatDiscoveryEnabled" type="checkbox" />
        chat discovery
      </label>
      <label class="ap-check">
        <input v-model="historyEnabled" type="checkbox" />
        history refresh
      </label>
      <label class="ap-check">
        <input v-model="miniappsEnabled" type="checkbox" />
        miniapps
      </label>
    </div>

    <div class="ap-cfg-row">
      <div>
        <label class="ap-label">Update types</label>
        <textarea v-model="updateTypesText" class="ap-input ap-textarea" rows="3"></textarea>
      </div>
      <div>
        <label class="ap-label">Dedup</label>
        <select v-model="dedupPolicy" class="ap-input">
          <option value="fingerprint">fingerprint</option>
          <option value="none">none</option>
        </select>
      </div>
    </div>

    <div class="ap-cfg-row">
      <input v-model.number="pollingLimit" class="ap-input" type="number" min="1" max="1000" />
      <input v-model.number="pollingTimeoutSec" class="ap-input" type="number" min="0" max="90" />
      <input v-model.number="pollingIntervalSec" class="ap-input" type="number" min="1" max="300" />
      <input v-model="pollingMarker" class="ap-input" placeholder="marker" />
    </div>

    <div class="ap-cfg-row">
      <input v-model.number="historyBatchSize" class="ap-input" type="number" min="1" max="100" />
      <input
        v-model.number="historyDeleteBatchSize"
        class="ap-input"
        type="number"
        min="1"
        max="1000"
      />
      <input
        v-model.number="historyJobBudgetMs"
        class="ap-input"
        type="number"
        min="1000"
        max="9000"
      />
      <input v-model.number="historyMaxBatches" class="ap-input" type="number" min="1" max="20" />
    </div>

    <div class="ap-cfg-row">
      <input v-model="miniappDefaultPage" class="ap-input" />
      <input v-model.number="miniappTtlSec" class="ap-input" type="number" min="60" max="3600" />
      <button
        class="ap-btn"
        type="button"
        :disabled="actionLoading === 'settings'"
        @click="saveSettings"
      >
        <i class="fas fa-save"></i> save
      </button>
      <span
        v-if="saveStatus"
        class="ap-badge"
        :class="saveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
      >
        {{ saveStatus }}
      </span>
    </div>

    <div class="ap-card-hd ap-card-hd--sub">
      <h3><i class="fas fa-key ap-icon-hd"></i> Secrets</h3>
      <span class="ap-badge" :class="secretLabel ? 'ap-badge--ok' : 'ap-badge--warn'">
        {{ secretLabel || 'empty' }}
      </span>
    </div>

    <div class="ap-cfg-row">
      <input v-model="botAccessToken" class="ap-input" type="password" placeholder="bot token" />
      <input
        v-model="webhookSecret"
        class="ap-input"
        type="password"
        placeholder="webhook secret"
      />
      <input
        v-model="brokerModuleToken"
        class="ap-input"
        type="password"
        placeholder="broker token"
      />
      <button
        class="ap-btn"
        type="button"
        :disabled="actionLoading === 'secrets'"
        @click="saveSecrets()"
      >
        <i class="fas fa-key"></i> set
      </button>
    </div>

    <div class="ap-cfg-row">
      <button class="ap-btn" type="button" @click="saveSecrets('bot')">clear bot</button>
      <button class="ap-btn" type="button" @click="saveSecrets('webhook')">clear webhook</button>
      <button class="ap-btn" type="button" @click="saveSecrets('broker')">clear broker</button>
    </div>

    <div class="ap-cfg-row">
      <button
        class="ap-btn"
        type="button"
        @click="runAction('webhook apply', () => maxSubscriptionApplyRoute.run(ctx))"
      >
        <i class="fas fa-plug"></i> webhook on
      </button>
      <button
        class="ap-btn"
        type="button"
        @click="runAction('webhook delete', () => maxSubscriptionDeleteRoute.run(ctx))"
      >
        <i class="fas fa-unlink"></i> webhook off
      </button>
      <button
        class="ap-btn"
        type="button"
        @click="runAction('poll once', () => maxPollOnceRoute.run(ctx))"
      >
        <i class="fas fa-rotate"></i> poll
      </button>
      <button
        class="ap-btn"
        type="button"
        @click="runAction('marker reset', () => maxPollResetMarkerRoute.run(ctx))"
      >
        marker reset
      </button>
      <button
        class="ap-btn"
        type="button"
        @click="
          runAction('retry broker', () =>
            maxBrokerRetryRoute.run(ctx, { source: 'all', limit: 50 })
          )
        "
      >
        retry broker
      </button>
      <button
        class="ap-btn"
        type="button"
        @click="runAction('refresh history', () => maxChatsRefreshRoute.run(ctx, { scope: 'all' }))"
      >
        refresh
      </button>
    </div>

    <div v-if="chats.length" class="ap-mini-list">
      <div v-for="chat in chats" :key="chat.chatId" class="ap-mini-row">
        <span>{{ chat.title || chat.chatId }}</span>
        <span>{{ chat.type }}</span>
        <span>{{ chat.historyMessageCount }}</span>
        <span>{{ chat.lastHistoryRefreshStatus || chat.status }}</span>
      </div>
    </div>

    <div v-if="runs.length" class="ap-mini-list">
      <div
        v-for="run in runs.slice(0, 5)"
        :key="run.runId || `${run.chatId}-${run.status}`"
        class="ap-mini-row"
      >
        <span>{{ run.chatId || 'all' }}</span>
        <span>{{ run.status || '-' }}</span>
        <span>{{ run.processedMessages ?? 0 }}</span>
      </div>
    </div>

    <p v-if="lastAction" class="ap-ok"><i class="fas fa-check"></i> {{ lastAction }}</p>
    <p v-if="error" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ error }}</p>
  </section>
</template>

<style scoped>
.ap-label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-transform: uppercase;
}

.ap-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-transform: uppercase;
}

.ap-textarea {
  min-height: 78px;
  resize: vertical;
}

.ap-card-hd--sub {
  margin-top: 18px;
}

.ap-mini-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.ap-mini-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 0.8fr 0.5fr 0.8fr;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
}

.ap-mini-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ap-ok {
  margin: 10px 0 0;
  color: #9be2aa;
  font-size: 12px;
}
</style>
