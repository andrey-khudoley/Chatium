<template>
  <div class="tasks-screen anim-fadein">
    <!-- Тулбар -->
    <div data-role="tasktoolbar" class="tasks-toolbar">
      <SegmentedControl v-model="store.taskView" :options="viewOptions" />
      <div v-if="store.taskView === 'board'" class="filter-tabs">
        <span class="filter-tab active">Все</span>
        <span class="filter-tab">Сегодня</span>
        <span class="filter-tab">Просрочено</span>
      </div>
      <div style="flex: 1"></div>
      <PrimaryButton @click="addTask">
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <line x1="7" y1="2.5" x2="7" y2="11.5" />
          <line x1="2.5" y1="7" x2="11.5" y2="7" />
        </svg>
        Задача
      </PrimaryButton>
    </div>

    <!-- Подвиды -->
    <TaskBoard v-if="store.taskView === 'board'" />
    <TaskTable v-else-if="store.taskView === 'table'" />
    <TaskTimeline v-else-if="store.taskView === 'timeline'" />
    <TaskGtd v-else-if="store.taskView === 'gtd'" />
  </div>
</template>

<script setup lang="ts">
import { store } from '../../shared/store'
import { uid } from '../../shared/format'
import SegmentedControl from '../../components/ui/SegmentedControl.vue'
import PrimaryButton from '../../components/ui/PrimaryButton.vue'
import TaskBoard from '../../components/tasks/TaskBoard.vue'
import TaskTable from '../../components/tasks/TaskTable.vue'
import TaskTimeline from '../../components/tasks/TaskTimeline.vue'
import TaskGtd from '../../components/tasks/TaskGtd.vue'

const viewOptions = [
  { value: 'board', label: 'Доска' },
  { value: 'table', label: 'Таблица' },
  { value: 'timeline', label: 'Таймлайн' },
  { value: 'gtd', label: 'GTD' }
]

function addTask() {
  store.tasks.unshift({
    id: uid(),
    title: 'Новая задача',
    status: 'inbox',
    project: '',
    client: '',
    context: '',
    pr: 'med',
    due: '',
    desc: '',
    checklist: []
  })
}
</script>

<style scoped>
.tasks-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.tasks-toolbar {
  padding: 15px 22px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid var(--line);
  flex: none;
  flex-wrap: wrap;
}
.filter-tabs {
  display: flex;
  gap: 5px;
}
.filter-tab {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg2);
  padding: 6px 12px;
  border-radius: 3px;
  cursor: pointer;
}
.filter-tab:hover {
  color: var(--fg);
}
.filter-tab.active {
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
