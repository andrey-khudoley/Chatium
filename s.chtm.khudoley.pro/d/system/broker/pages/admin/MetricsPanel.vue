<script setup lang="ts">
declare const ctx: any

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { brokerAdminMetricsRoute } from '../../api/broker/admin/metrics'

// Панель метрик (§5.11, волна 2.5, фикс-цикл разбиения AdminPage.vue) —
// вынесена из AdminPage.vue как самостоятельная секция со своим автополлингом
// (проще, чем tick-props из родителя). Локальные интерфейсы — намеренно НЕ
// импортируются из lib/ (жёсткий инвариант: в .vue нельзя импортировать
// tables/repos/lib).

interface DeliveryStatusCounts {
  pending: number
  claimed: number
  acked: number
  dead: number
}

interface EventTypeCount {
  eventType: string
  count: number
}

interface MetricsResult {
  eventsTotal: number
  events24h: number
  eventsByType24h: EventTypeCount[]
  deliveriesByStatus: DeliveryStatusCounts
  deadRatio: number
  activeModulesCount: number
}

type RouteError = { success: false; error?: string }
type MetricsRouteResult = (MetricsResult & { success: true }) | RouteError

const POLL_INTERVAL_MS = 10000

const metrics = ref<MetricsResult | null>(null)
const metricsLoading = ref(false)
const metricsError = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadMetrics() {
  metricsLoading.value = true
  metricsError.value = ''
  try {
    const res = (await brokerAdminMetricsRoute.run(ctx)) as MetricsRouteResult
    if (res?.success) {
      metrics.value = res
    } else {
      metricsError.value = res?.error || 'Ошибка загрузки метрик'
    }
  } catch (e) {
    metricsError.value = (e as Error)?.message || 'Ошибка сети'
  } finally {
    metricsLoading.value = false
  }
}

onMounted(() => {
  loadMetrics()
  pollTimer = setInterval(loadMetrics, POLL_INTERVAL_MS)
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
      <h2 style="font-size: 14px; text-transform: uppercase; margin: 0">Метрики</h2>
      <button
        :disabled="metricsLoading"
        style="padding: 4px 12px; cursor: pointer"
        @click="loadMetrics"
      >
        {{ metricsLoading ? 'Обновление…' : 'Обновить' }}
      </button>
    </div>
    <p v-if="metricsError" style="color: #f44336">{{ metricsError }}</p>
    <div v-else-if="!metrics" style="color: #888">Загрузка…</div>
    <div v-else>
      <p>
        Событий всего: <strong>{{ metrics.eventsTotal }}</strong> · за 24ч:
        <strong>{{ metrics.events24h }}</strong> · активных модулей:
        <strong>{{ metrics.activeModulesCount }}</strong>
      </p>
      <p>
        Доставки — pending: <strong>{{ metrics.deliveriesByStatus.pending }}</strong
        >, claimed: <strong>{{ metrics.deliveriesByStatus.claimed }}</strong
        >, acked: <strong>{{ metrics.deliveriesByStatus.acked }}</strong
        >, dead: <strong>{{ metrics.deliveriesByStatus.dead }}</strong> · доля dead:
        <strong>{{ (metrics.deadRatio * 100).toFixed(1) }}%</strong>
      </p>
      <p style="margin-bottom: 4px">Разбивка событий по типу за 24ч:</p>
      <ul v-if="metrics.eventsByType24h.length > 0" style="margin: 0; padding-left: 18px">
        <li v-for="row in metrics.eventsByType24h" :key="row.eventType">
          {{ row.eventType }} — {{ row.count }}
        </li>
      </ul>
      <p v-else style="color: #888">Событий за 24ч нет</p>
    </div>
  </section>
</template>
