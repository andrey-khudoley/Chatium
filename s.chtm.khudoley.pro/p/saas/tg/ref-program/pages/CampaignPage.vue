<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatsCard from '../components/Charts/StatsCard.vue'

const props = defineProps<{
  campaignId: string
  campaignTitle: string
  indexUrl: string
  campaignUrl?: string
}>()

function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return basePath ? `${origin}${basePath}` : origin
}

const inviteLink = ref('')
const creatingInvite = ref(false)
const inviteError = ref('')
const dashboardLoading = ref(true)
const aggregates = ref({
  partnersCount: 0,
  referralsCount: 0,
  totalOrdersCount: 0,
  totalOrdersSum: 0,
  totalPaymentsCount: 0,
  totalPaymentsSum: 0
})
const latestReferrals = ref<
  Array<{
    id: string
    ref: string
    name?: string
    email?: string
    registeredAt?: string
    ordersCount: number
    ordersSum: number
    paymentsCount: number
    paymentsSum: number
  }>
>([])

const inviteLinkFull = computed(() => {
  if (!inviteLink.value) return ''
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${basePath}/web/invite~${encodeURIComponent(inviteLink.value)}`
})

const referralsUrl = computed(() => (props.campaignUrl ? `${props.campaignUrl}#referrals` : ''))

function formatMoney(kopecks: number): string {
  if (kopecks === 0) return '0 ₽'
  return `${(kopecks / 100).toFixed(2)} ₽`
}

async function loadDashboard() {
  dashboardLoading.value = true
  const base = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${base}/api/analytics/dashboard?campaignId=${encodeURIComponent(props.campaignId)}`,
      { credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      aggregates?: typeof aggregates.value
      latestReferrals?: typeof latestReferrals.value
    }
    if (res.ok && data?.success) {
      if (data.aggregates) aggregates.value = data.aggregates
      if (Array.isArray(data.latestReferrals)) latestReferrals.value = data.latestReferrals
    }
  } finally {
    dashboardLoading.value = false
  }
}

async function createInvite() {
  creatingInvite.value = true
  inviteError.value = ''
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/api/invites/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ campaignId: props.campaignId })
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      invite?: { token?: string }
    }
    if (res.ok && data?.success && data.invite?.token) {
      inviteLink.value = data.invite.token
      return
    }
    inviteError.value = data?.error || 'Ошибка создания приглашения'
  } catch {
    inviteError.value = 'Ошибка запроса'
  } finally {
    creatingInvite.value = false
  }
}

function copyInviteLink() {
  if (!inviteLinkFull.value) return
  navigator.clipboard?.writeText(inviteLinkFull.value)
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl text-[var(--color-text)] mb-6">{{ campaignTitle }}</h1>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Партнёры"
        :value="dashboardLoading ? '—' : aggregates.partnersCount"
        icon="fas fa-users"
      />
      <StatsCard
        title="Рефералы"
        :value="dashboardLoading ? '—' : aggregates.referralsCount"
        icon="fas fa-user-friends"
      />
      <StatsCard
        title="Заказы"
        :value="dashboardLoading ? '—' : aggregates.totalOrdersCount"
        :subtitle="aggregates.totalOrdersSum ? formatMoney(aggregates.totalOrdersSum) : undefined"
        icon="fas fa-shopping-cart"
      />
      <StatsCard
        title="Оплаты"
        :value="dashboardLoading ? '—' : aggregates.totalPaymentsCount"
        :subtitle="
          aggregates.totalPaymentsSum ? formatMoney(aggregates.totalPaymentsSum) : undefined
        "
        icon="fas fa-ruble-sign"
      />
    </section>

    <section
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 mb-6"
    >
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg text-[var(--color-text)]">Последние рефералы</h2>
        <a
          v-if="referralsUrl"
          :href="referralsUrl"
          class="text-sm text-[var(--color-accent)] hover:underline"
        >
          Все рефералы →
        </a>
      </div>
      <div v-if="dashboardLoading" class="py-4 text-center text-[var(--color-text-secondary)]">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div
        v-else-if="latestReferrals.length === 0"
        class="py-4 text-center text-[var(--color-text-secondary)] text-sm"
      >
        Пока нет рефералов.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="r in latestReferrals"
          :key="r.id"
          class="flex items-center justify-between gap-4 py-2 border-b border-[var(--color-border)] last:border-0 text-sm"
        >
          <span class="text-[var(--color-text)] truncate">
            {{ r.name || r.email || r.ref || '—' }}
          </span>
          <span class="text-[var(--color-text-secondary)] shrink-0">
            Заказов: {{ r.ordersCount }}, оплат: {{ r.paymentsCount }}
            <span v-if="r.paymentsSum"> ({{ formatMoney(r.paymentsSum) }})</span>
          </span>
        </li>
      </ul>
    </section>

    <section
      class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 mb-6"
    >
      <h2 class="text-lg text-[var(--color-text)] mb-3">Приглашение в кампанию</h2>
      <p class="text-[var(--color-text-secondary)] text-sm mb-3">
        Создайте ссылку и отправьте участнику. После перехода по ссылке он сможет принять
        приглашение.
      </p>
      <button
        v-if="!inviteLink"
        type="button"
        :disabled="creatingInvite"
        class="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
        @click="createInvite"
      >
        <span v-if="creatingInvite"><i class="fas fa-spinner fa-spin mr-1"></i></span>
        Создать приглашение
      </button>
      <div v-else>
        <p class="text-[var(--color-text-secondary)] text-sm mb-2">Ссылка (действует 7 дней):</p>
        <div class="flex gap-2 items-center flex-wrap">
          <input
            :value="inviteLinkFull"
            readonly
            class="flex-1 min-w-0 px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
          />
          <button
            type="button"
            class="px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
            @click="copyInviteLink"
          >
            <i class="fas fa-copy mr-1"></i>Копировать
          </button>
        </div>
      </div>
      <p v-if="inviteError" class="text-red-400 text-sm mt-2">{{ inviteError }}</p>
    </section>
  </div>
</template>
