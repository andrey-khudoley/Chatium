<script setup lang="ts">
import { computed } from 'vue'
import { DcScenarioChecklist, DcScenarioWidgetGrid, DcThemeGlobalStyles } from '../components'
import type { ScenarioChecklistItem, ScenarioWidget } from '../shared/bpmScenarios'

interface TestCheck {
  id: string
  label: string
  state: 'done' | 'active' | 'todo'
  details: string
}

interface TestGroup {
  id: string
  title: string
  checks: TestCheck[]
}

const props = defineProps<{
  homeUrl: string
  adminUrl: string
  designUrl: string
  loginUrl: string
  groups: TestGroup[]
}>()

const allChecks = computed(() => props.groups.flatMap((group) => group.checks))

const widgets = computed<ScenarioWidget[]>(() => {
  const total = allChecks.value.length
  const done = allChecks.value.filter((check) => check.state === 'done').length
  const active = allChecks.value.filter((check) => check.state === 'active').length
  const todo = allChecks.value.filter((check) => check.state === 'todo').length

  return [
    {
      id: 'tests-total',
      label: 'Total checks',
      value: String(total),
      delta: 'snapshot',
      tone: 'info'
    },
    {
      id: 'tests-done',
      label: 'Done',
      value: String(done),
      delta: `${Math.round((done / Math.max(total, 1)) * 100)}%`,
      tone: 'success'
    },
    {
      id: 'tests-active',
      label: 'In progress',
      value: String(active),
      delta: 'follow-up',
      tone: 'warning'
    },
    { id: 'tests-todo', label: 'Pending', value: String(todo), delta: 'next', tone: 'danger' }
  ]
})

function toChecklist(checks: TestCheck[]): ScenarioChecklistItem[] {
  return checks.map((check) => ({
    id: check.id,
    label: check.label,
    state: check.state
  }))
}
</script>

<template>
  <DcThemeGlobalStyles theme="light" theme-preset-id="misty-daybreak" />

  <div class="bpm-tests-page">
    <header class="bpm-tests-header">
      <div>
        <p class="bpm-tests-kicker">System Validation</p>
        <h1>BPM project checks</h1>
        <p>Тестовая страница фиксирует состояние миграции, маршрутов и дизайн-сценариев.</p>
      </div>

      <nav>
        <a :href="homeUrl">Главная</a>
        <a :href="adminUrl">Админка</a>
        <a :href="designUrl">Design</a>
        <a :href="loginUrl">Вход</a>
      </nav>
    </header>

    <DcScenarioWidgetGrid :widgets="widgets" />

    <section class="bpm-tests-groups">
      <article v-for="group in groups" :key="group.id" class="bpm-tests-group-card">
        <DcScenarioChecklist :title="group.title" :items="toChecklist(group.checks)" />

        <ul class="bpm-tests-details">
          <li v-for="check in group.checks" :key="check.id">
            <strong>{{ check.label }}</strong>
            <p>{{ check.details }}</p>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped>
.bpm-tests-page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 10px;
  position: relative;
  z-index: 2;
}

.bpm-tests-header {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 84%, transparent);
}

.bpm-tests-kicker {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.bpm-tests-header h1 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.32rem, 2.2vw, 1.88rem);
}

.bpm-tests-header p {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.bpm-tests-header nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
}

.bpm-tests-header nav a {
  height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.73rem;
}

.bpm-tests-header nav a:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}

.bpm-tests-groups {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bpm-tests-group-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  padding: 9px;
  background: color-mix(in srgb, var(--surface-2) 82%, transparent);
  display: grid;
  gap: 8px;
}

.bpm-tests-details {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.bpm-tests-details li {
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-soft);
  padding: 8px;
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
}

.bpm-tests-details strong {
  font-size: 0.73rem;
}

.bpm-tests-details p {
  margin: 3px 0 0;
  font-size: 0.7rem;
  color: var(--text-secondary);
  line-height: 1.42;
}

@media (max-width: 1040px) {
  .bpm-tests-header,
  .bpm-tests-groups {
    grid-template-columns: 1fr;
  }
}
</style>
