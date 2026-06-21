<script setup lang="ts">
import type { BpmExecutionEvent } from '../../shared/bpmTypes'
import DcBpmPanel from './DcBpmPanel.vue'

defineProps<{
  title: string
  hint: string
  events: BpmExecutionEvent[]
}>()
</script>

<template>
  <DcBpmPanel :title="title" :hint="hint">
    <ul class="dc-bpm-execution-timeline">
      <li
        v-for="event in events"
        :key="`${event.time}-${event.text}`"
        :class="`type-${event.type}`"
      >
        <span class="dc-bpm-execution-timeline__time mono">{{ event.time }}</span>
        <span class="dc-bpm-execution-timeline__text">{{ event.text }}</span>
      </li>
    </ul>
  </DcBpmPanel>
</template>

<style scoped>
.dc-bpm-execution-timeline {
  margin: 0;
  padding: 6px 0 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.dc-bpm-execution-timeline li {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 78%, transparent);
  position: relative;
}

.dc-bpm-execution-timeline li::before {
  content: '';
  position: absolute;
  left: 65px;
  top: -8px;
  bottom: -8px;
  width: 1px;
  background: var(--timeline-line);
  opacity: 0.6;
  pointer-events: none;
}

.dc-bpm-execution-timeline li:first-child::before {
  top: 14px;
}

.dc-bpm-execution-timeline li:last-child::before {
  bottom: 14px;
}

.dc-bpm-execution-timeline__time {
  color: var(--text-tertiary);
  font-size: 0.68rem;
}

.dc-bpm-execution-timeline__text {
  font-size: 0.74rem;
}

.dc-bpm-execution-timeline li.type-warning {
  border-color: color-mix(in srgb, var(--status-warning) 42%, var(--border-soft));
}

.dc-bpm-execution-timeline li.type-danger {
  border-color: color-mix(in srgb, var(--status-danger) 42%, var(--border-soft));
}

.dc-bpm-execution-timeline li.type-success {
  border-color: color-mix(in srgb, var(--status-success) 42%, var(--border-soft));
}

.mono {
  font-family: var(--font-mono);
}
</style>
