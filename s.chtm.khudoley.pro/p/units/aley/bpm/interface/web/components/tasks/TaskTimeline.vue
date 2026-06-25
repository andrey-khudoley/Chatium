<template>
  <div data-role="tablepad" class="timeline-wrap">
    <div class="tl-header">
      <span class="tl-title">Июнь · {{ startDay }}–{{ endDay }}</span>
      <span class="tl-sub">Пересечения видны по общей оси времени</span>
      <div style="flex: 1"></div>
      <div class="legend">
        <span v-for="s in statusLegend" :key="s.status" class="legend-item">
          <span class="legend-dot" :style="{ background: s.color }"></span>{{ s.label }}
        </span>
      </div>
    </div>

    <div class="tl-table">
      <div class="tl-scroll">
        <div class="tl-inner">
          <!-- Заголовок дней -->
          <div class="tl-head-row">
            <div class="tl-name-col">Задача</div>
            <div class="tl-days-grid">
              <div v-for="day in days" :key="day.n" class="day-head" :class="{ today: day.today }">
                <div class="day-num">{{ day.n }}</div>
                <div class="day-dow">{{ day.dow }}</div>
              </div>
            </div>
          </div>
          <!-- Строки задач -->
          <div
            v-for="task in tasksWithDates"
            :key="task.id"
            class="tl-row"
            @click="openDetail('task', task.id)"
          >
            <div class="tl-name">
              <span class="pr-dot" :style="{ background: prColor(task.pr) }"></span>
              <span class="tl-task-name">{{ task.title }}</span>
            </div>
            <div class="tl-bar-area">
              <div class="today-line"></div>
              <div class="task-bar" :style="barStyle(task)">
                <span class="bar-dot" :style="{ background: prColor(task.pr) }"></span>
                <span class="bar-range">{{ task.due || '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, openDetail } from '../../shared/store'
import { prColor, statusColor } from '../../shared/format'

const startDay = 20
const endDay = 30
const DAYS = 11

const days = computed(() => {
  const dows = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  return Array.from({ length: DAYS }, (_, i) => {
    const n = startDay + i
    const d = new Date(2026, 5, n) // июнь 2026
    return { n, dow: dows[d.getDay()], today: n === 22 }
  })
})

const statusLegend = [
  { status: 'inbox', label: 'Входящие', color: 'var(--fg3)' },
  { status: 'todo', label: 'Не начато', color: 'var(--fg2)' },
  { status: 'doing', label: 'В работе', color: 'var(--accent)' },
  { status: 'wait', label: 'Ожидание', color: 'var(--warn)' },
  { status: 'done', label: 'Готово', color: 'var(--ok)' }
]

const tasksWithDates = computed(() => store.tasks.filter((t) => t.due || t.start))

function barStyle(task: any) {
  // Простая позиция бара: для наглядности — случайный диапазон в 11 ячейках
  const dueMap: Record<string, number> = {
    '22 июн': 2,
    '23 июн': 3,
    '24 июн': 4,
    '25 июн': 5,
    '26 июн': 6,
    '27 июн': 7,
    '30 июн': 10
  }
  const startIdx = 0
  const endIdx = dueMap[task.due] ?? 5
  const left = ((startIdx / DAYS) * 100).toFixed(1) + '%'
  const width = (((endIdx - startIdx) / DAYS) * 100).toFixed(1) + '%'
  const color = statusColor(task.status)
  return {
    position: 'absolute' as const,
    top: '6px',
    bottom: '6px',
    left,
    width,
    background: `${color}22`,
    borderTop: `2px solid ${color}`,
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 8px',
    overflow: 'hidden'
  }
}
</script>

<style scoped>
.timeline-wrap {
  flex: 1;
  overflow: auto;
  padding: 18px 22px;
  min-height: 0;
}
.tl-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.tl-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--fg);
}
.tl-sub {
  font-size: 11.5px;
  color: var(--fg3);
}
.legend {
  display: flex;
  align-items: center;
  gap: 13px;
  flex-wrap: wrap;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--fg2);
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  flex: none;
}
.tl-table {
  border: 1px solid var(--line);
  border-radius: 5px;
  overflow: hidden;
  background: var(--surface);
}
.tl-scroll {
  overflow-x: auto;
}
.tl-inner {
  min-width: 840px;
}
.tl-head-row {
  display: flex;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
}
.tl-name-col {
  width: 212px;
  flex: none;
  padding: 10px 16px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg2);
  display: flex;
  align-items: center;
}
.tl-days-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(11, 1fr);
}
.day-head {
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-left: 1px solid var(--line);
}
.day-head.today {
  background: var(--accent-soft);
}
.day-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--fg);
}
.day-dow {
  font-size: 9.5px;
  color: var(--fg3);
  margin-top: 2px;
}
.tl-row {
  display: flex;
  border-top: 1px solid var(--line);
  align-items: stretch;
  min-height: 46px;
  cursor: pointer;
  transition: background 0.1s;
}
.tl-row:hover {
  background: var(--surface-2);
}
.tl-name {
  width: 212px;
  flex: none;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.tl-task-name {
  font-size: 12.5px;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tl-bar-area {
  flex: 1;
  position: relative;
  background-image: repeating-linear-gradient(
    90deg,
    var(--line) 0 1px,
    transparent 1px,
    transparent calc(100% / 11)
  );
}
.today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 18.18%;
  width: 2px;
  background: var(--accent);
  opacity: 0.4;
}
.task-bar {
  min-width: 24px;
}
.bar-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}
.bar-range {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
