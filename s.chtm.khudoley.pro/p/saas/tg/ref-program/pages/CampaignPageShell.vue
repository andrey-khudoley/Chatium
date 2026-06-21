<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import Sidebar from '../components/Layout/Sidebar.vue'
import PageContainer from '../components/Layout/PageContainer.vue'
import CampaignPage from './CampaignPage.vue'
import PagesPage from './PagesPage.vue'
import BotPage from './BotPage.vue'
import PartnersPage from './PartnersPage.vue'
import PartnerProfilePage from './PartnerProfilePage.vue'
import ReferralsPage from './ReferralsPage.vue'
import AboutCampaignPage from './AboutCampaignPage.vue'

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  campaignId: string
  campaignTitle: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  campaignUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
}>()

const currentSection = ref('dashboard')
const hashSubParam = ref('')

function applyHash() {
  const raw = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  const [section, sub] = raw.split('~')
  currentSection.value = section || 'dashboard'
  hashSubParam.value = sub || ''
}

const partnerIdFromHash = computed(() =>
  currentSection.value === 'partner' ? hashSubParam.value : ''
)
const referralsPartnerFilter = computed(() =>
  currentSection.value === 'referrals' && hashSubParam.value ? hashSubParam.value : undefined
)

onMounted(() => {
  if (window.hideAppLoader) window.hideAppLoader()
  applyHash()
  window.addEventListener('hashchange', applyHash)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', applyHash)
})
</script>

<template>
  <div class="app-layout flex bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen">
    <GlobalGlitch />
    <Sidebar
      :campaign-url="props.campaignUrl"
      :campaign-title="props.campaignTitle"
      :index-url="props.indexUrl"
      :current-section="currentSection"
    />
    <PageContainer
      :projectTitle="props.campaignTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
    >
      <CampaignPage
        v-if="!currentSection || currentSection === 'dashboard'"
        :campaign-id="props.campaignId"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
        :campaign-url="props.campaignUrl"
      />
      <PagesPage
        v-else-if="currentSection === 'pages'"
        :campaign-id="props.campaignId"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
      />
      <BotPage
        v-else-if="currentSection === 'bot'"
        :campaign-id="props.campaignId"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
      />
      <PartnersPage
        v-else-if="currentSection === 'partners'"
        :campaign-id="props.campaignId"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
        :campaign-url="props.campaignUrl"
      />
      <PartnerProfilePage
        v-else-if="currentSection === 'partner' && partnerIdFromHash"
        :campaign-id="props.campaignId"
        :partner-id="partnerIdFromHash"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
        :campaign-url="props.campaignUrl"
      />
      <ReferralsPage
        v-else-if="currentSection === 'referrals'"
        :campaign-id="props.campaignId"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
        :campaign-url="props.campaignUrl"
        :partner-id-filter="referralsPartnerFilter"
      />
      <AboutCampaignPage
        v-else-if="currentSection === 'about'"
        :campaign-id="props.campaignId"
        :campaign-title="props.campaignTitle"
        :index-url="props.indexUrl"
      />
      <div v-else class="p-6 text-[var(--color-text-secondary)]">
        Раздел «{{ currentSection }}» в разработке.
      </div>
    </PageContainer>
  </div>
</template>
