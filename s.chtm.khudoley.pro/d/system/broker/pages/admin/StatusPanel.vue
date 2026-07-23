<script setup lang="ts">
declare const ctx: any

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { brokerAdminStatusRoute } from '../../api/broker/admin/status'
import { brokerAdminLogLevelRoute } from '../../api/broker/admin/log-level'
import { brokerAdminDisableRoute } from '../../api/broker/admin/disable'
import { brokerAdminEnableRoute } from '../../api/broker/admin/enable'

// Статус-панель (§5.11, волна 2.5, фикс-цикл разбиения AdminPage.vue) — вынесена
// из AdminPage.vue как самостоятельная секция со своим автополлингом (проще, чем
// tick-props из родителя — не требует межкомпонентной реактивной прокладки).
// Локальные интерфейсы — намеренно НЕ импортируются из lib/ (жёсткий инвариант:
// в .vue нельзя импортировать tables/repos/lib).

interface DeliveryStatusCounts {
  pending: number
  claimed: number
  acked: number
  dead: number
}

interface ModuleRow {
  moduleKey: string
  displayName: string | null
  source: 'internal' | 'external'
  status: 'onModeration' | 'active' | 'disabled'
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
  pendingPublishTypes: string[] | null
  pendingSubscribeTypes: string[] | null
  claimTimeoutMs: number | null
}

interface StatusResult {
  fanoutBacklog: number
  deliveriesByStatus: DeliveryStatusCounts
  oldestPendingAgeMs: number | null
  modules: ModuleRow[]
  modulesTotal: number
  logLevel: string
}

// Явные типы ответов роутов — см. комментарий-канон в AdminPage.vue (фикс-цикла
// волны 2.5 разбиения): у route.run() выводится плоский тип без поля error в
// success-ветке, кастуем к union с необязательным error для единообразия.
type RouteError = { success: false; error?: string }
type StatusRouteResult = (StatusResult & { success: true }) | RouteError
type LogLevelRouteResult = { success: true; level: string } | RouteError

const LOG_LEVELS = ['Disable', 'Error', 'Warn', 'Info', 'Debug'] as const
const POLL_INTERVAL_MS = 10000

const status = ref<StatusResult | null>(null)
const statusLoading = ref(false)
const statusError = ref('')

const moduleActionErrors = ref<Record<string, string>>({})
const moduleActionBusy = ref<Record<string, boolean>>({})

const logLevelSaving = ref(false)
const logLevelError = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

function formatAgeMs(ms: number): string {
  if (ms < 1000) return `${ms} мс`
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec} с`
  const min = Math.floor(sec / 60)
  return `${min} мин ${sec % 60} с`
}

async function loadStatus() {
  statusLoading.value = true
  statusError.value = ''
  try {
    const res = (await brokerAdminStatusRoute.run(ctx)) as StatusRouteResult
    if (res?.success) {
      status.value = res
    } else {
      statusError.value = res?.error || 'Ошибка загрузки статуса'
    }
  } catch (e) {
    statusError.value = (e as Error)?.message || 'Ошибка сети'
  } finally {
    statusLoading.value = false
  }
}

async function disableModule(moduleKey: string) {
  moduleActionErrors.value[moduleKey] = ''
  moduleActionBusy.value[moduleKey] = true
  try {
    const res = await brokerAdminDisableRoute.run(ctx, { moduleKey })
    if (!res?.success) {
      moduleActionErrors.value[moduleKey] = res?.error || 'Ошибка отключения модуля'
      return
    }
    await loadStatus()
  } catch (e) {
    moduleActionErrors.value[moduleKey] = (e as Error)?.message || 'Ошибка сети'
  } finally {
    moduleActionBusy.value[moduleKey] = false
  }
}

async function enableModule(moduleKey: string) {
  moduleActionErrors.value[moduleKey] = ''
  moduleActionBusy.value[moduleKey] = true
  try {
    const res = await brokerAdminEnableRoute.run(ctx, { moduleKey })
    if (!res?.success) {
      moduleActionErrors.value[moduleKey] = res?.error || 'Ошибка включения модуля'
      return
    }
    await loadStatus()
  } catch (e) {
    moduleActionErrors.value[moduleKey] = (e as Error)?.message || 'Ошибка сети'
  } finally {
    moduleActionBusy.value[moduleKey] = false
  }
}

async function changeLogLevel(level: (typeof LOG_LEVELS)[number]) {
  logLevelError.value = ''
  logLevelSaving.value = true
  try {
    const res = (await brokerAdminLogLevelRoute.run(ctx, { level })) as LogLevelRouteResult
    if (res?.success) {
      if (status.value) status.value.logLevel = res.level
    } else {
      logLevelError.value = res?.error || 'Ошибка смены уровня логирования'
    }
  } catch (e) {
    logLevelError.value = (e as Error)?.message || 'Ошибка сети'
  } finally {
    logLevelSaving.value = false
  }
}

onMounted(() => {
  loadStatus()
  pollTimer = setInterval(loadStatus, POLL_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<template>
  <section style="margin-bottom: 20px; border: 1px solid #333; padding: 12px">
    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      "
    >
      <h2 style="font-size: 14px; text-transform: uppercase; margin: 0">Статус</h2>
      <button
        :disabled="statusLoading"
        style="padding: 4px 12px; cursor: pointer"
        @click="loadStatus"
      >
        {{ statusLoading ? 'Обновление…' : 'Обновить' }}
      </button>
    </div>
    <p v-if="statusError" style="color: #f44336">{{ statusError }}</p>
    <div v-else-if="!status" style="color: #888">Загрузка…</div>
    <div v-else>
      <p>
        Backlog fan-out: <strong>{{ status.fanoutBacklog }}</strong> · Доставки — pending:
        <strong>{{ status.deliveriesByStatus.pending }}</strong
        >, claimed: <strong>{{ status.deliveriesByStatus.claimed }}</strong
        >, acked: <strong>{{ status.deliveriesByStatus.acked }}</strong
        >, dead:
        <strong>{{ status.deliveriesByStatus.dead }}</strong>
      </p>
      <p>
        Возраст старейшей pending:
        <strong>{{
          status.oldestPendingAgeMs === null
            ? 'нет ожидающих'
            : formatAgeMs(status.oldestPendingAgeMs)
        }}</strong>
      </p>

      <div style="margin: 12px 0">
        <span
          >Уровень логирования: <strong>{{ status.logLevel }}</strong></span
        >
        <div style="display: flex; gap: 8px; margin-top: 6px">
          <button
            v-for="lvl in LOG_LEVELS"
            :key="lvl"
            :disabled="logLevelSaving"
            :style="{
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: status.logLevel === lvl ? 'bold' : 'normal'
            }"
            @click="changeLogLevel(lvl)"
          >
            {{ lvl }}
          </button>
        </div>
        <p v-if="logLevelError" style="color: #f44336; margin: 4px 0 0">{{ logLevelError }}</p>
      </div>

      <p style="margin: 0 0 6px; color: #888">
        Модулей: <strong>{{ status.modulesTotal }}</strong>
        <span v-if="status.modulesTotal > status.modules.length">
          (в списке — первые {{ status.modules.length }}, потолок выборки)</span
        >
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #333">
            <th style="padding: 4px">moduleKey</th>
            <th style="padding: 4px">source</th>
            <th style="padding: 4px">status</th>
            <th style="padding: 4px">publish</th>
            <th style="padding: 4px">subscribe</th>
            <th style="padding: 4px">claimTimeoutMs</th>
            <th style="padding: 4px">действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="status.modules.length === 0">
            <td colspan="7" style="padding: 8px; color: #888">Модулей нет</td>
          </tr>
          <tr v-for="m in status.modules" :key="m.moduleKey" style="border-bottom: 1px solid #222">
            <td style="padding: 4px">{{ m.moduleKey }}</td>
            <td style="padding: 4px">{{ m.source }}</td>
            <td style="padding: 4px">{{ m.status }}</td>
            <td style="padding: 4px">{{ m.allowedPublishTypes.join(', ') || '—' }}</td>
            <td style="padding: 4px">{{ m.allowedSubscribeTypes.join(', ') || '—' }}</td>
            <td style="padding: 4px">{{ m.claimTimeoutMs ?? '—' }}</td>
            <td style="padding: 4px">
              <button
                v-if="m.status === 'active'"
                :disabled="moduleActionBusy[m.moduleKey]"
                style="cursor: pointer"
                @click="disableModule(m.moduleKey)"
              >
                Disable
              </button>
              <button
                v-else-if="m.status === 'disabled'"
                :disabled="moduleActionBusy[m.moduleKey]"
                style="cursor: pointer"
                @click="enableModule(m.moduleKey)"
              >
                Enable
              </button>
              <span v-else style="color: #888">—</span>
              <div v-if="moduleActionErrors[m.moduleKey]" style="color: #f44336; font-size: 11px">
                {{ moduleActionErrors[m.moduleKey] }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
