<script setup lang="ts">
import { computed } from 'vue'
import {
  DcBpmBuilderStudio,
  DcBpmExecutionTimeline,
  DcBpmMetricGrid,
  DcScenarioWidgetGrid,
  DcThemeGlobalStyles
} from '../components'
import { bpmCopy } from '../shared/bpmI18n'
import {
  getBpmAutomationJobs,
  getBpmExecutionTimeline,
  getBpmMetrics,
  getBpmRules
} from '../shared/bpmDemoData'
import type { ScenarioWidget } from '../shared/bpmScenarios'

interface LayerCard {
  label: string
  value: string
  hint: string
}

interface SettingEntry {
  key: string
  value: string
}

const props = defineProps<{
  projectTitle: string
  homeUrl: string
  loginUrl: string
  testsUrl: string
  designUrl: string
  scenariosTotal: number
  layerCards: LayerCard[]
  settings: SettingEntry[]
}>()

const ui = computed(() => bpmCopy.ru)
const metrics = computed(() => getBpmMetrics(ui.value))
const rules = computed(() => getBpmRules('ru'))
const jobs = computed(() => getBpmAutomationJobs('ru'))
const timeline = computed(() => getBpmExecutionTimeline('ru'))
const widgets = computed<ScenarioWidget[]>(() => [
  {
    id: 'admin-1',
    label: 'Design scenarios',
    value: String(props.scenariosTotal),
    delta: '+30+',
    tone: 'info'
  },
  { id: 'admin-2', label: 'Data layers', value: '3', delta: 'stable', tone: 'success' },
  { id: 'admin-3', label: 'Reusable sets', value: 'design_2', delta: 'imported', tone: 'warning' },
  { id: 'admin-4', label: 'Project root', value: 'bpm', delta: '/p/units/neso', tone: 'danger' }
])
</script>

<template>
  <DcThemeGlobalStyles theme="dark" theme-preset-id="forest-night" />

  <div class="bpm-admin-page">
    <header class="bpm-admin-header">
      <div>
        <p class="bpm-admin-header__kicker">Admin Console</p>
        <h1>{{ projectTitle }}</h1>
        <p>
          Админка показывает новый BPM-контур: data-layer, reusable-компоненты, и configuration
          snapshot без legacy CRM UI.
        </p>
      </div>
      <nav>
        <a :href="homeUrl">Главная</a>
        <a :href="testsUrl">Тесты</a>
        <a :href="designUrl">Design</a>
        <a :href="loginUrl">Logout</a>
      </nav>
    </header>

    <section class="bpm-admin-section">
      <DcScenarioWidgetGrid :widgets="widgets" />
    </section>

    <section class="bpm-admin-section">
      <DcBpmMetricGrid :metrics="metrics" />
    </section>

    <section class="bpm-admin-layer-grid">
      <article v-for="card in layerCards" :key="card.label" class="bpm-admin-layer-card">
        <p>{{ card.label }}</p>
        <strong>{{ card.value }}</strong>
        <span>{{ card.hint }}</span>
      </article>
    </section>

    <section class="bpm-admin-section bpm-admin-two-col">
      <DcBpmBuilderStudio
        :title="'Layer orchestration map'"
        :hint="'Mapping of reusable BPM blocks and rollout logic.'"
        :flow-title="ui.flowMap"
        :rule-title="ui.ruleMatrix"
        :automation-title="ui.automationQueue"
        :rules="rules"
        :jobs="jobs"
      />

      <DcBpmExecutionTimeline
        :title="'Migration timeline'"
        :hint="'Ключевые шаги миграции и сборки нового BPM проекта.'"
        :events="timeline"
      />
    </section>

    <section class="bpm-admin-section">
      <h2>Settings snapshot</h2>
      <div class="bpm-admin-settings">
        <div v-for="row in settings" :key="row.key" class="bpm-admin-settings-row">
          <span class="mono">{{ row.key }}</span>
          <span>{{ row.value }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bpm-admin-page {
  max-width: 1360px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.bpm-admin-header {
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 82%, transparent);
}

.bpm-admin-header__kicker {
  margin: 0;
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.bpm-admin-header h1 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 2.2vw, 1.9rem);
}

.bpm-admin-header p {
  margin: 8px 0 0;
  max-width: 760px;
  color: var(--text-secondary);
  font-size: 0.83rem;
  line-height: 1.45;
}

.bpm-admin-header nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-content: flex-start;
}

.bpm-admin-header nav a {
  height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 0 11px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.73rem;
}

.bpm-admin-header nav a:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}

.bpm-admin-section {
  display: grid;
  gap: 8px;
}

.bpm-admin-layer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.bpm-admin-layer-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  padding: 10px;
  background: color-mix(in srgb, var(--surface-2) 82%, transparent);
}

.bpm-admin-layer-card p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.bpm-admin-layer-card strong {
  display: block;
  margin-top: 6px;
  font-size: 1rem;
}

.bpm-admin-layer-card span {
  display: block;
  margin-top: 3px;
  font-size: 0.71rem;
  color: var(--text-secondary);
}

.bpm-admin-two-col {
  grid-template-columns: 1.2fr 1fr;
}

.bpm-admin-section h2 {
  margin: 0;
  font-size: 0.96rem;
}

.bpm-admin-settings {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  overflow: hidden;
}

.bpm-admin-settings-row {
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-soft) 76%, transparent);
  font-size: 0.74rem;
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
}

.bpm-admin-settings-row:last-child {
  border-bottom: none;
}

.mono {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

@media (max-width: 1120px) {
  .bpm-admin-header,
  .bpm-admin-two-col,
  .bpm-admin-layer-grid,
  .bpm-admin-settings-row {
    grid-template-columns: 1fr;
  }
}
</style>
