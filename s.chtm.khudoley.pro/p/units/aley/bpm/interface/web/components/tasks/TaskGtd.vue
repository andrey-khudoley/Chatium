<template>
  <div data-role="gtd" class="gtd-layout">
    <!-- Левая колонка: проекты + контексты -->
    <div class="gtd-sidebar">
      <div class="gtd-panel">
        <span class="gtd-panel-title">Проекты</span>
        <div class="project-list">
          <div v-for="p in projects" :key="p.id" class="project-item">
            <span class="proj-dot"></span>
            <span class="proj-name">{{ p.name }}</span>
            <span class="proj-count">{{ tasksByProject[p.name] || 0 }}</span>
          </div>
        </div>
      </div>
      <div class="gtd-panel">
        <span class="gtd-panel-title">Контексты</span>
        <div class="contexts">
          <span v-for="ctx in contexts" :key="ctx" class="ctx-chip">{{ ctx }}</span>
        </div>
      </div>
    </div>

    <!-- Правая колонка: входящие -->
    <div class="gtd-inbox">
      <div class="inbox-header">
        <span class="inbox-title">Входящие — обработать</span>
        <span class="inbox-count">{{ inboxTasks.length }}</span>
      </div>
      <div v-for="task in inboxTasks" :key="task.id" class="inbox-row">
        <div class="inbox-check"></div>
        <span class="inbox-title-text">{{ task.title }}</span>
        <button class="inbox-action" @click="assignProject(task)">→ Проект</button>
        <button class="inbox-action" @click="assignToday(task)">→ Сегодня</button>
      </div>
      <div v-if="!inboxTasks.length" class="inbox-empty">Входящие пусты</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../../shared/store'
import type { Task } from '../../shared/types/task'

const projects = computed(() => store.projs)

const inboxTasks = computed(() => store.tasks.filter((t) => t.status === 'inbox'))

const tasksByProject = computed(() => {
  const map: Record<string, number> = {}
  for (const t of store.tasks) {
    map[t.project] = (map[t.project] || 0) + 1
  }
  return map
})

const contexts = computed(() => {
  const set = new Set<string>()
  for (const t of store.tasks) {
    if (t.context) set.add(t.context)
  }
  return Array.from(set)
})

function assignProject(task: Task) {
  task.status = 'todo'
}

function assignToday(task: Task) {
  task.status = 'doing'
}
</script>

<style scoped>
.gtd-layout {
  display: grid;
  grid-template-columns: 256px 1fr;
  gap: 16px;
  padding: 18px 22px;
  flex: 1;
  overflow: auto;
  min-height: 0;
  align-items: start;
}
.gtd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.gtd-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: var(--pad);
}
.gtd-panel-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--fg);
  display: block;
  margin-bottom: 11px;
}
.project-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.project-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 7px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s;
}
.project-item:hover {
  background: var(--surface-2);
}
.proj-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--fg3);
  flex: none;
}
.proj-name {
  font-size: 13px;
  color: var(--fg);
  flex: 1;
}
.proj-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
}
.contexts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.ctx-chip {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--fg2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.ctx-chip:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
.gtd-inbox {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  overflow: hidden;
}
.inbox-header {
  padding: 15px 17px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.inbox-title {
  font-size: 13.5px;
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
.inbox-row {
  padding: 13px 17px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 13px;
  transition: background 0.1s;
}
.inbox-row:hover {
  background: var(--surface-2);
}
.inbox-check {
  width: 17px;
  height: 17px;
  border-radius: 5px;
  border: 1.5px solid var(--line-2);
  flex: none;
}
.inbox-title-text {
  font-size: 13px;
  color: var(--fg);
  flex: 1;
  min-width: 0;
}
.inbox-action {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 5px 10px;
  cursor: pointer;
  flex: none;
  transition:
    color 0.12s,
    border-color 0.12s;
}
.inbox-action:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
.inbox-empty {
  padding: 24px;
  text-align: center;
  color: var(--fg3);
  font-size: 13px;
}
</style>
