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
    />

    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner" :class="{ ready: bootLoaderDone }">
        <!-- ====== TABS ====== -->
        <nav class="panel-toolbar" aria-label="Разделы и live-режим">
          <div class="panel-tabs" role="tablist">
            <button
              v-for="t in visibleTabs"
              :key="t.id"
              :class="['tab', { active: activeTab === t.id }]"
              :aria-selected="activeTab === t.id"
              role="tab"
              type="button"
              @click="setTab(t.id)"
            >
              <i class="fas" :class="t.icon"></i>
              <span>{{ t.label }}</span>
            </button>
          </div>
          <div class="panel-toolbar-right">
            <label
              class="live-toggle"
              :class="{ on: liveMode }"
              :title="liveMode ? 'Авто-обновление включено' : 'Включить авто-обновление'"
            >
              <input v-model="liveMode" type="checkbox" />
              <span class="live-dot"></span>
              <span class="live-label">LIVE</span>
            </label>
          </div>
        </nav>

        <!-- ====== DATE FILTER (обзор и журналы) ====== -->
        <HomeFilterBar
          v-show="
            activeTab === 'overview' ||
            activeTab === 'requests' ||
            activeTab === 'upstream' ||
            activeTab === 'webhooks'
          "
          :filter="filter"
          :filterSaving="filterSaving"
          :filterValid="filterValid"
          :hasFilter="hasFilter"
          :filterError="filterError"
          @apply="applyFilter"
          @reset="resetFilter"
          @update-field="onFilterField"
        />

        <!-- ====== TAB: OVERVIEW ====== -->
        <HomeOverviewTab
          v-if="activeTab === 'overview'"
          :counts="counts"
          :periodLabel="periodLabel"
          :recentRequestsPreview="recentRequestsPreview"
          :recentUpstreamPreview="recentUpstreamPreview"
          :lastUpdated="lastUpdated"
          :now="now"
          :hasFilter="hasFilter"
          @set-tab="setTab"
        />

        <!-- ====== TAB: REQUESTS ====== -->
        <HomeRequestsTab
          v-show="activeTab === 'requests'"
          :requests="requests"
          :lastUpdatedTs="lastUpdated.requests"
          :now="now"
          :hasFilter="hasFilter"
          @refresh="loadRequests"
          @open-raw="openRaw"
        />

        <!-- ====== TAB: UPSTREAM ====== -->
        <HomeUpstreamTab
          v-show="activeTab === 'upstream'"
          :upstream="upstream"
          :lastUpdatedTs="lastUpdated.upstream"
          :now="now"
          :hasFilter="hasFilter"
          @refresh="loadUpstream"
          @open-raw="openRaw"
        />

        <!-- ====== TAB: WEBHOOKS ====== -->
        <HomeWebhooksTab
          v-show="activeTab === 'webhooks'"
          :webhooks="webhooks"
          :lastUpdatedTs="lastUpdated.webhooks"
          :now="now"
          :hasFilter="hasFilter"
          @refresh="loadWebhooks"
          @reforward="doReforward"
        />

        <!-- ====== TAB: ACCESS (Admin only) ====== -->
        <HomeAccessTab
          v-if="activeTab === 'access' && isAdmin"
          :invites="invites"
          :grants="grants"
          @load-invites="loadInvites"
          @load-grants="loadGrants"
          @open-create-invite="openCreateInvite"
          @revoke-invite="revokeInvite"
          @revoke-grant="revokeGrant"
        />

        <!-- ====== TAB: REQUEST BUILDER ====== -->
        <section v-show="activeTab === 'request-builder'" class="panel-section">
          <header class="panel-section-head">
            <span class="prompt">›</span>
            <h2>Создать запрос</h2>
            <span class="updated-since muted">Имитация внешнего вызова /api/v1/&#123;op&#125;</span>
          </header>
          <RequestTestTab
            :operationsCatalog="operationsCatalog"
            :projectRoot="projectRoot"
            :testValues="testValues"
          />
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" />

    <!-- ====== RAW MODAL ====== -->
    <HomeRawModal v-if="rawModal" :modal="rawModal" @close="closeRaw" @copy="copyText" />

    <!-- ====== CREATE INVITE MODAL ====== -->
    <HomeCreateInviteModal
      v-if="createModal"
      :modal="createModal"
      @close="closeCreateInvite"
      @submit="submitCreateInvite"
      @copy="copyText"
      @update-note="onCreateInviteNote"
    />
  </div>
</template>

<script>
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import RequestTestTab from '../components/RequestTestTab.vue'
import HomeFilterBar from '../components/home/HomeFilterBar.vue'
import HomeOverviewTab from '../components/home/HomeOverviewTab.vue'
import HomeRequestsTab from '../components/home/HomeRequestsTab.vue'
import HomeUpstreamTab from '../components/home/HomeUpstreamTab.vue'
import HomeWebhooksTab from '../components/home/HomeWebhooksTab.vue'
import HomeAccessTab from '../components/home/HomeAccessTab.vue'
import HomeRawModal from '../components/home/HomeRawModal.vue'
import HomeCreateInviteModal from '../components/home/HomeCreateInviteModal.vue'
import { lavatopHomePageMethodsMixin } from './lavatopHomePageMixin'
import { createComponentLogger } from '../shared/logger'
import {
  msToDateTimeParts,
  partsToMs,
  formatDateTime,
  copyText,
  defaultHomeCounts,
  defaultHomeApiUrls
} from '../shared/lavatopHomeFormat'

const REFRESH_INTERVAL_MS = 15000
const TICK_INTERVAL_MS = 5000

const log = createComponentLogger('GatewayHomePage')

export default {
  name: 'GatewayHomePage',
  mixins: [lavatopHomePageMethodsMixin],
  components: {
    Header,
    GlobalGlitch,
    AppFooter,
    RequestTestTab,
    HomeFilterBar,
    HomeOverviewTab,
    HomeRequestsTab,
    HomeUpstreamTab,
    HomeWebhooksTab,
    HomeAccessTab,
    HomeRawModal,
    HomeCreateInviteModal
  },
  props: {
    projectTitle: { type: String, default: 'Lava.Top Gateway / Панель' },
    indexUrl: { type: String, default: '/' },
    profileUrl: { type: String, default: '/' },
    loginUrl: { type: String, default: '/' },
    isAuthenticated: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    adminUrl: { type: String, default: '' },
    testsUrl: { type: String, default: '' },
    // Каталог интеграционных операций для формы «Создать запрос» (SSR-проп).
    operationsCatalog: { type: Array, default: () => [] },
    // Тестовые значения из Heap для кнопок «Подставить» (SSR-проп). Пустые строки = не заданы.
    testValues: { type: Object, default: () => ({ testApiKey: '' }) },
    // Путь проекта от корня воркспэйса (для fetch к /{projectRoot}/api/v1/{op}).
    projectRoot: { type: String, default: 'p/gateways/lavatop' },
    initialDateFilter: {
      type: Object,
      default: () => ({})
    },
    apiUrls: {
      type: Object,
      default: () => defaultHomeApiUrls()
    }
  },
  data() {
    const fromParts = msToDateTimeParts(this.initialDateFilter && this.initialDateFilter.from)
    const toParts = msToDateTimeParts(this.initialDateFilter && this.initialDateFilter.to)
    return {
      bootLoaderDone: false,
      activeTab: 'overview',
      liveMode: false,
      now: Date.now(),
      counts: defaultHomeCounts(),
      requests: [],
      upstream: [],
      webhooks: [],
      lastUpdated: {
        counts: 0,
        requests: 0,
        upstream: 0,
        webhooks: 0
      },
      refreshTimer: null,
      tickTimer: null,
      rawModal: null,
      // Фильтр по дате/времени
      filter: {
        fromDate: fromParts.date,
        fromTime: fromParts.time,
        toDate: toParts.date,
        toTime: toParts.time
      },
      filterSaving: false,
      filterError: '',
      // Доступы
      grants: [],
      invites: [],
      createModal: null
    }
  },
  computed: {
    visibleTabs() {
      const tabs = [
        { id: 'overview', label: 'Обзор', icon: 'fa-chart-line' },
        { id: 'requests', label: 'Входящие', icon: 'fa-list' },
        { id: 'upstream', label: 'К Lava.Top', icon: 'fa-tower-broadcast' },
        { id: 'webhooks', label: 'Вебхуки', icon: 'fa-bell' }
      ]
      if (this.operationsCatalog && this.operationsCatalog.length > 0) {
        tabs.push({ id: 'request-builder', label: 'Создать запрос', icon: 'fa-paper-plane' })
      }
      if (this.isAdmin) {
        tabs.push({ id: 'access', label: 'Доступы', icon: 'fa-user-shield' })
      }
      return tabs
    },
    fromMs() {
      return partsToMs(this.filter.fromDate, this.filter.fromTime, false)
    },
    toMs() {
      return partsToMs(this.filter.toDate, this.filter.toTime, true)
    },
    hasFilter() {
      return this.fromMs !== undefined || this.toMs !== undefined
    },
    filterValid() {
      if (this.fromMs !== undefined && this.toMs !== undefined) {
        return this.fromMs <= this.toMs
      }
      return true
    },
    periodLabel() {
      const f = this.fromMs
      const t = this.toMs
      if (f === undefined && t === undefined) return 'за всё время'
      if (f !== undefined && t !== undefined)
        return `с ${formatDateTime(f)} по ${formatDateTime(t)}`
      if (f !== undefined) return `с ${formatDateTime(f)}`
      return `по ${formatDateTime(t)}`
    },
    recentRequestsPreview() {
      return this.requests.slice(0, 5)
    },
    recentUpstreamPreview() {
      return this.upstream.slice(0, 5)
    }
  },
  watch: {
    liveMode(value) {
      log.info('liveMode toggled', { value })
      this.applyLiveMode()
    },
    activeTab(value) {
      log.info('activeTab changed', { value })
      if (value === 'requests') this.loadRequests()
      else if (value === 'upstream') this.loadUpstream()
      else if (value === 'webhooks') this.loadWebhooks()
      else if (value === 'overview') this.loadCounts()
      else if (value === 'access') {
        this.loadInvites()
        this.loadGrants()
      }
    }
  },
  mounted() {
    log.info('Component mounted')
    if (window.hideAppLoader) window.hideAppLoader()
    const bootReady = !!window.bootLoaderComplete
    if (bootReady) this.onBootComplete()
    else window.addEventListener('bootloader-complete', this.onBootComplete)
    this.tickTimer = setInterval(() => {
      this.now = Date.now()
    }, TICK_INTERVAL_MS)
  },
  beforeUnmount() {
    log.info('beforeUnmount')
    this.stopRefresh()
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    window.removeEventListener('bootloader-complete', this.onBootComplete)
  },
  methods: {
    onBootComplete() {
      this.bootLoaderDone = true
      log.info('Boot complete — initial load')
      this.loadCounts()
      this.loadRequests()
      this.loadUpstream()
      this.loadWebhooks()
    },
    onAppLayoutAnimationEnd(e) {
      if (e.animationName === 'crt-power-on') {
        e.target.classList.add('app-layout-appeared')
      }
    },
    setTab(id) {
      this.activeTab = id
    },
    applyLiveMode() {
      if (this.liveMode) this.startRefresh()
      else this.stopRefresh()
    },
    startRefresh() {
      this.stopRefresh()
      this.refreshTimer = setInterval(() => {
        this.loadCounts()
        if (this.activeTab === 'requests') this.loadRequests()
        if (this.activeTab === 'upstream') this.loadUpstream()
        if (this.activeTab === 'webhooks') this.loadWebhooks()
      }, REFRESH_INTERVAL_MS)
    },
    stopRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },
    onCreateInviteNote(value) {
      if (this.createModal) this.createModal.note = value
    },
    onFilterField(key, value) {
      this.filter[key] = value
    },
    copyText
  }
}
</script>
