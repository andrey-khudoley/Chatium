<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  campaignId: string
  partnerId: string
  campaignTitle: string
  indexUrl: string
  campaignUrl?: string
}>()

const partner = ref<{
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
} | null>(null)
const links = ref<
  Array<{ id: string; pageId: string; pageTitle: string; publicSlug: string; fullUrl: string }>
>([])
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

const referralsListUrl = ref('')
function updateReferralsUrl() {
  if (!props.campaignUrl) return
  const base = props.campaignUrl.replace(/#.*$/, '')
  referralsListUrl.value = `${base}#referrals~${encodeURIComponent(props.partnerId)}`
}

async function load() {
  if (!props.partnerId) return
  loading.value = true
  error.value = ''
  const base = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${base}/api/partners/get?campaignId=${encodeURIComponent(props.campaignId)}&partnerId=${encodeURIComponent(props.partnerId)}`,
      { credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      partner?: typeof partner.value
      links?: typeof links.value
    }
    if (res.ok && data?.success) {
      partner.value = data.partner ?? null
      links.value = data.links ?? []
      updateReferralsUrl()
    } else {
      error.value = data?.error ?? 'Ошибка загрузки'
    }
  } catch {
    error.value = 'Ошибка запроса'
  } finally {
    loading.value = false
  }
}

function copyUrl(url: string) {
  navigator.clipboard?.writeText(url).catch(() => {})
}

onMounted(() => {
  load()
  updateReferralsUrl()
})
watch(
  () => [props.campaignId, props.partnerId] as const,
  () => load()
)
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <a
      v-if="campaignUrl"
      :href="campaignUrl + '#partners'"
      class="text-sm text-[var(--color-accent)] hover:underline mb-4 inline-block"
    >
      <i class="fas fa-arrow-left mr-1"></i>К списку партнёров
    </a>
    <h1 class="text-2xl text-[var(--color-text)] mb-6">
      Профиль партнёра
      <span v-if="partner" class="font-normal text-[var(--color-text-secondary)]">
        — {{ partner.fullName || partner.username || partner.id }}
      </span>
    </h1>

    <p v-if="error" class="text-red-400 text-sm mb-3">{{ error }}</p>
    <div v-if="loading" class="py-8 text-center text-[var(--color-text-secondary)]">
      <i class="fas fa-spinner fa-spin text-xl"></i>
    </div>
    <template v-else-if="partner">
      <section
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 mb-6"
      >
        <h2 class="text-lg text-[var(--color-text)] mb-3">Данные</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt class="text-[var(--color-text-secondary)]">Имя</dt>
          <dd class="text-[var(--color-text)]">{{ partner.fullName || '—' }}</dd>
          <dt class="text-[var(--color-text-secondary)]">Username</dt>
          <dd class="text-[var(--color-text)]">
            {{ partner.username ? `@${partner.username}` : '—' }}
          </dd>
          <dt class="text-[var(--color-text-secondary)]">Регистрации</dt>
          <dd class="text-[var(--color-text)]">{{ partner.stats.registrations }}</dd>
          <dt class="text-[var(--color-text-secondary)]">Заказы</dt>
          <dd class="text-[var(--color-text)]">{{ partner.stats.orders }}</dd>
          <dt class="text-[var(--color-text-secondary)]">Оплаты</dt>
          <dd class="text-[var(--color-text)]">{{ partner.stats.payments }}</dd>
          <dt class="text-[var(--color-text-secondary)]">Сумма оплат</dt>
          <dd class="text-[var(--color-text)]">{{ formatMoney(partner.stats.paymentsSum) }}</dd>
        </dl>
        <a
          v-if="referralsListUrl"
          :href="referralsListUrl"
          class="inline-block mt-3 text-sm text-[var(--color-accent)] hover:underline"
        >
          Рефералы этого партнёра →
        </a>
      </section>

      <section
        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
      >
        <h2 class="text-lg text-[var(--color-text)] mb-3">Партнёрские ссылки</h2>
        <p v-if="links.length === 0" class="text-[var(--color-text-secondary)] text-sm">
          Нет ссылок. Ссылки создаются при переходе партнёра по целевым страницам.
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-[var(--color-text-secondary)] text-left">
              <tr>
                <th class="px-2 py-2">Страница</th>
                <th class="px-2 py-2">Ссылка</th>
                <th class="px-2 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody class="text-[var(--color-text)]">
              <tr
                v-for="link in links"
                :key="link.id"
                class="border-t border-[var(--color-border)]"
              >
                <td class="px-2 py-2">{{ link.pageTitle || '—' }}</td>
                <td class="px-2 py-2 font-mono text-xs truncate max-w-xs" :title="link.fullUrl">
                  {{ link.fullUrl }}
                </td>
                <td class="px-2 py-2">
                  <button
                    type="button"
                    class="text-[var(--color-accent)] hover:underline"
                    title="Копировать"
                    @click="copyUrl(link.fullUrl)"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
    <p v-else-if="!loading" class="text-[var(--color-text-secondary)]">Партнёр не найден.</p>
  </div>
</template>
