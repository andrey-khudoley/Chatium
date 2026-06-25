<template>
  <div data-role="boardpad" class="board">
    <div v-for="col in columns" :key="col.status" class="board-col">
      <div class="col-header">
        <span class="col-dot" :style="{ background: col.color }"></span>
        <span class="col-label">{{ col.label }}</span>
        <span class="col-count">{{ col.tasks.length }}</span>
      </div>
      <div
        v-for="task in col.tasks"
        :key="task.id"
        class="task-card"
        @click="openDetail('task', task.id)"
      >
        <div class="task-title">{{ task.title }}</div>
        <div class="task-meta">
          <span class="pr-dot" :style="{ background: prColor(task.pr) }"></span>
          <span class="task-proj">{{ task.project }}</span>
          <div style="flex: 1"></div>
          <span class="task-due">{{ task.due }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, openDetail } from '../../shared/store'
import { prColor, statusColor, statusLabel } from '../../shared/format'

const STATUSES = [
  { status: 'inbox', label: 'Входящие', color: 'var(--fg3)' },
  { status: 'todo', label: 'Не начато', color: 'var(--fg2)' },
  { status: 'doing', label: 'В работе', color: 'var(--accent)' },
  { status: 'wait', label: 'Ожидание', color: 'var(--warn)' },
  { status: 'done', label: 'Готово', color: 'var(--ok)' }
]

const columns = computed(() =>
  STATUSES.map((s) => ({
    ...s,
    tasks: store.tasks.filter((t) => t.status === s.status)
  }))
)
</script>

<style scoped>
.board {
  display: flex;
  gap: 14px;
  padding: 18px 22px;
  overflow-x: auto;
  flex: 1;
  align-items: flex-start;
  min-height: 0;
}
.board-col {
  width: 258px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.col-header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 3px;
}
.col-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.col-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--fg);
}
.col-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.task-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 13px;
  cursor: grab;
  transition: border-color 0.12s;
}
.task-card:hover {
  border-color: var(--line-2);
}
.task-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
  line-height: 1.4;
}
.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.pr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.task-proj {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--fg2);
  background: var(--surface-2);
  border-radius: 3px;
  padding: 2px 7px;
}
.task-due {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
}
</style>
