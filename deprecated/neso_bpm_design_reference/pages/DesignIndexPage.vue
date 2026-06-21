<script setup lang="ts">
import { computed, ref } from 'vue'
import { DcThemeGlobalStyles } from '../components'
import type { BpmScenarioLayout } from '../shared/bpmScenarios'

interface ScenarioLink {
  slug: string
  title: string
  description: string
  objective: string
  tags: string[]
  theme: 'dark' | 'light'
  presetId: string
  layout: BpmScenarioLayout
  url: string
}

const props = defineProps<{
  homeUrl: string
  loginUrl: string
  adminUrl: string
  testsUrl: string
  scenarios: ScenarioLink[]
}>()

const query = ref('')
const themeFilter = ref<'all' | 'dark' | 'light'>('all')
const layoutFilter = ref<'all' | BpmScenarioLayout>('all')

const layoutOptions = computed(() =>
  Array.from(new Set(props.scenarios.map((scenario) => scenario.layout))).sort()
)

const visibleScenarios = computed(() => {
  const q = query.value.trim().toLowerCase()

  return props.scenarios.filter((scenario) => {
    if (themeFilter.value !== 'all' && scenario.theme !== themeFilter.value) return false
    if (layoutFilter.value !== 'all' && scenario.layout !== layoutFilter.value) return false
    if (!q) return true

    return (
      scenario.slug.toLowerCase().includes(q) ||
      scenario.title.toLowerCase().includes(q) ||
      scenario.description.toLowerCase().includes(q) ||
      scenario.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })
})
</script>

<template>
  <DcThemeGlobalStyles theme="light" theme-preset-id="sunrise-leaf" />

  <div class="bpm-design-index">
    <header class="bpm-design-index__header">
      <div class="bpm-design-index__title">
        <p class="bpm-design-index__kicker">BPM design catalog</p>
        <h1>Сценарии рабочего интерфейса</h1>
        <p>
          Выберите готовую компоновку под конкретную операционную ситуацию: SLA, approvals,
          dispatch, risk, delivery или client desk.
        </p>
      </div>

      <nav class="bpm-design-index__nav" aria-label="Project navigation">
        <a :href="homeUrl"><i class="fas fa-house" aria-hidden="true"></i>Главная</a>
        <a :href="adminUrl"><i class="fas fa-shield-halved" aria-hidden="true"></i>Админка</a>
        <a :href="testsUrl"><i class="fas fa-vial" aria-hidden="true"></i>Тесты</a>
        <a :href="loginUrl"><i class="fas fa-right-to-bracket" aria-hidden="true"></i>Вход</a>
      </nav>
    </header>

    <section class="bpm-design-index__controls" aria-label="Scenario filters">
      <label class="bpm-design-index__search">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input v-model="query" type="text" placeholder="Название, тег или slug" />
      </label>

      <div class="bpm-design-index__segments" aria-label="Theme filter">
        <button
          type="button"
          :class="{ active: themeFilter === 'all' }"
          @click="themeFilter = 'all'"
        >
          All
        </button>
        <button
          type="button"
          :class="{ active: themeFilter === 'light' }"
          @click="themeFilter = 'light'"
        >
          Light
        </button>
        <button
          type="button"
          :class="{ active: themeFilter === 'dark' }"
          @click="themeFilter = 'dark'"
        >
          Dark
        </button>
      </div>

      <div class="bpm-design-index__layouts" aria-label="Layout filter">
        <button
          type="button"
          :class="{ active: layoutFilter === 'all' }"
          @click="layoutFilter = 'all'"
        >
          Все layouts
        </button>
        <button
          v-for="layout in layoutOptions"
          :key="layout"
          type="button"
          :class="{ active: layoutFilter === layout }"
          @click="layoutFilter = layout"
        >
          {{ layout }}
        </button>
      </div>

      <span class="bpm-design-index__counter">
        {{ visibleScenarios.length }} / {{ scenarios.length }}
      </span>
    </section>

    <section class="bpm-design-index__grid">
      <a
        v-for="scenario in visibleScenarios"
        :key="scenario.slug"
        :href="scenario.url"
        class="bpm-design-index__card"
        :class="[`layout-${scenario.layout}`, `theme-${scenario.theme}`]"
      >
        <span class="bpm-design-index__card-label">{{ scenario.layout }}</span>
        <h2>{{ scenario.title }}</h2>
        <p class="bpm-design-index__desc">{{ scenario.description }}</p>
        <p class="bpm-design-index__objective">{{ scenario.objective }}</p>

        <div class="bpm-design-index__tags">
          <span v-for="tag in scenario.tags" :key="tag">{{ tag }}</span>
        </div>

        <div class="bpm-design-index__card-footer">
          <span>{{ scenario.theme }} · {{ scenario.presetId }}</span>
          <strong>
            Открыть
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
          </strong>
        </div>
      </a>
    </section>
  </div>
</template>

<style scoped>
.bpm-design-index {
  max-width: 1480px;
  margin: 0 auto;
  padding: 18px;
  display: grid;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.bpm-design-index__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: 14px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-sm);
}

.bpm-design-index__title {
  min-width: 0;
}

.bpm-design-index__kicker {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.bpm-design-index__header h1 {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 2vw, 1.95rem);
  font-weight: 850;
  letter-spacing: 0;
}

.bpm-design-index__header p:not(.bpm-design-index__kicker) {
  margin: 8px 0 0;
  max-width: 760px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  line-height: 1.5;
}

.bpm-design-index__nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.bpm-design-index__nav a {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
  font-size: 0.76rem;
}

.bpm-design-index__nav a:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}

.bpm-design-index__controls {
  display: grid;
  grid-template-columns: minmax(240px, 360px) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface-1) 82%, transparent);
}

.bpm-design-index__search {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
}

.bpm-design-index__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.82rem;
}

.bpm-design-index__segments,
.bpm-design-index__layouts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bpm-design-index__segments {
  padding: 4px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.bpm-design-index__segments button,
.bpm-design-index__layouts button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.bpm-design-index__layouts button {
  border-color: var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 72%, transparent);
}

.bpm-design-index__segments button.active,
.bpm-design-index__layouts button.active {
  color: var(--text-primary);
  border-color: var(--border-accent);
  background: color-mix(in srgb, var(--accent-soft) 82%, transparent);
}

.bpm-design-index__counter {
  color: var(--text-tertiary);
  font-size: 0.76rem;
  white-space: nowrap;
}

.bpm-design-index__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.bpm-design-index__card {
  min-width: 0;
  min-height: 238px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-top: 3px solid var(--accent);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-xs);
}

.bpm-design-index__card:hover {
  border-color: var(--border-accent);
  border-top-color: var(--accent);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.bpm-design-index__card-label {
  color: var(--text-tertiary);
  font-size: 0.66rem;
  text-transform: uppercase;
}

.bpm-design-index__card h2 {
  margin: 8px 0 0;
  font-size: 0.98rem;
  line-height: 1.25;
}

.bpm-design-index__desc,
.bpm-design-index__objective {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 0.76rem;
  line-height: 1.45;
}

.bpm-design-index__objective {
  color: var(--text-primary);
}

.bpm-design-index__tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bpm-design-index__tags span {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.66rem;
  background: color-mix(in srgb, var(--surface-3) 76%, transparent);
}

.bpm-design-index__card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  color: var(--text-tertiary);
  font-size: 0.7rem;
}

.bpm-design-index__card-footer strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 0.74rem;
}

.bpm-design-index__card.layout-war-room {
  border-top-color: var(--status-danger);
}

.bpm-design-index__card.layout-approval-lab,
.bpm-design-index__card.layout-client-desk {
  border-top-color: var(--status-info);
}

.bpm-design-index__card.layout-operations-hub {
  border-top-color: var(--status-success);
}

.bpm-design-index__card.layout-risk-console {
  border-top-color: var(--status-warning);
}

@media (max-width: 1280px) {
  .bpm-design-index__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bpm-design-index__controls {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .bpm-design-index {
    padding: 12px;
  }

  .bpm-design-index__header,
  .bpm-design-index__grid {
    grid-template-columns: 1fr;
  }

  .bpm-design-index__nav {
    justify-content: flex-start;
  }
}
</style>
