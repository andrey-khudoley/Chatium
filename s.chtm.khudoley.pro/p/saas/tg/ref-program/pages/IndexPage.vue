<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import CampaignForm from '../components/Forms/CampaignForm.vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('IndexPage')

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
}>()

function campaignUrlBuilder(id: string): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${basePath}/web/campaign?campaignId=${encodeURIComponent(id)}`
}

function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return basePath ? `${origin}${basePath}` : origin
}

const campaigns = ref<Array<{ id: string; title: string; createdAt?: string; updatedAt?: string }>>(
  []
)
const loading = ref(true)
const error = ref('')
const showCreateForm = ref(false)

async function loadCampaigns() {
  loading.value = true
  error.value = ''
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/api/campaigns/list`, { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      error?: string
      campaigns?: Array<{ id: string; title: string; createdAt?: string; updatedAt?: string }>
    }
    if (res.ok && data?.success && Array.isArray(data.campaigns)) {
      campaigns.value = data.campaigns
    } else {
      error.value = data?.error || 'Ошибка загрузки'
    }
  } catch (e) {
    log.error('Ошибка загрузки кампаний', e)
    error.value = 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
}

function onCampaignCreated() {
  showCreateForm.value = false
  loadCampaigns()
}

function openCreateForm() {
  showCreateForm.value = true
}

onMounted(() => {
  if (window.hideAppLoader) window.hideAppLoader()
  if (window.bootLoaderComplete) {
    loadCampaigns()
  } else {
    window.addEventListener('bootloader-complete', loadCampaigns)
  }
})
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col min-h-screen">
    <GlobalGlitch />
    <Header
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
    />

    <main class="content-wrapper flex-1 relative z-10 overflow-y-auto">
      <div class="content-inner max-w-4xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl text-[var(--color-text)]">Кампании</h1>
          <button
            type="button"
            class="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition"
            @click="openCreateForm"
          >
            <i class="fas fa-plus mr-2"></i>Создать кампанию
          </button>
        </div>

        <div v-if="loading" class="text-[var(--color-text-secondary)] py-8 text-center">
          <i class="fas fa-spinner fa-spin text-2xl"></i>
        </div>
        <p v-else-if="error" class="text-red-400">{{ error }}</p>
        <ul
          v-else-if="campaigns.length === 0"
          class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center text-[var(--color-text-secondary)]"
        >
          Нет кампаний. Создайте первую.
        </ul>
        <ul v-else class="space-y-2">
          <li
            v-for="c in campaigns"
            :key="c.id"
            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition"
          >
            <a
              :href="campaignUrlBuilder(c.id)"
              class="block px-4 py-3 flex items-center justify-between"
            >
              <span class="text-[var(--color-text)]">{{ c.title }}</span>
              <i class="fas fa-chevron-right text-[var(--color-text-tertiary)]"></i>
            </a>
          </li>
        </ul>

        <CampaignForm
          v-if="showCreateForm"
          :api-base-url="getApiBaseUrl().replace(/\/$/, '')"
          @created="onCampaignCreated"
          @cancel="showCreateForm = false"
        />
      </div>
    </main>

    <AppFooter />
  </div>
</template>
