<script setup lang="ts">
import type { BpmInstanceRow, BpmTimelinePoint } from '../../shared/bpmTypes'
import DcBpmPanel from './DcBpmPanel.vue'

const props = defineProps<{
  title: string
  hint: string
  labels: {
    instance: string
    stage: string
    owner: string
    escalation: string
    rule: string
    action: string
  }
  instance: BpmInstanceRow
  escalationValue: string
  ruleText: string
  actionText: string
  timeline: BpmTimelinePoint[]
}>()
</script>

<template>
  <DcBpmPanel :title="title" :hint="hint">
    <div class="dc-bpm-instance-detail__grid">
      <article class="dc-bpm-instance-detail__item">
        <p class="dc-bpm-instance-detail__label">{{ labels.instance }}</p>
        <p class="dc-bpm-instance-detail__value mono">{{ instance.id }}</p>
      </article>
      <article class="dc-bpm-instance-detail__item">
        <p class="dc-bpm-instance-detail__label">{{ labels.stage }}</p>
        <p class="dc-bpm-instance-detail__value">{{ instance.stage }}</p>
      </article>
      <article class="dc-bpm-instance-detail__item">
        <p class="dc-bpm-instance-detail__label">{{ labels.owner }}</p>
        <p class="dc-bpm-instance-detail__value">{{ instance.owner }}</p>
      </article>
      <article class="dc-bpm-instance-detail__item">
        <p class="dc-bpm-instance-detail__label">{{ labels.escalation }}</p>
        <p class="dc-bpm-instance-detail__value mono">{{ escalationValue }}</p>
      </article>
    </div>

    <div class="dc-bpm-instance-detail__note">
      <p class="dc-bpm-instance-detail__label">{{ labels.rule }}</p>
      <p class="dc-bpm-instance-detail__value mono">{{ ruleText }}</p>
    </div>

    <div class="dc-bpm-instance-detail__note">
      <p class="dc-bpm-instance-detail__label">{{ labels.action }}</p>
      <p class="dc-bpm-instance-detail__value">{{ actionText }}</p>
    </div>

    <ul class="dc-bpm-instance-detail__timeline">
      <li v-for="item in timeline" :key="`${item.time}-${item.label}`">
        <span class="mono">{{ item.time }}</span>
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </DcBpmPanel>
</template>

<style scoped>
.dc-bpm-instance-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.dc-bpm-instance-detail__item,
.dc-bpm-instance-detail__note {
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 76%, transparent);
}

.dc-bpm-instance-detail__note {
  margin-bottom: 8px;
}

.dc-bpm-instance-detail__label {
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dc-bpm-instance-detail__value {
  margin: 4px 0 0;
  font-size: 0.76rem;
  color: var(--text-primary);
}

.dc-bpm-instance-detail__timeline {
  margin: 0;
  padding: 8px;
  list-style: none;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  display: grid;
  gap: 6px;
}

.dc-bpm-instance-detail__timeline li {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 6px;
  font-size: 0.72rem;
}

.mono {
  font-family: var(--font-mono);
}
</style>
