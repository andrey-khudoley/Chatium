<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DcBpmAnalyticsPanel,
  DcBpmBuilderStudio,
  DcBpmExecutionTimeline,
  DcBpmHeaderControls,
  DcBpmInstanceDetail,
  DcBpmKanbanBoard,
  DcBpmKnowledgeEditor,
  DcBpmMetricGrid,
  DcBpmProcessInbox,
  DcBpmSidebar,
  DcCapacityMatrix,
  DcClientSupportDesk,
  DcCommandDeck,
  DcDecisionTree,
  DcMilestoneRail,
  DcPageHeader,
  DcRiskHeatmap,
  DcRoleStack,
  DcScenarioChecklist,
  DcScenarioHero,
  DcScenarioWidgetGrid,
  DcSlaGauge,
  DcSwimlaneBoard
} from '../components'
import { DcAppShell, DcContent, DcMain } from '../layout'
import { bpmCopy, type BpmLocale } from '../shared/bpmI18n'
import {
  getBpmChartBars,
  getBpmExecutionTimeline,
  getBpmKanbanColumns,
  getBpmMetrics
} from '../shared/bpmDemoData'
import {
  BPM_DESIGN_SCENARIOS,
  getBpmScenarioBySlug,
  type BpmScenarioLayout
} from '../shared/bpmScenarios'
import { getClientSupportDemo } from '../shared/clientSupportDemo'
import { buildScenarioDemoState } from '../shared/bpmScenarioDemo'
import { getStoredSidebarCollapsed } from '../shared/sidebarStorage'
import {
  getDefaultThemePresetId,
  getThemePresetOptions,
  type ThemeMode
} from '../shared/themeCatalog'
import type { BpmChartMode, BpmEditorMode, BpmInstanceRow } from '../shared/bpmTypes'
import type {
  CapacityRow,
  CommandAction,
  DecisionNode,
  MilestoneItem,
  RoleStackItem,
  SwimlaneLane
} from '../shared/bpmVueExportedTypes'

const props = defineProps<{
  scenarioSlug: string
  homeUrl: string
  loginUrl: string
  adminUrl: string
  testsUrl: string
  designIndexUrl: string
  clientsDialogsUrl?: string
  scenarioCount?: number
}>()

const fallbackScenario = BPM_DESIGN_SCENARIOS[0]
if (!fallbackScenario) {
  throw new Error('BPM_DESIGN_SCENARIOS is empty')
}

const locale = ref<BpmLocale>('ru')
const sidebarCollapsed = ref(getStoredSidebarCollapsed())
const sidebarOpen = ref(false)

const activeScenario = computed(() => getBpmScenarioBySlug(props.scenarioSlug) ?? fallbackScenario)
const currentTheme = computed<ThemeMode>(() => activeScenario.value.theme)
const selectedPresetId = ref(activeScenario.value.presetId)

const selectedInstanceId = ref('')
const activeTableMode = ref<'compact' | 'standard' | 'audit'>('compact')
const activeChartMode = ref<BpmChartMode['id']>('throughput')
const editorMode = ref<BpmEditorMode['id']>('split')
const markdownDraft = ref('')

const ui = computed(() => bpmCopy[locale.value])
const demoState = computed(() => buildScenarioDemoState(activeScenario.value, locale.value))

const homePageMetrics = computed(() => getBpmMetrics(ui.value))
const homePageKanbanColumns = computed(() => getBpmKanbanColumns(ui.value))
const homePageTimeline = computed(() => getBpmExecutionTimeline(locale.value))
const homePageFeaturedScenarios = computed(() =>
  BPM_DESIGN_SCENARIOS.filter((s) => s.slug !== 'home-page')
    .slice(0, 6)
    .map((scenario) => ({
      slug: scenario.slug,
      title: scenario.title,
      description: scenario.description,
      url: `${(props.designIndexUrl || '').replace(/\/$/, '')}/${scenario.slug}`
    }))
)

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

const chartBars = computed(() => getBpmChartBars(activeChartMode.value))
const layout = computed<BpmScenarioLayout>(() => activeScenario.value.layout)

const themeControlOptions = computed(() =>
  getThemePresetOptions(currentTheme.value).map((preset) => ({ id: preset.id, label: preset.name }))
)

const tableModeOptions = computed(() => [
  { id: 'compact' as const, label: ui.value.tableCompact },
  { id: 'standard' as const, label: ui.value.tableStandard },
  { id: 'audit' as const, label: ui.value.tableAudit }
])

const editorModes = computed(() => [
  { id: 'markdown' as const, label: ui.value.modeMarkdown },
  { id: 'wysiwyg' as const, label: ui.value.modeWysiwyg },
  { id: 'split' as const, label: ui.value.modeSplit }
])

const scenarioIndex = computed(() =>
  activeScenario.value.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
)

const gaugeValue = computed(() => 58 + (scenarioIndex.value % 39))
const gaugeTrend = computed(() => (scenarioIndex.value % 2 === 0 ? '+4.2%' : '-1.1%'))

const swimlaneLanes = computed<SwimlaneLane[]>(() => {
  const toneMap: Record<string, SwimlaneLane['tone']> = {
    backlog: 'neutral',
    active: 'info',
    review: 'warning',
    done: 'success'
  }

  return demoState.value.kanbanColumns.map((column) => ({
    id: column.id,
    title: column.title,
    tone: toneMap[column.id] ?? 'neutral',
    items: column.cards.map((card, index) => ({
      id: card.id,
      title: card.title,
      owner: card.owner,
      tag: `${activeScenario.value.tags[index % activeScenario.value.tags.length] || 'bpm'}`,
      eta: card.sla
    }))
  }))
})

const decisionNodes = computed<DecisionNode[]>(() =>
  demoState.value.rules.map((rule, index) => ({
    id: `R-${index + 1}`,
    condition: rule.name,
    action: rule.action,
    owner: index % 2 === 0 ? 'Flow Owner' : 'Ops Lead',
    severity: rule.state === 'critical' ? 'critical' : index % 3 === 0 ? 'high' : 'medium'
  }))
)

const heatmapX = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain']
const heatmapY = ['Minor', 'Moderate', 'Major', 'Severe', 'Critical']

const heatmapMatrix = computed(() =>
  heatmapY.map((_, yIndex) =>
    heatmapX.map((_, xIndex) => {
      const value = 1 + ((scenarioIndex.value + xIndex * 2 + yIndex * 3) % 5)
      return Math.max(1, Math.min(5, value))
    })
  )
)

const capacityRows = computed<CapacityRow[]>(() => {
  const base = scenarioIndex.value % 10

  return [
    { team: 'Ops core', load: 62 + base, capacity: 90, focus: 'Intake & triage' },
    { team: 'Compliance', load: 48 + (base % 9), capacity: 70, focus: 'Gate approvals' },
    { team: 'QA / Audit', load: 34 + (base % 8), capacity: 58, focus: 'Quality checks' },
    { team: 'Automation', load: 41 + (base % 7), capacity: 64, focus: 'Rules & fallback jobs' }
  ]
})

const milestones = computed<MilestoneItem[]>(() => {
  const source = demoState.value.detailTimeline
  const states: MilestoneItem['state'][] = ['done', 'active', 'next', 'risk']

  return source.slice(0, 4).map((point, index) => ({
    id: `M-${index + 1}`,
    title: point.label,
    date: point.time,
    owner: index % 2 === 0 ? 'Process Owner' : 'Ops Lead',
    state: states[index % states.length] || 'next'
  }))
})

const roleStack = computed<RoleStackItem[]>(() => [
  { id: 'role-1', name: selectedInstance.value.owner, role: 'Case owner', state: 'online' },
  { id: 'role-2', name: 'A. Smirnov', role: 'Ops reviewer', state: 'busy' },
  { id: 'role-3', name: 'D. Carter', role: 'Compliance lead', state: 'online' },
  { id: 'role-4', name: 'M. Lee', role: 'Escalation manager', state: 'offline' }
])

const commandActions = computed<CommandAction[]>(() => [
  {
    id: 'cmd-1',
    title: 'Escalate critical path',
    description: 'Запустить цепочку эскалации и уведомить ответственных.',
    tone: 'danger'
  },
  {
    id: 'cmd-2',
    title: 'Rebalance queue',
    description: 'Перераспределить инстансы между owner по текущей загрузке.',
    tone: 'warning'
  },
  {
    id: 'cmd-3',
    title: 'Trigger automation',
    description: 'Запустить fallback automation для блокированных задач.',
    tone: 'info'
  },
  {
    id: 'cmd-4',
    title: 'Publish checkpoint',
    description: 'Зафиксировать контрольную точку и отправить summary.',
    tone: 'success'
  }
])
const clientSupportDemo = computed(() => getClientSupportDemo(locale.value))

const breadcrumbs = computed(() => [ui.value.home, 'Design', activeScenario.value.title])

function syncPresetFromScenario() {
  selectedPresetId.value = activeScenario.value.presetId
}
syncPresetFromScenario()
watch(() => activeScenario.value.slug, syncPresetFromScenario)

function syncPresetFromTheme() {
  if (!themeControlOptions.value.some((item) => item.id === selectedPresetId.value)) {
    selectedPresetId.value = getDefaultThemePresetId(currentTheme.value)
  }
}
syncPresetFromTheme()
watch(
  () => [currentTheme.value, themeControlOptions.value.map((item) => item.id).join('|')],
  syncPresetFromTheme
)

function syncStateFromDemo() {
  const next = demoState.value
  selectedInstanceId.value = next.selectedInstanceId
  activeTableMode.value = next.tableMode
  activeChartMode.value = next.activeChartMode
  editorMode.value = next.editorMode
  markdownDraft.value = next.markdownDraft
}
syncStateFromDemo()
watch(() => [activeScenario.value.slug, locale.value], syncStateFromDemo)

function closeSidebar() {
  sidebarOpen.value = false
}

function toggleSidebarMobile() {
  sidebarOpen.value = !sidebarOpen.value
}

function onThemeChange(id: string) {
  selectedPresetId.value = id
}

function setLocale(next: BpmLocale) {
  locale.value = next
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
        active-id="admin-design"
        :home-url="homeUrl"
        :login-url="loginUrl"
        :admin-url="adminUrl"
        :tests-url="testsUrl"
        :design-url="designIndexUrl"
        :clients-dialogs-url="clientsDialogsUrl"
        :scenario-count="scenarioCount ?? 0"
        :visibility-context="{ userRole: 'admin' }"
        :theme="currentTheme"
        logo-text="NeSo BPM"
        user-name="Scenario Operator"
        user-role="Design playground"
        :collapsed="sidebarCollapsed"
        :mobile-open="sidebarOpen"
        @close="closeSidebar"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />
    </template>

    <template #header>
      <DcPageHeader
        :theme="currentTheme"
        :title="activeScenario.title"
        :breadcrumbs="breadcrumbs"
        :show-menu-toggle="true"
        @menu-toggle="toggleSidebarMobile"
      >
        <template #actions>
          <DcBpmHeaderControls
            :language-label="ui.navLanguage"
            :theme-label="ui.navTheme"
            :locale="locale"
            :theme-options="themeControlOptions"
            :selected-theme-id="selectedPresetId"
            :open-index-label="'Design index'"
            :index-url="designIndexUrl"
            @change-locale="setLocale"
            @change-theme="onThemeChange"
          />
        </template>
      </DcPageHeader>
    </template>

    <DcMain>
      <DcContent>
        <div class="bpm-design-scenario-page" :class="`layout-${layout}`">
          <section
            id="section-overview"
            class="bpm-design-scenario-page__section bpm-design-scenario-page__overview"
          >
            <DcScenarioHero
              :slug="activeScenario.slug"
              :title="activeScenario.title"
              :description="activeScenario.description"
              :objective="activeScenario.objective"
              :tags="activeScenario.tags"
            />

            <div class="bpm-design-scenario-page__overview-side">
              <DcScenarioWidgetGrid :widgets="demoState.widgets" />

              <nav class="bpm-design-scenario-page__links" aria-label="Scenario actions">
                <a :href="homeUrl"><i class="fas fa-house" aria-hidden="true"></i>Главная</a>
                <a :href="adminUrl"
                  ><i class="fas fa-shield-halved" aria-hidden="true"></i>Админка</a
                >
                <a :href="testsUrl"><i class="fas fa-vial" aria-hidden="true"></i>Тесты</a>
                <a :href="designIndexUrl">
                  <i class="fas fa-arrow-left" aria-hidden="true"></i>Каталог
                </a>
              </nav>
            </div>
          </section>

          <template v-if="layout === 'home-page'">
            <section id="section-home-metrics" class="bpm-design-scenario-page__section">
              <DcBpmMetricGrid :metrics="homePageMetrics" />
            </section>

            <section
              id="section-home-grid"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcBpmKanbanBoard
                :title="ui.kanbanTitle"
                :hint="ui.kanbanHint"
                :columns="homePageKanbanColumns"
              />

              <DcBpmExecutionTimeline
                :title="ui.timelineTitle"
                :hint="ui.timelineHint"
                :events="homePageTimeline"
              />
            </section>

            <section id="section-home-scenarios" class="bpm-design-scenario-page__section">
              <h2>{{ ui.featuredScenariosTitle }}</h2>
              <div class="bpm-home-scenarios">
                <a
                  v-for="scenario in homePageFeaturedScenarios"
                  :key="scenario.slug"
                  :href="scenario.url"
                  class="bpm-home-scenario-card"
                >
                  <h3>{{ scenario.title }}</h3>
                  <p>{{ scenario.description }}</p>
                  <span>{{ scenario.slug }}</span>
                </a>
              </div>
            </section>
          </template>

          <template v-else-if="layout === 'war-room'">
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcSlaGauge
                title="SLA pulse"
                subtitle="Live confidence under critical load"
                :value="gaugeValue"
                :trend="gaugeTrend"
                :description="`Scenario: ${activeScenario.title}`"
              />

              <DcBpmExecutionTimeline
                :title="ui.timelineTitle"
                :hint="ui.timelineHint"
                :events="demoState.timeline"
              />
            </section>

            <section id="section-controls" class="bpm-design-scenario-page__section">
              <DcSwimlaneBoard
                title="Incident swimlanes"
                subtitle="Cross-team queues by response lane"
                :lanes="swimlaneLanes"
              />
            </section>

            <section
              id="section-knowledge"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcMilestoneRail
                title="Response checkpoints"
                subtitle="Milestones and ownership for the active incident"
                :milestones="milestones"
              />

              <DcCommandDeck
                title="Response command deck"
                subtitle="Fast actions for the operator"
                :actions="commandActions"
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
                escalation-value="08m"
                rule-text="IF incident_severity >= high THEN force escalation"
                action-text="Bridge ops + legal + product response streams"
                :timeline="demoState.detailTimeline"
              />

              <DcScenarioChecklist
                title="Incident containment checklist"
                :items="demoState.checklist"
              />
            </section>
          </template>

          <template v-else-if="layout === 'approval-lab'">
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcBpmProcessInbox
                :title="ui.processCenterTitle"
                :hint="ui.processCenterHint"
                :link-label="ui.sectionDocs"
                :link-href="designIndexUrl"
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
                escalation-value="16m"
                rule-text="IF amount > 10k THEN assign_senior_reviewer"
                action-text="Collect legal context and commit approval checkpoint"
                :timeline="demoState.detailTimeline"
              />
            </section>

            <section
              id="section-controls"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcDecisionTree
                title="Approval decision graph"
                subtitle="Conditions and routing actions"
                :nodes="decisionNodes"
              />

              <DcBpmBuilderStudio
                :title="ui.builderTitle"
                :hint="ui.builderHint"
                :flow-title="ui.flowMap"
                :rule-title="ui.ruleMatrix"
                :automation-title="ui.automationQueue"
                :rules="demoState.rules"
                :jobs="demoState.jobs"
              />
            </section>

            <section
              id="section-knowledge"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcRoleStack
                title="Review roles stack"
                subtitle="Current owners and approvers"
                :roles="roleStack"
              />

              <DcBpmKnowledgeEditor
                :title="ui.editorTitle"
                :hint="ui.editorHint"
                :link-label="ui.sectionOpen"
                :link-href="designIndexUrl"
                :modes="editorModes"
                :active-mode="editorMode"
                :markdown-value="markdownDraft"
                @change-mode="editorMode = $event"
                @update-markdown="markdownDraft = $event"
              />

              <DcScenarioChecklist
                title="Approval rollout checklist"
                :items="demoState.checklist"
              />
            </section>
          </template>

          <template v-else-if="layout === 'operations-hub'">
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcCapacityMatrix
                title="Team capacity matrix"
                subtitle="Load pressure by operational unit"
                :rows="capacityRows"
              />

              <DcBpmKanbanBoard
                :title="ui.kanbanTitle"
                :hint="ui.kanbanHint"
                :columns="demoState.kanbanColumns"
              />
            </section>

            <section
              id="section-controls"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
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

              <DcMilestoneRail
                title="Shift milestones"
                subtitle="Key checkpoints for queue balancing"
                :milestones="milestones"
              />
            </section>

            <section
              id="section-knowledge"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcCommandDeck
                title="Ops quick commands"
                subtitle="Batch actions for queue operations"
                :actions="commandActions"
              />

              <DcRoleStack
                title="Dispatcher roles"
                subtitle="Owners by route and shift"
                :roles="roleStack"
              />
            </section>
          </template>

          <template v-else-if="layout === 'risk-console'">
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcRiskHeatmap
                title="Risk heatmap"
                subtitle="Probability × impact score grid"
                :x-labels="heatmapX"
                :y-labels="heatmapY"
                :matrix="heatmapMatrix"
              />

              <DcBpmAnalyticsPanel
                :title="ui.analyticsTitle"
                :hint="ui.analyticsHint"
                :chart-mode-label="ui.chartMode"
                :chart-modes="demoState.chartModes"
                :active-mode="activeChartMode"
                :bars="chartBars"
                bottleneck-title="Risk bottlenecks"
                bottleneck-hint="Top constraints by stage and control domain"
                :bottlenecks="demoState.bottlenecks"
                @change-mode="activeChartMode = $event"
              />
            </section>

            <section
              id="section-controls"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcDecisionTree
                title="Mitigation decision chain"
                subtitle="Rules that drive escalation and controls"
                :nodes="decisionNodes"
              />

              <DcBpmExecutionTimeline
                :title="ui.timelineTitle"
                :hint="ui.timelineHint"
                :events="demoState.timeline"
              />
            </section>

            <section
              id="section-knowledge"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcBpmBuilderStudio
                :title="ui.builderTitle"
                :hint="ui.builderHint"
                :flow-title="ui.flowMap"
                :rule-title="ui.ruleMatrix"
                :automation-title="ui.automationQueue"
                :rules="demoState.rules"
                :jobs="demoState.jobs"
              />

              <DcScenarioChecklist title="Control checklist" :items="demoState.checklist" />
            </section>
          </template>

          <template v-else-if="layout === 'delivery-studio'">
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcMilestoneRail
                title="Delivery milestones"
                subtitle="Flow checkpoints before release"
                :milestones="milestones"
              />

              <DcSlaGauge
                title="Delivery confidence"
                subtitle="Readiness pulse for deployment"
                :value="gaugeValue"
                :trend="gaugeTrend"
                :description="'Signals from quality gates and rollout workflow'"
              />
            </section>

            <section
              id="section-controls"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcBpmKanbanBoard
                :title="ui.kanbanTitle"
                :hint="ui.kanbanHint"
                :columns="demoState.kanbanColumns"
              />

              <DcCapacityMatrix
                title="Delivery capacity"
                subtitle="Execution bandwidth across squads"
                :rows="capacityRows"
              />
            </section>

            <section
              id="section-knowledge"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcBpmKnowledgeEditor
                :title="ui.editorTitle"
                :hint="ui.editorHint"
                :link-label="ui.sectionOpen"
                :link-href="designIndexUrl"
                :modes="editorModes"
                :active-mode="editorMode"
                :markdown-value="markdownDraft"
                @change-mode="editorMode = $event"
                @update-markdown="markdownDraft = $event"
              />

              <DcCommandDeck
                title="Delivery actions"
                subtitle="Fast controls for release manager"
                :actions="commandActions"
              />
            </section>
          </template>

          <template v-else-if="layout === 'client-desk'">
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__section--full"
            >
              <DcClientSupportDesk
                title="Клиентские диалоги"
                subtitle="Операционная переписка: очередь диалогов, окно сообщений, карточка клиента"
                :threads="clientSupportDemo.threads"
                :messages="clientSupportDemo.messages"
                :profiles="clientSupportDemo.profiles"
              />
            </section>
          </template>

          <template v-else>
            <section
              id="section-workspace"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcBpmAnalyticsPanel
                :title="ui.analyticsTitle"
                :hint="ui.analyticsHint"
                :chart-mode-label="ui.chartMode"
                :chart-modes="demoState.chartModes"
                :active-mode="activeChartMode"
                :bars="chartBars"
                bottleneck-title="Executive bottlenecks"
                bottleneck-hint="Top constraints and throughput blockers"
                :bottlenecks="demoState.bottlenecks"
                @change-mode="activeChartMode = $event"
              />

              <DcSlaGauge
                title="Portfolio SLA"
                subtitle="Executive confidence across active flows"
                :value="gaugeValue"
                :trend="gaugeTrend"
                :description="'Snapshot for leadership decisions'"
              />
            </section>

            <section
              id="section-controls"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split"
            >
              <DcCapacityMatrix
                title="Portfolio capacity"
                subtitle="Load/throughput by strategic stream"
                :rows="capacityRows"
              />

              <DcRiskHeatmap
                title="Portfolio risk map"
                subtitle="Impact concentration by stream"
                :x-labels="heatmapX"
                :y-labels="heatmapY"
                :matrix="heatmapMatrix"
              />
            </section>

            <section
              id="section-knowledge"
              class="bpm-design-scenario-page__section bpm-design-scenario-page__split bpm-design-scenario-page__split--triple"
            >
              <DcMilestoneRail
                title="Strategic checkpoints"
                subtitle="Roadmap milestones and owners"
                :milestones="milestones"
              />

              <DcRoleStack
                title="Leadership stack"
                subtitle="Decision ownership map"
                :roles="roleStack"
              />

              <DcCommandDeck
                title="Executive actions"
                subtitle="Portfolio-level decisions"
                :actions="commandActions"
              />
            </section>
          </template>
        </div>
      </DcContent>
    </DcMain>
  </DcAppShell>
</template>

<style scoped>
.bpm-design-scenario-page {
  display: grid;
  gap: 12px;
}

.bpm-design-scenario-page__section {
  display: grid;
  gap: 12px;
}

.bpm-design-scenario-page__overview {
  grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.08fr);
  align-items: stretch;
}

.bpm-design-scenario-page__overview-side {
  min-width: 0;
  display: grid;
  gap: 10px;
  align-content: start;
}

.bpm-design-scenario-page__section--full {
  grid-template-columns: 1fr;
}

.bpm-design-scenario-page__split {
  grid-template-columns: 1.2fr 1fr;
}

.bpm-design-scenario-page__split--triple {
  grid-template-columns: 1.24fr 0.9fr 0.9fr;
}

.bpm-design-scenario-page__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bpm-design-scenario-page__links a {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-decoration: none;
  color: var(--text-secondary);
  padding: 0 12px;
  font-size: 0.74rem;
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.bpm-design-scenario-page__links a:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}

.layout-war-room :deep(.dc-scenario-hero) {
  border-color: color-mix(in srgb, var(--status-danger) 46%, var(--border-soft));
}

.layout-risk-console :deep(.dc-scenario-hero) {
  border-color: color-mix(in srgb, var(--status-warning) 46%, var(--border-soft));
}

.layout-executive-deck :deep(.dc-scenario-hero) {
  border-color: color-mix(in srgb, var(--status-info) 46%, var(--border-soft));
}

.layout-client-desk :deep(.dc-scenario-hero) {
  border-color: color-mix(in srgb, var(--status-info) 46%, var(--border-soft));
}

#section-home-scenarios h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.bpm-home-scenarios {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.bpm-home-scenario-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  padding: 10px;
  text-decoration: none;
  color: inherit;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-2) 82%, transparent);
}

.bpm-home-scenario-card h3 {
  margin: 0;
  font-size: 0.83rem;
}

.bpm-home-scenario-card p {
  margin: 6px 0 0;
  font-size: 0.73rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.bpm-home-scenario-card span {
  display: inline-flex;
  margin-top: 8px;
  height: 21px;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  color: var(--text-tertiary);
  font-size: 0.65rem;
  font-family: var(--font-mono);
}

@media (max-width: 1280px) {
  .bpm-design-scenario-page__overview,
  .bpm-design-scenario-page__split,
  .bpm-design-scenario-page__split--triple {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1080px) {
  .bpm-home-scenarios {
    grid-template-columns: 1fr;
  }
}
</style>
