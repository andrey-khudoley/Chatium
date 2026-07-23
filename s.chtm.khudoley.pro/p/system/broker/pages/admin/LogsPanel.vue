<script setup lang="ts">
declare const ctx: any

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { brokerAdminLogsRoute } from '../../api/broker/admin/logs'
import { brokerAdminLogPayloadRoute } from '../../api/broker/admin/log-payload'

// Живой монитор логов (§5.11, волна 2.5, фикс-цикл разбиения AdminPage.vue) —
// вынесен из AdminPage.vue как самостоятельная секция; WS-логика (подписка на
// сокет-канал) целиком здесь. Локальные интерфейсы — намеренно НЕ импортируются
// из lib/ (жёсткий инвариант: в .vue нельзя импортировать tables/repos/lib).

interface LogRow {
  ts: string
  level: string
  msg: string
  kv: string
}

/** Унифицированная строка живого монитора — история (readLogs) и сокет (new-log) имеют разную форму на входе. */
interface DisplayLogEntry {
  key: string
  fromSocket: boolean
  level: string
  message: string
  timeLabel: string
  // История — точные ts/msg/kv для раскрытия payload отдельным запросом (log-payload.ts).
  historyTs?: string
  historyMsg?: string
  historyKv?: string
  // Сокет — payload уже встроен в событие при log_level=Debug (§5.10.5), иначе отсутствует.
  socketHasPayload: boolean
  socketPayload?: unknown
  expanded: boolean
  payloadLoading: boolean
  payloadLoaded: boolean
  payloadError: string
  payloadJsonStr: string | null
}

type RouteError = { success: false; error?: string }
type LogsRouteResult = { success: true; rows: LogRow[]; total: number } | RouteError
type LogPayloadRouteResult = { success: true; found: boolean; jsonStr: string | null } | RouteError

const props = defineProps<{
  encodedLogsSocketId: string
}>()

const MAX_LOG_ENTRIES = 500

const logEntries = ref<DisplayLogEntry[]>([])
const logsLoading = ref(false)
const logsError = ref('')

// Гонка отписки WS (фикс-цикл волны 2.5, code-reviewer 🟢): к моменту, когда
// await getOrCreateBrowserSocketClient() резолвится, компонент уже мог быть
// размонтирован — флаг проверяется сразу после await, подписка в этом случае
// не создаётся вовсе (отписываться не от чего).
let unmounted = false
// any — платформенный тип DataSocketSubscription не даёт удобного локального
// алиаса; тот же паттерн, что в образце (aom/lava_gc_integration/AdminPage.vue).
let socketSubscription: any = null

function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function historyRowToEntry(row: LogRow): DisplayLogEntry {
  return {
    key: `h-${row.ts}-${row.msg}-${row.kv}-${Math.random().toString(36).slice(2, 8)}`,
    fromSocket: false,
    level: row.level,
    message: row.msg,
    timeLabel: row.ts,
    historyTs: row.ts,
    historyMsg: row.msg,
    historyKv: row.kv,
    socketHasPayload: false,
    expanded: false,
    payloadLoading: false,
    payloadLoaded: false,
    payloadError: '',
    payloadJsonStr: null
  }
}

async function loadLogHistory() {
  logsLoading.value = true
  logsError.value = ''
  try {
    const res = (await brokerAdminLogsRoute.run(ctx, { limit: 50 })) as LogsRouteResult
    if (res?.success) {
      logEntries.value = res.rows.map(historyRowToEntry)
    } else {
      logsError.value = res?.error || 'Ошибка загрузки истории логов'
    }
  } catch (e) {
    logsError.value = (e as Error)?.message || 'Ошибка сети'
  } finally {
    logsLoading.value = false
  }
}

function onSocketLogEvent(data: {
  type?: string
  data?: { level: string; message: string; timestamp: number; payload?: unknown }
}) {
  if (data?.type !== 'new-log' || !data.data) return
  const d = data.data
  const hasPayload = d.payload !== undefined
  const entry: DisplayLogEntry = {
    key: `s-${d.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    fromSocket: true,
    level: d.level,
    message: d.message,
    timeLabel: formatTimestamp(d.timestamp),
    socketHasPayload: hasPayload,
    socketPayload: d.payload,
    expanded: false,
    payloadLoading: false,
    payloadLoaded: hasPayload,
    payloadError: '',
    payloadJsonStr: hasPayload ? JSON.stringify(d.payload) : null
  }
  logEntries.value.unshift(entry)
  if (logEntries.value.length > MAX_LOG_ENTRIES) {
    logEntries.value = logEntries.value.slice(0, MAX_LOG_ENTRIES)
  }
}

async function toggleLogRow(entry: DisplayLogEntry) {
  entry.expanded = !entry.expanded
  if (!entry.expanded) return
  // Сокет-строки не идут за payload на сервер — он либо уже встроен (Debug),
  // либо намеренно скрыт (правило §5.10.5, не наша ошибка чтения).
  if (entry.fromSocket) return
  if (entry.payloadLoaded || entry.payloadLoading) return

  entry.payloadLoading = true
  entry.payloadError = ''
  try {
    const res = (await brokerAdminLogPayloadRoute.run(ctx, {
      ts: entry.historyTs ?? '',
      msg: entry.historyMsg ?? '',
      kv: entry.historyKv ?? ''
    })) as LogPayloadRouteResult
    if (res?.success) {
      entry.payloadJsonStr = res.found ? res.jsonStr : null
      entry.payloadLoaded = true
    } else {
      entry.payloadError = res?.error || 'Ошибка загрузки payload'
    }
  } catch (e) {
    entry.payloadError = (e as Error)?.message || 'Ошибка сети'
  } finally {
    entry.payloadLoading = false
  }
}

async function setupLogsSocket() {
  if (!props.encodedLogsSocketId) return
  try {
    const client = await getOrCreateBrowserSocketClient()
    if (unmounted) {
      // Компонент размонтирован, пока ждали клиент — подписку не создаём,
      // отписываться не от чего (гонка отписки WS, фикс-цикл волны 2.5).
      return
    }
    const subscription = client.subscribeToData(props.encodedLogsSocketId)
    socketSubscription = subscription
    subscription.listen(onSocketLogEvent)
  } catch (e) {
    if (!unmounted) {
      logsError.value = (e as Error)?.message || 'Не удалось подписаться на живой монитор логов'
    }
  }
}

onMounted(() => {
  loadLogHistory()
  setupLogsSocket()
})

onBeforeUnmount(() => {
  unmounted = true
  if (socketSubscription?.unsubscribe) {
    socketSubscription.unsubscribe()
    socketSubscription = null
  }
})
</script>

<template>
  <section style="border: 1px solid #333; padding: 12px">
    <h2 style="font-size: 14px; text-transform: uppercase; margin: 0 0 12px">
      Живой монитор логов
    </h2>
    <p v-if="logsError" style="color: #f44336">{{ logsError }}</p>
    <div v-if="logsLoading" style="color: #888">Загрузка истории…</div>
    <div v-if="logEntries.length === 0 && !logsLoading" style="color: #888">Логов пока нет</div>
    <div
      v-for="entry in logEntries"
      :key="entry.key"
      style="border-top: 1px solid #222; padding: 4px 0"
    >
      <div style="cursor: pointer; display: flex; gap: 8px" @click="toggleLogRow(entry)">
        <span style="color: #666">{{ entry.timeLabel }}</span>
        <span>[{{ entry.level.toUpperCase() }}]</span>
        <span>{{ entry.message }}</span>
      </div>
      <div v-if="entry.expanded" style="margin: 4px 0 0 16px; font-size: 12px">
        <template v-if="entry.fromSocket">
          <pre v-if="entry.socketHasPayload" style="white-space: pre-wrap">{{
            entry.payloadJsonStr
          }}</pre>
          <span v-else style="color: #888">payload скрыт (уровень &lt; Debug)</span>
        </template>
        <template v-else>
          <span v-if="entry.payloadLoading" style="color: #888">Загрузка payload…</span>
          <span v-else-if="entry.payloadError" style="color: #f44336">{{
            entry.payloadError
          }}</span>
          <pre v-else-if="entry.payloadJsonStr" style="white-space: pre-wrap">{{
            entry.payloadJsonStr
          }}</pre>
          <span v-else-if="entry.payloadLoaded" style="color: #888"
            >payload недоступен для этой записи</span
          >
        </template>
      </div>
    </div>
  </section>
</template>
