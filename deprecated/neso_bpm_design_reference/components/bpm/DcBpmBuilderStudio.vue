<script setup lang="ts">
import type { BpmAutomationJob, BpmRule } from '../../shared/bpmTypes'
import DcBpmPanel from './DcBpmPanel.vue'

defineProps<{
  title: string
  hint: string
  flowTitle: string
  ruleTitle: string
  automationTitle: string
  rules: BpmRule[]
  jobs: BpmAutomationJob[]
}>()
</script>

<template>
  <DcBpmPanel :title="title" :hint="hint">
    <div class="dc-bpm-builder-studio">
      <div class="dc-bpm-builder-studio__block">
        <p class="dc-bpm-builder-studio__title">{{ flowTitle }}</p>
        <div class="dc-bpm-builder-studio__flow-map">
          <div class="dc-bpm-builder-studio__flow-node">Trigger</div>
          <div class="dc-bpm-builder-studio__flow-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="dc-bpm-builder-studio__flow-node">Rules Gate</div>
          <div class="dc-bpm-builder-studio__flow-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="dc-bpm-builder-studio__flow-node">Task Queue</div>
          <div class="dc-bpm-builder-studio__flow-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="dc-bpm-builder-studio__flow-node">Closure</div>
        </div>
      </div>

      <div class="dc-bpm-builder-studio__block">
        <p class="dc-bpm-builder-studio__title">{{ ruleTitle }}</p>
        <ul class="dc-bpm-builder-studio__list">
          <li v-for="rule in rules" :key="rule.name" :class="`state-${rule.state}`">
            <span class="mono">{{ rule.name }}</span>
            <span>{{ rule.action }}</span>
          </li>
        </ul>
      </div>

      <div class="dc-bpm-builder-studio__block">
        <p class="dc-bpm-builder-studio__title">{{ automationTitle }}</p>
        <ul class="dc-bpm-builder-studio__list">
          <li v-for="job in jobs" :key="job.id" :class="`state-${job.state}`">
            <span class="mono">{{ job.id }}</span>
            <span>{{ job.title }}</span>
          </li>
        </ul>
      </div>
    </div>
  </DcBpmPanel>
</template>

<style scoped>
.dc-bpm-builder-studio {
  display: grid;
  gap: 8px;
}

.dc-bpm-builder-studio__block {
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
}

.dc-bpm-builder-studio__title {
  margin: 0 0 8px;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dc-bpm-builder-studio__flow-map {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  align-items: center;
}

.dc-bpm-builder-studio__flow-node {
  min-height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--accent-soft) 62%, transparent);
  display: grid;
  place-items: center;
  font-size: 0.66rem;
  text-align: center;
  padding: 4px;
}

.dc-bpm-builder-studio__flow-arrow {
  display: grid;
  place-items: center;
  color: var(--text-tertiary);
  font-size: 0.66rem;
}

.dc-bpm-builder-studio__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 5px;
}

.dc-bpm-builder-studio__list li {
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-xs);
  padding: 6px 7px;
  display: grid;
  gap: 2px;
  font-size: 0.7rem;
  background: color-mix(in srgb, var(--surface-2) 76%, transparent);
}

.dc-bpm-builder-studio__list li.state-critical,
.dc-bpm-builder-studio__list li.state-running {
  border-color: color-mix(in srgb, var(--status-warning) 44%, var(--border-soft));
}

.dc-bpm-builder-studio__list li.state-done {
  border-color: color-mix(in srgb, var(--status-success) 44%, var(--border-soft));
}

.mono {
  font-family: var(--font-mono);
}

@media (max-width: 980px) {
  .dc-bpm-builder-studio__flow-map {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .dc-bpm-builder-studio__flow-arrow {
    transform: rotate(90deg);
  }
}
</style>
