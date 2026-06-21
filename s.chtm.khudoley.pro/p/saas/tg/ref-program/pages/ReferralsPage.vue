<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Pagination from '../components/Tables/Pagination.vue'
import EventLogModal from '../components/Modals/EventLogModal.vue'
import type { EventLogItem } from '../components/Modals/EventLogModal.vue'

const props = defineProps<{
  campaignId: string
  campaignTitle: string
  indexUrl: string
  campaignUrl?: string
  partnerIdFilter?: string
}>()

const pageSize = 20
const page = ref(1)
const referrals = ref<
  Array<{
    id: string
    ref: string
    name?: string
    email?: string
    phone?: string
    registeredAt?: string
    ordersCount: number
    ordersSum: number
    paymentsCount: number
    paymentsSum: number
  }>
>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const eventLogRef = ref('')
const eventLogVisible = ref(false)
const eventLogLoading = ref(false)
const eventLogEvents = ref<EventLogItem[]>([])

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const u = props.indexUrl
  if (u.startsWith('http')) {
    try {
      const url = new URL(u)
      return url.origin + url.pathname.replace(/\/$/, '')
    } catch {
      return window.location.origin + (u.startsWith('/') ? u : '/' + u).replace(/\/$/, '')
    }
  }
  return window.location.origin + (u.startsWith('/') ? u : '/' + u).replace(/\/$/, '')
}

function formatDatetime(s: string | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatMoney(kopecks: number): string {
  if (kopecks === 0) return '0 ₽'
  return `${(kopecks / 100).toFixed(2)} ₽`
}

function buildListUrl(): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const params = new URLSearchParams()
  params.set('campaignId', props.campaignId)
  params.set('limit', String(pageSize))
  params.set('offset', String((page.value - 1) * pageSize))
  if (props.partnerIdFilter) params.set('partnerId', props.partnerIdFilter)
  return `${base}/api/referrals/list?${params.toString()}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(buildListUrl(), { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      referrals?: typeof referrals.value
      total?: number
    }
    if (res.ok && data?.success && Array.isArray(data.referrals)) {
      referrals.value = data.referrals
      total.value = data.total ?? 0
    } else {
      error.value = data?.error ?? 'Ошибка загрузки'
    }
  } catch {
    error.value = 'Ошибка запроса'
  } finally {
    loading.value = false
  }
}

async function openEventLog(refKey: string) {
  eventLogRef.value = refKey
  eventLogVisible.value = true
  eventLogLoading.value = true
  eventLogEvents.value = []
  const base = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${base}/api/referrals/events?campaignId=${encodeURIComponent(props.campaignId)}&ref=${encodeURIComponent(refKey)}`,
      { credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      events?: EventLogItem[]
    }
    if (res.ok && data?.success && Array.isArray(data.events)) {
      eventLogEvents.value = data.events
    }
  } finally {
    eventLogLoading.value = false
  }
}

function closeEventLog() {
  eventLogVisible.value = false
  eventLogRef.value = ''
}

onMounted(() => load())
watch(
  () => [props.campaignId, props.partnerIdFilter, page.value] as const,
  () => load()
)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-2xl text-[var(--color-text)] mb-6">Рефералы</h1>
    <p class="text-[var(--color-text-secondary)] text-sm mb-6">
      Список рефералов кампании. Нажмите «Лог» для просмотра событий (регистрация, заказы, оплаты).
    </p>
    <p v-if="partnerIdFilter" class="text-sm text-[var(--color-text-secondary)] mb-3">
      Фильтр: только рефералы выбранного партнёра.
    </p>
    <p v-if="error" class="text-red-400 text-sm mb-3">{{ error }}</p>
    <div
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden"
    >
      <div v-if="loading" class="p-8 text-center text-[var(--color-text-secondary)]">
        <i class="fas fa-spinner fa-spin text-xl"></i>
      </div>
      <template v-else>
        <div
          v-if="referrals.length === 0"
          class="p-8 text-center text-[var(--color-text-secondary)]"
        >
          Нет рефералов
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-left">
            <tr>
              <th class="px-4 py-2">Имя / ref</th>
              <th class="px-4 py-2">Дата регистрации</th>
              <th class="px-4 py-2">Заказы</th>
              <th class="px-4 py-2">Сумма заказов</th>
              <th class="px-4 py-2">Оплаты</th>
              <th class="px-4 py-2">Сумма оплат</th>
              <th class="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody class="text-[var(--color-text)]">
            <tr
              v-for="r in referrals"
              :key="r.id"
              class="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]"
            >
              <td class="px-4 py-2">{{ r.name || r.email || r.ref || '—' }}</td>
              <td class="px-4 py-2">{{ formatDatetime(r.registeredAt) }}</td>
              <td class="px-4 py-2">{{ r.ordersCount }}</td>
              <td class="px-4 py-2">{{ formatMoney(r.ordersSum) }}</td>
              <td class="px-4 py-2">{{ r.paymentsCount }}</td>
              <td class="px-4 py-2">{{ formatMoney(r.paymentsSum) }}</td>
              <td class="px-4 py-2">
                <button
                  type="button"
                  class="text-[var(--color-accent)] hover:underline text-sm"
                  @click="openEventLog(r.ref)"
                >
                  Лог
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div
        v-if="!loading && referrals.length > 0"
        class="border-t border-[var(--color-border)] px-4"
      >
        <Pagination v-model:page="page" :total="total" :page-size="pageSize" />
      </div>
    </div>
    <EventLogModal
      :visible="eventLogVisible"
      title="Лог событий реферала"
      :ref-label="eventLogRef"
      :events="eventLogEvents"
      :loading="eventLogLoading"
      @close="closeEventLog"
    />
  </div>
</template>
