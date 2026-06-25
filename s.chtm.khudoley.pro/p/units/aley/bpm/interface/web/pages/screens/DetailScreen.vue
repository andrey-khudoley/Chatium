<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <!-- Навигация -->
    <div class="detail-nav">
      <button class="back-btn" @click="closeDetail()">
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <polyline points="8.5,3 4.5,7 8.5,11" />
        </svg>
        Назад
      </button>
      <span class="crumb">{{ crumb }}</span>
      <div style="flex: 1"></div>
      <button v-if="!store.editMode" class="edit-btn" @click="store.editMode = true">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M11.5 2.5l2 2L6 12l-2.6.6L4 10z" />
        </svg>
        Редактировать
      </button>
      <PrimaryButton v-else @click="store.editMode = false">
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="2.5,7.5 5.5,10.5 11.5,3.5" />
        </svg>
        Готово
      </PrimaryButton>
    </div>

    <!-- Детали задачи -->
    <template v-if="store.detailType === 'task' && task">
      <div data-role="homegrid" class="detail-grid">
        <div class="left-col">
          <div class="card">
            <div class="status-row">
              <Pill
                :label="statusLabel(task.status)"
                :color="statusColor(task.status)"
                :bg="'var(--surface-2)'"
                dot
              />
              <Pill
                :label="prLabel(task.pr) + ' приоритет'"
                :color="'var(--fg2)'"
                :bg="'transparent'"
                :dot="true"
              />
            </div>
            <template v-if="!store.editMode">
              <h2 class="detail-title">{{ task.title }}</h2>
              <p class="detail-desc">{{ task.desc || 'Описание не заполнено.' }}</p>
            </template>
            <template v-else>
              <input v-model="task.title" class="edit-input title-input" />
              <textarea v-model="task.desc" class="edit-textarea" rows="4"></textarea>
            </template>
          </div>

          <div v-if="task.checklist.length" class="card">
            <div class="card-header">
              <span class="card-title">Чек-лист</span>
              <span class="mono-sm"
                >{{ task.checklist.filter((c) => c.done).length }}/{{ task.checklist.length }}</span
              >
            </div>
            <div v-for="c in task.checklist" :key="c.id" class="checklist-row">
              <Checkbox v-model="c.done" />
              <span :class="['check-text', { done: c.done }]">{{ c.text }}</span>
            </div>
          </div>
        </div>

        <div class="right-col">
          <div class="card">
            <span class="card-title">Свойства</span>
            <div class="props-list">
              <div class="prop-row">
                <span class="prop-label">Проект</span
                ><span class="prop-val">{{ task.project || '—' }}</span>
              </div>
              <div class="prop-row">
                <span class="prop-label">Клиент</span
                ><span class="prop-val">{{ task.client || '—' }}</span>
              </div>
              <div class="prop-row">
                <span class="prop-label">Контекст</span
                ><span class="prop-val mono">{{ task.context || '—' }}</span>
              </div>
              <div class="prop-row">
                <span class="prop-label">Срок</span
                ><span class="prop-val mono">{{ task.due || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Детали библиотечного элемента -->
    <template v-else-if="store.detailType === 'library' && libItem">
      <div class="card">
        <div class="lib-head">
          <span class="type-badge">{{ typeLabel(libItem.type) }}</span>
          <span class="status-badge" :style="{ color: libStatusColor(libItem.status) }">{{
            libStatusLabel(libItem.status)
          }}</span>
        </div>
        <h2 class="detail-title">{{ libItem.title }}</h2>
        <p class="detail-author">{{ libItem.author }}</p>
        <ProgressBar
          v-if="libItem.status === 'reading'"
          :value="libItem.progress"
          style="margin-top: 14px"
        />
        <p class="detail-desc" style="margin-top: 14px">{{ libItem.summary }}</p>
        <div class="lib-tags" style="margin-top: 12px">
          <span v-for="tag in libItem.tags" :key="tag" class="tag-chip">#{{ tag }}</span>
        </div>
      </div>
    </template>

    <!-- Заглушка для других типов -->
    <template v-else>
      <div class="card empty-state">
        <span>Объект не найден или тип не поддерживается в стадии 1</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, closeDetail } from '../../shared/store'
import {
  statusColor,
  statusLabel,
  prColor,
  prLabel,
  typeLabel,
  libStatusColor,
  libStatusLabel
} from '../../shared/format'
import Pill from '../../components/ui/Pill.vue'
import Checkbox from '../../components/ui/Checkbox.vue'
import ProgressBar from '../../components/ui/ProgressBar.vue'
import PrimaryButton from '../../components/ui/PrimaryButton.vue'

const task = computed(() =>
  store.detailType === 'task' ? store.tasks.find((t) => t.id === store.detailId) : null
)
const libItem = computed(() =>
  store.detailType === 'library' ? store.lib.find((l) => l.id === store.detailId) : null
)
const crumb = computed(() => {
  if (task.value) return `ЗАДАЧИ / ${task.value.title}`
  if (libItem.value) return `БИБЛИОТЕКА / ${libItem.value.title}`
  return 'ДЕТАЛИ'
})
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
.detail-nav {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 18px;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 13px;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s;
}
.back-btn:hover {
  border-color: var(--line-2);
}
.crumb {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--fg3);
}
.edit-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 13px;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.edit-btn:hover {
  border-color: var(--accent-line);
  color: var(--accent);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1.62fr 1fr;
  gap: 16px;
  align-items: start;
}
.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: var(--pad);
}
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 13px;
  flex-wrap: wrap;
}
.detail-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg);
  line-height: 1.25;
  margin-top: 4px;
}
.detail-desc {
  font-size: 13.5px;
  color: var(--fg2);
  line-height: 1.6;
  margin-top: 12px;
}
.detail-author {
  font-size: 13px;
  color: var(--fg2);
  margin-top: 6px;
}
.edit-input {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg);
  padding: 11px 13px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
}
.edit-input:focus {
  border-color: var(--accent-line);
}
.edit-textarea {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg);
  padding: 9px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  resize: vertical;
  line-height: 1.55;
  margin-top: 11px;
}
.edit-textarea:focus {
  border-color: var(--accent-line);
}
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.mono-sm {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.checklist-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
}
.check-text {
  font-size: 13.5px;
  font-weight: 500;
  flex: 1;
  color: var(--fg);
}
.check-text.done {
  text-decoration: line-through;
  color: var(--fg3);
}
.props-list {
  margin-top: 6px;
}
.prop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.prop-label {
  font-size: 12px;
  color: var(--fg2);
}
.prop-val {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fg);
}
.prop-val.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
.lib-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
}
.type-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 3px 8px;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}
.lib-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag-chip {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--fg3);
  background: var(--surface-2);
  border-radius: 3px;
  padding: 3px 8px;
}
.empty-state {
  color: var(--fg3);
  text-align: center;
  padding: 48px;
}
</style>
