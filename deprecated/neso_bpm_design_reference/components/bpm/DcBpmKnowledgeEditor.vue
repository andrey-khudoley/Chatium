<script setup lang="ts">
import type { BpmEditorMode } from '../../shared/bpmTypes'
import DcBpmPanel from './DcBpmPanel.vue'

const props = defineProps<{
  title: string
  hint: string
  linkLabel?: string
  linkHref?: string
  modes: BpmEditorMode[]
  activeMode: BpmEditorMode['id']
  markdownValue: string
}>()

const emit = defineEmits<{
  changeMode: [mode: BpmEditorMode['id']]
  updateMarkdown: [value: string]
}>()

function onModeClick(mode: BpmEditorMode['id']) {
  emit('changeMode', mode)
}

function onMarkdownInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('updateMarkdown', target.value)
}
</script>

<template>
  <DcBpmPanel :title="title" :hint="hint" :link-label="linkLabel" :link-href="linkHref">
    <div class="dc-bpm-knowledge-editor__toolbar">
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="dc-pill"
        :class="{ active: activeMode === mode.id }"
        @click="onModeClick(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="dc-bpm-knowledge-editor__layout" :class="`mode-${activeMode}`">
      <textarea
        v-if="activeMode !== 'wysiwyg'"
        class="dc-bpm-knowledge-editor__markdown"
        :value="markdownValue"
        spellcheck="false"
        @input="onMarkdownInput"
      ></textarea>

      <div
        v-if="activeMode !== 'markdown'"
        class="dc-bpm-knowledge-editor__wysiwyg"
        contenteditable="true"
      >
        <h3>Workflow playbook</h3>
        <p>Owner confirms SLA impact and acknowledges escalation path.</p>
        <ul>
          <li>Notify role: <strong>Finance Approver</strong></li>
          <li>Fallback route: <strong>Manual review queue</strong></li>
          <li>Auto action: <strong>Push to incident channel</strong></li>
        </ul>
      </div>
    </div>
  </DcBpmPanel>
</template>

<style scoped>
.dc-bpm-knowledge-editor__toolbar {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  padding: 6px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 76%, transparent);
}

.dc-pill {
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
  color: var(--text-secondary);
  font-size: 0.68rem;
  letter-spacing: 0.02em;
}

.dc-pill.active {
  color: var(--text-primary);
  border-color: var(--border-accent);
  background: color-mix(in srgb, var(--accent-soft) 78%, transparent);
  box-shadow: var(--focus-ring);
}

.dc-bpm-knowledge-editor__layout {
  display: grid;
  gap: 8px;
}

.dc-bpm-knowledge-editor__layout.mode-split {
  grid-template-columns: 1fr 1fr;
}

.dc-bpm-knowledge-editor__markdown,
.dc-bpm-knowledge-editor__wysiwyg {
  min-height: 220px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 82%, transparent);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 10px;
}

.dc-bpm-knowledge-editor__markdown {
  resize: vertical;
}

.dc-bpm-knowledge-editor__wysiwyg {
  font-family: var(--font-sans);
  font-size: 0.76rem;
  overflow: auto;
}

.dc-bpm-knowledge-editor__wysiwyg h3 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 0.96rem;
}

.dc-bpm-knowledge-editor__wysiwyg p {
  margin: 0 0 8px;
}

.dc-bpm-knowledge-editor__wysiwyg ul {
  margin: 0;
  padding-left: 18px;
}

@media (max-width: 980px) {
  .dc-bpm-knowledge-editor__layout.mode-split {
    grid-template-columns: 1fr;
  }
}
</style>
