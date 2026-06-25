<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="01" text="журнал захвата" style="margin-bottom: 12px" />
    <p class="screen-desc">
      Единая точка захвата. Всё новое — мысли, письма, события сервисов — попадает сюда, а отсюда вы
      направляете это дальше по системе.
    </p>

    <!-- BPM pipeline -->
    <div class="pipeline">
      <span class="pipe-step active"><span class="pipe-dot"></span>Захват</span>
      <span class="pipe-arr">→</span>
      <span class="pipe-step">Уточнение</span>
      <span class="pipe-arr">→</span>
      <span class="pipe-step">Организация</span>
      <span class="pipe-arr">→</span>
      <span class="pipe-step">Действие</span>
    </div>

    <!-- Поле захвата -->
    <div class="capture-row">
      <input
        v-model="captureText"
        placeholder="Записать событие, мысль или ссылку…"
        class="capture-input"
        @keydown.enter="capture"
      />
      <button class="capture-btn" @click="capture">Записать</button>
    </div>

    <!-- Список входящих -->
    <div class="inbox-header">
      <DecoRail />
      <span class="inbox-title">Входящие — обработать</span>
      <span class="inbox-count">{{ journal.length }}</span>
    </div>

    <div class="journal-list">
      <div v-for="j in journal" :key="j.id" class="journal-item">
        <div class="journal-item-main">
          <SourceChip :src="j.src" />
          <span class="journal-txt">{{ j.txt }}</span>
          <span class="journal-time">{{ j.time }}</span>
        </div>
        <div class="journal-actions">
          <span class="action-btn" @click="toTask(j)">→ Задача</span>
          <span class="action-btn" @click="toProject(j)">→ Проект</span>
          <span class="action-btn" @click="toFinance(j)">→ Финансы</span>
          <div style="flex: 1"></div>
          <span class="archive-btn" @click="archive(j)">Архив</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { store, go } from '../../shared/store'
import { uid } from '../../shared/format'
import { seedJournal } from '../../shared/mocks/journal.mock'
import SourceChip from '../../components/ui/SourceChip.vue'
import DecoLabel from '../../components/ui/DecoLabel.vue'
import DecoRail from '../../components/ui/DecoRail.vue'
import type { JournalEntry } from '../../shared/types/journal'

const captureText = ref('')
const journal = ref([...seedJournal])

function capture() {
  if (!captureText.value.trim()) return
  journal.value.unshift({
    id: uid(),
    src: 'МЫ',
    txt: captureText.value,
    time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  })
  captureText.value = ''
}

function toTask(j: JournalEntry) {
  archive(j)
  go('tasks')
}
function toProject(j: JournalEntry) {
  archive(j)
  go('para')
}
function toFinance(j: JournalEntry) {
  archive(j)
  go('finances')
}
function archive(j: JournalEntry) {
  journal.value = journal.value.filter((x) => x.id !== j.id)
}
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 860px;
  margin: 0 auto;
}
.screen-desc {
  font-size: 13px;
  color: var(--fg2);
  line-height: 1.55;
  max-width: 600px;
  margin-bottom: 16px;
}
.pipeline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
  font-size: 11.5px;
  font-weight: 600;
}
.pipe-step {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--fg2);
  background: var(--surface-2);
  border-radius: 3px;
  padding: 6px 11px;
}
.pipe-step.active {
  color: var(--accent);
  background: var(--accent-soft);
}
.pipe-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
.pipe-arr {
  color: var(--fg3);
}
.capture-row {
  display: flex;
  gap: 9px;
  margin-bottom: 24px;
}
.capture-input {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg);
  padding: 12px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.12s;
}
.capture-input:focus {
  border-color: var(--accent-line);
}
.capture-btn {
  background: var(--accent);
  color: var(--accent-fg);
  border: none;
  border-radius: 4px;
  padding: 0 20px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
  transition: filter 0.12s;
}
.capture-btn:hover {
  filter: brightness(1.08);
}
.inbox-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.inbox-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.inbox-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 3px;
  padding: 2px 8px;
}
.journal-list {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  overflow: hidden;
}
.journal-item {
  padding: 15px 17px;
  border-bottom: 1px solid var(--line);
  transition: background 0.1s;
}
.journal-item:hover {
  background: var(--surface-2);
}
.journal-item-main {
  display: flex;
  align-items: center;
  gap: 11px;
}
.journal-txt {
  font-size: 13.5px;
  color: var(--fg);
  flex: 1;
  min-width: 0;
}
.journal-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
  flex: none;
}
.journal-actions {
  display: flex;
  gap: 7px;
  margin-top: 11px;
  flex-wrap: wrap;
}
.action-btn {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--fg2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 5px 11px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.action-btn:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
.archive-btn {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--fg3);
  padding: 5px 9px;
  cursor: pointer;
}
.archive-btn:hover {
  color: var(--fg2);
}
</style>
