<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DcBpmAnalyticsPanel,
  DcBpmExecutionTimeline,
  DcBpmHeaderControls,
  DcBpmInstanceDetail,
  DcBpmMetricGrid,
  DcBpmProcessInbox,
  DcBpmSidebar,
  DcCommandDeck,
  DcPageHeader,
  DcScenarioChecklist
} from '../components'
import { DcAppShell, DcContent, DcMain } from '../layout'
import { bpmCopy, type BpmLocale } from '../shared/bpmI18n'
import { getBpmChartBars } from '../shared/bpmDemoData'
import { buildScenarioDemoState } from '../shared/bpmScenarioDemo'
import { BPM_DESIGN_SCENARIOS } from '../shared/bpmScenarios'
import { getStoredSidebarCollapsed } from '../shared/sidebarStorage'
import { getStoredTheme, setStoredTheme } from '../shared/themeStorage'
import { getDefaultThemePresetId, getThemePresetById } from '../shared/themeCatalog'
import type { BpmChartMode, BpmInstanceRow } from '../shared/bpmTypes'
import type { CommandAction } from '../shared/bpmVueExportedTypes'

const props = defineProps<{
  projectTitle: string
  homeUrl: string
  loginUrl: string
  adminUrl: string
  testsUrl: string
  designUrl: string
  clientsDialogsUrl: string
  scenarioCount: number
}>()

const fallbackScenario = BPM_DESIGN_SCENARIOS[0]
if (!fallbackScenario) {
  throw new Error('BPM_DESIGN_SCENARIOS is empty')
}

const sidebarCollapsed = ref(getStoredSidebarCollapsed())
const sidebarOpen = ref(false)
const locale = ref<BpmLocale>('ru')
const storedTheme = getStoredTheme()
const selectedPresetId = ref(getDefaultThemePresetId(storedTheme ?? 'light'))
const selectedInstanceId = ref('WF-3021')
const activeTableMode = ref<'compact' | 'standard' | 'audit'>('compact')
const activeChartMode = ref<BpmChartMode['id']>('throughput')

const currentTheme = computed(() => getThemePresetById(selectedPresetId.value)?.mode ?? 'light')
const ui = computed(() => bpmCopy[locale.value])
const breadcrumbs = computed(() => [ui.value.home])
const demoState = computed(() => buildScenarioDemoState(fallbackScenario, locale.value))
const chartBars = computed(() => getBpmChartBars(activeChartMode.value))

const fallbackInstance: BpmInstanceRow = {
  id: 'WF-0000',
  process: 'No process',
  stage: 'No stage',
  status: 'No status',
  sla: '--:--',
  owner: 'Unknown',
  risk: 'neutral'
}

const selectedInstance = computed(
  () =>
    demoState.value.rows.find((row) => row.id === selectedInstanceId.value) ??
    demoState.value.rows[0] ??
    fallbackInstance
)

const navVisibilityContext = computed(() => ({ userRole: 'admin' }))

const tableModeOptions = computed(() => [
  { id: 'compact' as const, label: ui.value.tableCompact },
  { id: 'standard' as const, label: ui.value.tableStandard },
  { id: 'audit' as const, label: ui.value.tableAudit }
])

const featuredScenarios = computed(() =>
  BPM_DESIGN_SCENARIOS.filter((scenario) => scenario.slug !== 'home-page')
    .slice(0, 6)
    .map((scenario) => ({
      ...scenario,
      url: `${props.designUrl.replace(/\/$/, '')}/${scenario.slug}`
    }))
)

const commandActions = computed<CommandAction[]>(() => [
  {
    id: 'home-cmd-1',
    title: locale.value === 'ru' ? 'Эскалировать SLA' : 'Escalate SLA',
    description:
      locale.value === 'ru'
        ? 'Передать критический инстанс владельцу смены и зафиксировать checkpoint.'
        : 'Route the critical instance to the shift owner and commit a checkpoint.',
    tone: 'danger'
  },
  {
    id: 'home-cmd-2',
    title: locale.value === 'ru' ? 'Сбалансировать очередь' : 'Rebalance queue',
    description:
      locale.value === 'ru'
        ? 'Перераспределить активные кейсы по загрузке команд.'
        : 'Redistribute active cases by team load.',
    tone: 'warning'
  },
  {
    id: 'home-cmd-3',
    title: locale.value === 'ru' ? 'Запустить автоматизацию' : 'Trigger automation',
    description:
      locale.value === 'ru'
        ? 'Поднять fallback job для заблокированных задач.'
        : 'Start a fallback job for blocked work.',
    tone: 'info'
  }
])

function closeSidebar() {
  sidebarOpen.value = false
}

function toggleSidebarMobile() {
  sidebarOpen.value = !sidebarOpen.value
}

function setLocale(next: BpmLocale) {
  locale.value = next
}

function onThemeChange(id: string) {
  const mode = id === 'dark' ? 'dark' : 'light'
  setStoredTheme(mode)
  selectedPresetId.value = getDefaultThemePresetId(mode)
}
</script>

<template>
  <DcAppShell
    :theme="currentTheme"
    :theme-preset-id="selectedPresetId"
    :ready="true"
    :sidebar-collapsed="sidebarCollapsed"
    :sidebar-open="sidebarOpen"
    @close-sidebar="closeSidebar"
  >
    <template #sidebar>
      <DcBpmSidebar
        active-id="home"
        :home-url="homeUrl"
        :login-url="loginUrl"
        :admin-url="adminUrl"
        :tests-url="testsUrl"
        :design-url="designUrl"
        :clients-dialogs-url="clientsDialogsUrl"
        :scenario-count="scenarioCount"
        :visibility-context="navVisibilityContext"
        :theme="currentTheme"
        logo-text="NeSo BPM"
        user-name="Ops Lead"
        user-role="Control plane"
        :collapsed="sidebarCollapsed"
        :mobile-open="sidebarOpen"
        @close="closeSidebar"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />
    </template>

    <template #header>
      <DcPageHeader
        :theme="currentTheme"
        :title="projectTitle"
        :breadcrumbs="breadcrumbs"
        :show-menu-toggle="true"
        @menu-toggle="toggleSidebarMobile"
      >
        <template #actions>
          <DcBpmHeaderControls
            :language-label="ui.navLanguage"
            :theme-label="ui.navTheme"
            :locale="locale"
            :theme-options="[]"
            :selected-theme-id="currentTheme"
            theme-variant="light-dark"
            :open-index-label="ui.openLanding"
            :index-url="designUrl"
            :theme-light-aria-label="ui.themeLight"
            :theme-dark-aria-label="ui.themeDark"
            @change-locale="setLocale"
            @change-theme="onThemeChange"
          />
        </template>
      </DcPageHeader>
    </template>

    <DcMain>
      <DcContent>
        <div class="bpm-home-page">
          <section class="bpm-home-page__topline">
            <div class="bpm-home-page__brief">
              <p class="bpm-home-page__kicker">{{ ui.workspace }}</p>
              <h2>{{ projectTitle }}</h2>
              <p>{{ ui.heroDescription }}</p>
              <div class="bpm-home-page__actions">
                <a class="bpm-home-page__action bpm-home-page__action--primary" :href="designUrl">
                  <i class="fas fa-compass" aria-hidden="true"></i>
                  {{ ui.featuredScenariosTitle }}
                </a>
                <a class="bpm-home-page__action" :href="clientsDialogsUrl">
                  <i class="fas fa-comments" aria-hidden="true"></i>
                  Клиентские диалоги
                </a>
              </div>
            </div>

            <DcBpmMetricGrid :metrics="demoState.metrics" />
          </section>

          <section class="bpm-home-page__grid bpm-home-page__grid--primary">
            <DcBpmProcessInbox
              :title="ui.processCenterTitle"
              :hint="ui.processCenterHint"
              :filters="[ui.filterAll, ui.filterAtRisk, ui.filterBlocked, ui.filterMyZone]"
              :saved-view-label="ui.savedViews"
              :saved-views="[ui.viewOps, ui.viewTeam, ui.viewAudit]"
              :table-mode-label="ui.tableMode"
              :table-modes="tableModeOptions"
              :active-table-mode="activeTableMode"
              :columns="{
                instance: ui.colInstance,
                process: ui.colProcess,
                stage: ui.colStage,
                status: ui.colStatus,
                sla: ui.colSla,
                owner: ui.colOwner
              }"
              :rows="demoState.rows"
              :selected-instance-id="selectedInstanceId"
              @change-table-mode="activeTableMode = $event"
              @select-instance="selectedInstanceId = $event"
            />

            <DcBpmInstanceDetail
              :title="ui.detailTitle"
              :hint="ui.detailHint"
              :labels="{
                instance: ui.colInstance,
                stage: ui.detailStage,
                owner: ui.detailOwner,
                escalation: ui.detailEscalation,
                rule: ui.detailRule,
                action: ui.detailAction
              }"
              :instance="selectedInstance"
              escalation-value="11m"
              rule-text="IF SLA < 15m THEN route_shift_owner"
              action-text="Confirm owner, trigger notification and publish checkpoint"
              :timeline="demoState.detailTimeline"
            />
          </section>

          <section class="bpm-home-page__grid bpm-home-page__grid--secondary">
            <DcBpmAnalyticsPanel
              :title="ui.analyticsTitle"
              :hint="ui.analyticsHint"
              :chart-mode-label="ui.chartMode"
              :chart-modes="demoState.chartModes"
              :active-mode="activeChartMode"
              :bars="chartBars"
              bottleneck-title="Operational bottlenecks"
              bottleneck-hint="Constraints that need owner attention"
              :bottlenecks="demoState.bottlenecks"
              @change-mode="activeChartMode = $event"
            />

            <DcBpmExecutionTimeline
              :title="ui.timelineTitle"
              :hint="ui.timelineHint"
              :events="demoState.timeline"
            />
          </section>

          <section class="bpm-home-page__grid bpm-home-page__grid--bottom">
            <DcCommandDeck
              title="Next best actions"
              subtitle="Operator-grade commands for the current control window"
              :actions="commandActions"
            />

            <DcScenarioChecklist title="Операционный чек-лист" :items="demoState.checklist" />
          </section>

          <section class="bpm-home-page__scenarios">
            <div class="bpm-home-page__section-head">
              <div>
                <p class="bpm-home-page__kicker">Design scenarios</p>
                <h2>{{ ui.featuredScenariosTitle }}</h2>
              </div>
              <a :href="designUrl">Открыть каталог</a>
            </div>

            <div class="bpm-home-page__scenario-grid">
              <a
                v-for="scenario in featuredScenarios"
                :key="scenario.slug"
                :href="scenario.url"
                class="bpm-home-page__scenario-card"
                :class="`layout-${scenario.layout}`"
              >
                <span class="bpm-home-page__scenario-type">{{ scenario.layout }}</span>
                <h3>{{ scenario.title }}</h3>
                <p>{{ scenario.description }}</p>
                <span class="bpm-home-page__scenario-link">
                  Открыть
                  <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </span>
              </a>
            </div>
          </section>
        </div>
      </DcContent>
    </DcMain>
  </DcAppShell>
</template>

<style scoped>
.bpm-home-page {
  display: grid;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.bpm-home-page__topline {
  display: grid;
  grid-template-columns: minmax(320px, 0.62fr) minmax(0, 1.38fr);
  gap: 12px;
  align-items: stretch;
}

.bpm-home-page__brief {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-sm);
}

.bpm-home-page__kicker {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.68rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

.bpm-home-page__brief h2,
.bpm-home-page__section-head h2 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.16rem, 1.6vw, 1.55rem);
  font-weight: 850;
  letter-spacing: 0;
}

.bpm-home-page__brief p:not(.bpm-home-page__kicker) {
  margin: 8px 0 0;
  max-width: 720px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.5;
}

.bpm-home-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.bpm-home-page__action,
.bpm-home-page__section-head a {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.76rem;
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.bpm-home-page__action--primary {
  color: var(--accent-contrast);
  border-color: color-mix(in srgb, var(--accent) 72%, transparent);
  background: var(--accent);
}

.bpm-home-page__action:hover,
.bpm-home-page__section-head a:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}

.bpm-home-page__action--primary:hover {
  color: var(--accent-contrast);
  background: var(--accent-strong);
}

.bpm-home-page__grid {
  display: grid;
  gap: 12px;
}

.bpm-home-page__grid--primary {
  grid-template-columns: minmax(0, 1.34fr) minmax(330px, 0.66fr);
}

.bpm-home-page__grid--secondary {
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.82fr);
}

.bpm-home-page__grid--bottom {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.58fr);
}

.bpm-home-page__scenarios {
  display: grid;
  gap: 10px;
}

.bpm-home-page__section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.bpm-home-page__scenario-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.bpm-home-page__scenario-card {
  min-width: 0;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  color: inherit;
  text-decoration: none;
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-xs);
}

.bpm-home-page__scenario-card:hover {
  border-color: var(--border-accent);
  transform: translateY(-1px);
}

.bpm-home-page__scenario-type {
  color: var(--text-tertiary);
  font-size: 0.65rem;
  text-transform: uppercase;
}

.bpm-home-page__scenario-card h3 {
  margin: 8px 0 0;
  font-size: 0.86rem;
  line-height: 1.25;
}

.bpm-home-page__scenario-card p {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 0.74rem;
  line-height: 1.4;
}

.bpm-home-page__scenario-link {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
}

.bpm-home-page__scenario-card.layout-war-room {
  border-top-color: var(--status-danger);
}

.bpm-home-page__scenario-card.layout-approval-lab {
  border-top-color: var(--status-info);
}

.bpm-home-page__scenario-card.layout-operations-hub {
  border-top-color: var(--status-success);
}

.bpm-home-page__scenario-card.layout-risk-console {
  border-top-color: var(--status-warning);
}

.bpm-home-page__scenario-card.layout-delivery-studio,
.bpm-home-page__scenario-card.layout-executive-deck {
  border-top-color: var(--accent);
}

@media (max-width: 1440px) {
  .bpm-home-page__scenario-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .bpm-home-page__topline,
  .bpm-home-page__grid--primary,
  .bpm-home-page__grid--secondary,
  .bpm-home-page__grid--bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .bpm-home-page__scenario-grid {
    grid-template-columns: 1fr;
  }

  .bpm-home-page__section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
