<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import Pagination from '../components/Tables/Pagination.vue'

const props = defineProps<{
  campaignId: string
  campaignTitle: string
  indexUrl: string
  campaignUrl?: string
}>()

const pageSize = 20
const page = ref(1)
const partners = ref<
  Array<{
    id: string
    tgId?: string
    username?: string
    fullName?: string
    stats: {
      registrations: number
      orders: number
      payments: number
      paymentsSum: number
      earnings: number
      pendingEarnings: number
    }
  }>
>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

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
  return `${base}/api/partners/list?${params.toString()}`
}

function partnerProfileHref(partnerId: string): string {
  if (!props.campaignUrl) return '#'
  const base = props.campaignUrl.replace(/#.*$/, '')
  return `${base}#partner~${encodeURIComponent(partnerId)}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(buildListUrl(), { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      partners?: typeof partners.value
      total?: number
    }
    if (res.ok && data?.success && Array.isArray(data.partners)) {
      partners.value = data.partners
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

onMounted(() => load())
watch(
  () => [props.campaignId, page.value] as const,
  () => load()
)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <h1 class="text-2xl text-[var(--color-text)] mb-6">Партнёры</h1>
    <p class="text-[var(--color-text-secondary)] text-sm mb-6">
      Список партнёров кампании. Перейдите в профиль для просмотра ссылок и рефералов.
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
          v-if="partners.length === 0"
          class="p-8 text-center text-[var(--color-text-secondary)]"
        >
          Нет партнёров
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-left">
            <tr>
              <th class="px-4 py-2">Партнёр</th>
              <th class="px-4 py-2">Регистрации</th>
              <th class="px-4 py-2">Заказы</th>
              <th class="px-4 py-2">Оплаты</th>
              <th class="px-4 py-2">Сумма оплат</th>
              <th class="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody class="text-[var(--color-text)]">
            <tr
              v-for="p in partners"
              :key="p.id"
              class="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]"
            >
              <td class="px-4 py-2">
                <span class="font-medium">{{ p.fullName || '—' }}</span>
                <span v-if="p.username" class="text-[var(--color-text-secondary)] ml-1"
                  >@{{ p.username }}</span
                >
              </td>
              <td class="px-4 py-2">{{ p.stats.registrations }}</td>
              <td class="px-4 py-2">{{ p.stats.orders }}</td>
              <td class="px-4 py-2">{{ p.stats.payments }}</td>
              <td class="px-4 py-2">{{ formatMoney(p.stats.paymentsSum) }}</td>
              <td class="px-4 py-2">
                <a
                  :href="partnerProfileHref(p.id)"
                  class="text-[var(--color-accent)] hover:underline text-sm"
                >
                  Профиль
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div
        v-if="!loading && partners.length > 0"
        class="border-t border-[var(--color-border)] px-4"
      >
        <Pagination v-model:page="page" :total="total" :page-size="pageSize" />
      </div>
    </div>
  </div>
</template>
