<template>
  <div class="app-layout flex flex-col" @animationend="onAppLayoutAnimationEnd">
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :projectTitle="projectTitle"
      :indexUrl="indexUrl"
      :profileUrl="profileUrl"
      :loginUrl="loginUrl"
      :isAuthenticated="isAuthenticated"
      :isAdmin="isAdmin"
      :adminUrl="adminUrl"
      :testsUrl="testsUrl"
      :panelUrl="panelUrl"
    />

    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner" :class="{ ready: bootLoaderDone }">
        <HomeStatusStrip
          :allConfigured="allConfigured"
          :missingConfig="missingConfig"
          :baseUrl="baseUrl"
          @copy="copyText"
        />

        <HomeToolbar
          :sections="visibleSections"
          :secondaryTabs="secondaryTabs"
          :activeSection="activeSection"
          :activeTab="activeTab"
          :fromDate="fromDate"
          :fromTime="fromTime"
          :toDate="toDate"
          :toTime="toTime"
          :hasActiveFilter="hasActiveFilter"
          :dateFilterSaving="dateFilterSaving"
          :dateFilterError="dateFilterError"
          :liveMode="liveMode"
          :searchValue="searchValue"
          @set-section="setSection"
          @set-tab="setTab"
          @update:fromDate="fromDate = $event"
          @update:fromTime="fromTime = $event"
          @update:toDate="toDate = $event"
          @update:toTime="toTime = $event"
          @filter-change="onFilterChange"
          @reset-filter="resetDateFilter"
          @update:liveMode="liveMode = $event"
          @update:searchValue="searchValue = $event"
          @search="doSearch"
          @clear-search="clearSearch"
        />

        <HomeSearchResult
          v-if="searchResult"
          :result="searchResult"
          :searchedQuery="searchedQuery"
          @close="searchResult = null"
        />

        <HomeOverviewTab
          v-if="activeTab === 'overview'"
          :analytics="analytics"
          :periodLabel="periodLabel"
          :recentRequestsPreview="recentRequestsPreview"
          :recentWebhooksPreview="recentWebhooksPreview"
          :lastUpdated="lastUpdated"
          :now="now"
          @set-tab="setTab"
          @copy-text="copyText"
        />

        <HomeRequestsTab
          v-show="activeTab === 'requests'"
          :filteredRequests="filteredRequests"
          :filters="requestsFilters"
          :currentFilter="requestsFilter"
          :counts="requestCounts"
          :lastUpdatedTs="lastUpdated.requests"
          :now="now"
          @refresh="loadRequests"
          @update:filter="requestsFilter = $event"
          @lookup="lookupRequest"
          @copy-text="copyText"
          @open-raw="openRaw"
          @set-tab="setTab"
        />

        <HomeWebhooksTab
          v-show="activeTab === 'webhooks'"
          :filteredWebhooks="filteredWebhooks"
          :filters="webhooksFilters"
          :currentFilter="webhooksFilter"
          :counts="webhookCounts"
          :lastUpdatedTs="lastUpdated.webhooks"
          :now="now"
          @refresh="loadWebhooks"
          @update:filter="webhooksFilter = $event"
          @open-raw="openRaw"
        />

        <HomeRequestFormatTab
          v-if="activeTab === 'requestFormat'"
          :invokeUrl="apiUrls?.invoke"
          :paymentSocketUrl="apiUrls?.paymentSocket"
          @copy-text="copyText"
        />

        <HomeCreateRequestTab
          v-show="activeTab === 'createRequest'"
          :currentKey="currentOperationKey"
          :form="requestForm"
          :loading="requestLoading"
          :result="requestResult"
          :gcOperations="gcOperations"
          :isGcOp="isGcOp"
          :gcFormRows="gcFormRows"
          :gcRootKind="gcRootKind"
          :gcArgsValues="gcArgsValues"
          :gcErrors="gcErrors"
          @submit="submitRequest"
          @reset-result="resetRequestResult"
          @lookup="lookupRequest"
          @copy-text="copyText"
          @update:form="requestForm = $event"
          @update:currentKey="onChangeOperationKey"
          @update:gcArgsValues="gcArgsValues = $event"
        />

        <HomePluginsTab
          v-if="activeTab === 'plugins'"
          :initial-plugins="pluginSettings"
          :can-edit="isAdmin"
          @update:plugin-settings="onPluginSettingsUpdate"
        />

        <HomePaymentPageTab
          v-if="activeTab === 'paymentPage'"
          :initial-payment-page-general="initialPaymentPageGeneral"
          :initial-payment-page-methods="initialPaymentPageMethods"
          :anchor-base-url="anchorBaseUrl"
          :loader-url="initialPaymentPageLoaderUrl"
        />

        <HomeAccessTab
          v-if="activeTab === 'access' && isAdmin"
          :invites="invites"
          :grants="grants"
          :accessError="accessError"
          @load-access="loadAccess"
          @open-invite-modal="openInviteModal"
          @revoke-invite="revokeInvite"
          @revoke-grant="revokeGrant"
        />
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />

    <HomeRawModal v-if="rawModal" :modal="rawModal" @close="closeRaw" @copy="copyText" />

    <HomeCreateInviteModal
      v-if="inviteModal"
      :modal="inviteModal"
      @close="closeInviteModal"
      @submit="createInvite"
      @copy="copyText"
      @update-note="onInviteNote"
    />
  </div>
</template>

<script>
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import HomeStatusStrip from '../components/home/HomeStatusStrip.vue'
import HomeToolbar from '../components/home/HomeToolbar.vue'
import HomeSearchResult from '../components/home/HomeSearchResult.vue'
import HomeOverviewTab from '../components/home/HomeOverviewTab.vue'
import HomeRequestsTab from '../components/home/HomeRequestsTab.vue'
import HomeWebhooksTab from '../components/home/HomeWebhooksTab.vue'
import HomeCreateRequestTab from '../components/home/HomeCreateRequestTab.vue'
import HomeRequestFormatTab from '../components/home/HomeRequestFormatTab.vue'
import HomePluginsTab from '../components/home/HomePluginsTab.vue'
import HomeAccessTab from '../components/home/HomeAccessTab.vue'
import HomeRawModal from '../components/home/HomeRawModal.vue'
import HomeCreateInviteModal from '../components/home/HomeCreateInviteModal.vue'
import HomePaymentPageTab from '../components/home/HomePaymentPageTab.vue'
import { sbpHomePageMethodsMixin } from './sbpHomePageMixin'
import {
  msToLocalDate,
  msToLocalTime,
  localPartsToMs,
  defaultSbpHomeApiUrls,
  sbpHomeTabs,
  sbpHomeSections,
  sbpSectionForTab,
  sbpNormalizeTabId,
  sbpRequestsFilters,
  sbpWebhooksFilters,
  sbpPluginConfigChips,
  sbpRequestCounts,
  sbpWebhookCounts,
  sbpFilterRequests,
  sbpFilterWebhooks,
  sbpPeriodLabel
} from '../shared/sbpHomeFormat'
import { buildInitialRequestState } from '../shared/operationsClientCatalog'

const TICK_INTERVAL_MS = 5000

export default {
  name: 'ClientHomePage',
  mixins: [sbpHomePageMethodsMixin],
  components: {
    Header,
    GlobalGlitch,
    AppFooter,
    HomeStatusStrip,
    HomeToolbar,
    HomeSearchResult,
    HomeOverviewTab,
    HomeRequestsTab,
    HomeWebhooksTab,
    HomeCreateRequestTab,
    HomeRequestFormatTab,
    HomePluginsTab,
    HomeAccessTab,
    HomeRawModal,
    HomeCreateInviteModal,
    HomePaymentPageTab
  },
  props: {
    projectTitle: { type: String, default: 'Payments Client / Панель' },
    indexUrl: { type: String, default: '/' },
    profileUrl: { type: String, default: '/' },
    loginUrl: { type: String, default: '/' },
    isAuthenticated: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    adminUrl: { type: String, default: '' },
    testsUrl: { type: String, default: '' },
    panelUrl: { type: String, default: '' },
    webhookUrl: { type: String, default: '' },
    webhookUrlLavatop: { type: String, default: '' },
    baseUrlPath: { type: String, default: '' },
    apiUrls: { type: Object, default: () => defaultSbpHomeApiUrls() },
    initialDateFilter: { type: Object, default: () => ({}) },
    initialPluginSettings: { type: Array, default: () => [] },
    anchorBaseUrl: { type: String, default: '' },
    gcOperations: { type: Array, default: () => [] },
    initialPaymentPageGeneral: { type: Object, default: null },
    initialPaymentPageMethods: { type: Array, default: () => [] },
    initialPaymentPageLoaderUrl: { type: String, default: '' }
  },
  data() {
    const initFrom =
      typeof this.initialDateFilter?.from === 'number' ? this.initialDateFilter.from : null
    const initTo = typeof this.initialDateFilter?.to === 'number' ? this.initialDateFilter.to : null
    return {
      bootLoaderDone: false,
      origin: '',
      // Границы фильтра как строки полей: дата (обязательна) + время (необязательно).
      // Пустое время = 00:00. Источник истины — эти строки; ms выводится в computed.
      fromDate: msToLocalDate(initFrom),
      fromTime: msToLocalTime(initFrom),
      toDate: msToLocalDate(initTo),
      toTime: msToLocalTime(initTo),
      dateFilterSaving: false,
      dateFilterError: '',
      activeTab: 'overview',
      activeSection: 'monitoring',
      tabs: sbpHomeTabs(),
      sections: sbpHomeSections(),
      requestsFilters: sbpRequestsFilters(),
      webhooksFilters: sbpWebhooksFilters(),
      requestsFilter: 'all',
      webhooksFilter: 'all',
      liveMode: false,
      now: Date.now(),
      lastUpdated: { analytics: 0, requests: 0, webhooks: 0 },
      // Снимок сохранённых настроек (из SSR) — только для индикатора статуса в шапке.
      // Редактирование настроек перенесено на страницу настроек проекта (/web/admin).
      pluginSettings: Array.isArray(this.initialPluginSettings) ? this.initialPluginSettings : [],
      analytics: null,
      requests: [],
      webhooks: [],
      searchValue: '',
      searchedQuery: '',
      searchResult: null,
      // Универсальная форма «Создать запрос»: ключ выбранной операции и её значения.
      // Дефолт — первая операция каталога; SSR-пропсы webhook'ов прорастают в форму.
      ...buildInitialRequestState({
        webhookUrl: this.webhookUrl,
        webhookUrlLavatop: this.webhookUrlLavatop
      }),
      // GC-форма: отдельное состояние с точечными путями (`params.user.email`).
      // Инициализируется пустым — `buildInitialRequestState` всегда даёт не-GC
      // дефолт (первый элемент статического каталога — LifePay.createBill),
      // заполняется при выборе GC-операции через `onChangeOperationKey`.
      // Значения всегда строки: `<input>`/`<select>`/`<textarea>` отдают string,
      // конверсия в number/boolean/JSON делается в `buildArgsObject` (mixin).
      gcArgsValues: {},
      gcErrors: {},
      requestResult: null,
      requestLoading: false,
      refreshTimer: null,
      tickTimer: null,
      rawModal: null,
      invites: [],
      grants: [],
      accessError: '',
      inviteModal: null
    }
  },
  computed: {
    // Base URL = хост (читается на фронте) + путь до создания счёта (из config через проп).
    baseUrl() {
      if (!this.origin) return ''
      return `${this.origin}${this.baseUrlPath}`
    },
    // Границы в Unix ms, выведенные из строк полей. Пустое время → 00:00.
    fromMs() {
      return localPartsToMs(this.fromDate, this.fromTime)
    },
    toMs() {
      return localPartsToMs(this.toDate, this.toTime)
    },
    hasActiveFilter() {
      return this.fromMs !== null || this.toMs !== null
    },
    periodLabel() {
      return sbpPeriodLabel(this.fromMs, this.toMs)
    },
    visibleTabs() {
      return this.tabs.filter((t) => !t.adminOnly || this.isAdmin)
    },
    // Первичные разделы навигации (admin-only фильтруется по роли).
    visibleSections() {
      return this.sections.filter((s) => !s.adminOnly || this.isAdmin)
    },
    // Вторичные вкладки активного раздела.
    secondaryTabs() {
      return this.visibleTabs.filter((t) => t.group === this.activeSection)
    },
    configChips() {
      return sbpPluginConfigChips(this.pluginSettings)
    },
    allConfigured() {
      return this.configChips.every((c) => c.set)
    },
    missingConfig() {
      return this.configChips.filter((c) => !c.set).map((c) => c.label)
    },
    filteredRequests() {
      return sbpFilterRequests(this.requests, this.requestsFilter)
    },
    filteredWebhooks() {
      return sbpFilterWebhooks(this.webhooks, this.webhooksFilter)
    },
    recentRequestsPreview() {
      return this.requests.slice(0, 5)
    },
    recentWebhooksPreview() {
      return this.webhooks.slice(0, 5)
    },
    requestCounts() {
      return sbpRequestCounts(this.requests)
    },
    webhookCounts() {
      return sbpWebhookCounts(this.webhooks)
    }
  },
  watch: {
    activeTab(newVal) {
      this.loadForTab(newVal)
    },
    liveMode(on) {
      if (on) this.startAutoRefresh()
      else this.stopAutoRefresh()
    },
    hasActiveFilter(active) {
      // При активном фильтре авто-обновление недоступно: выключаем Live,
      // watcher liveMode сам остановит таймер (без дублирующего stopAutoRefresh).
      if (active && this.liveMode) this.liveMode = false
    }
  },
  mounted() {
    this.loadQrcodeLib()
    if (typeof window !== 'undefined') {
      this.origin = window.location.origin
      if (window.hideAppLoader) window.hideAppLoader()
      if (window.bootLoaderComplete) {
        this.bootLoaderDone = true
        this.onReady()
      } else {
        window.addEventListener('bootloader-complete', this.handleBootComplete)
      }
    }
    this.tickTimer = setInterval(() => {
      this.now = Date.now()
    }, TICK_INTERVAL_MS)
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('bootloader-complete', this.handleBootComplete)
    }
    this.stopAutoRefresh()
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  },
  methods: {
    handleBootComplete() {
      this.bootLoaderDone = true
      this.onReady()
    },
    onReady() {
      this.loadForTab(this.activeTab)
      this.applyUrlParams()
    },
    setTab(id) {
      const normalizedId = sbpNormalizeTabId(id)
      // Вкладку можно открыть и из другого раздела (например, ссылки «Все» на
      // «Обзоре» или переход на «Создать запрос»): подтягиваем активный раздел.
      this.activeSection = sbpSectionForTab(normalizedId)
      this.activeTab = normalizedId
    },
    setSection(id) {
      if (this.activeSection === id) return
      this.activeSection = id
      // При смене раздела выбираем первую видимую вкладку раздела, если текущая
      // в него не входит (иначе журнальные данные грузятся не для того экрана).
      const tabs = this.visibleTabs.filter((t) => t.group === id)
      if (tabs.length > 0 && !tabs.some((t) => t.id === this.activeTab)) {
        this.activeTab = tabs[0].id
      }
    },
    onAppLayoutAnimationEnd(e) {
      if (e?.animationName === 'crt-power-on') {
        e.target?.classList?.add('app-layout-appeared')
      }
    },
    openChatiumLink() {
      if (typeof window !== 'undefined') {
        window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
      }
    },
    copyText(text) {
      try {
        if (navigator && navigator.clipboard) navigator.clipboard.writeText(text)
      } catch (_e) {
        // ignore
      }
    },
    onPluginSettingsUpdate(next) {
      this.pluginSettings = Array.isArray(next) ? next : []
    }
  }
}
</script>
