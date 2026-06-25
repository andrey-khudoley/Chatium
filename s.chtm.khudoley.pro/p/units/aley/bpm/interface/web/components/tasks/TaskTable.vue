<template>
  <div data-role="tablepad" class="table-wrap">
    <!-- Тулбар таблицы -->
    <div class="table-toolbar">
      <div class="search-wrap">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--fg3)"
          stroke-width="1.5"
          style="flex: none"
        >
          <circle cx="7" cy="7" r="4.2" />
          <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
        </svg>
        <input v-model="store.tableFilter" placeholder="Фильтр задач…" class="search-input" />
      </div>
      <span class="count-label">{{ filtered.length }}</span>
      <div style="flex: 1"></div>
      <span class="group-label">Группировать</span>
      <div class="seg-wrap">
        <button
          v-for="g in groups"
          :key="g.v"
          :class="['seg-btn', { active: store.tableGroup === g.v }]"
          @click="store.tableGroup = g.v"
        >
          {{ g.l }}
        </button>
      </div>
    </div>

    <!-- Таблица -->
    <div class="table-container">
      <div class="table-scroll">
        <div class="table-inner">
          <!-- Заголовок -->
          <div class="table-head">
            <div v-for="col in cols" :key="col.key" class="th" @click="sortBy(col.key)">
              {{ col.label }}
              <span class="sort-arrow">{{ sortArrow(col.key) }}</span>
            </div>
          </div>
          <!-- Строки (с группировкой) -->
          <template v-for="group in tableGroups" :key="group.key">
            <div v-if="store.tableGroup !== 'none'" class="group-row">
              <span class="group-dot" :style="{ background: group.color }"></span>
              <span class="group-label-text">{{ group.label }}</span>
              <span class="group-count">{{ group.rows.length }}</span>
            </div>
            <div
              v-for="row in group.rows"
              :key="row.id"
              class="table-row"
              @click="openDetail('task', row.id)"
            >
              <div class="td title-col">{{ row.title }}</div>
              <div class="td status-col">
                <span class="status-dot" :style="{ background: statusColor(row.status) }"></span>
                <span :style="{ color: statusColor(row.status) }">{{
                  statusLabel(row.status)
                }}</span>
              </div>
              <div class="td">{{ row.project }}</div>
              <div class="td">{{ row.client }}</div>
              <div class="td mono">{{ row.context }}</div>
              <div class="td pr-col">
                <span class="pr-dot" :style="{ background: prColor(row.pr) }"></span>
                <span>{{ prLabel(row.pr) }}</span>
              </div>
              <div class="td mono">{{ row.due }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, openDetail } from '../../shared/store'
import { statusColor, statusLabel, prColor, prLabel } from '../../shared/format'
import type { Task } from '../../shared/types/task'

const groups = [
  { v: 'none', l: 'Без' },
  { v: 'status', l: 'Статус' },
  { v: 'context', l: 'Контекст' },
  { v: 'client', l: 'Клиент' }
]

const cols = [
  { key: 'title', label: 'Задача' },
  { key: 'status', label: 'Статус' },
  { key: 'project', label: 'Проект' },
  { key: 'client', label: 'Клиент' },
  { key: 'context', label: 'Контекст' },
  { key: 'pr', label: 'Приоритет' },
  { key: 'due', label: 'Срок' }
]

const filtered = computed(() => {
  const q = store.tableFilter.toLowerCase()
  return store.tasks.filter(
    (t) => !q || t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q)
  )
})

const sorted = computed(() => {
  const key = store.tableSortKey as keyof Task
  const dir = store.tableSortDir === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => {
    const av = String(a[key] ?? '')
    const bv = String(b[key] ?? '')
    return av.localeCompare(bv) * dir
  })
})

const tableGroups = computed(() => {
  if (store.tableGroup === 'none') {
    return [{ key: 'all', label: '', color: '', rows: sorted.value }]
  }
  const groupKey = store.tableGroup as keyof Task
  const map = new Map<string, Task[]>()
  for (const t of sorted.value) {
    const k = String(t[groupKey] ?? '—')
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(t)
  }
  return Array.from(map.entries()).map(([key, rows]) => ({
    key,
    label: key,
    color: groupKey === 'status' ? statusColor(key) : 'var(--fg3)',
    rows
  }))
})

function sortBy(key: string) {
  if (store.tableSortKey === key) {
    store.tableSortDir = store.tableSortDir === 'asc' ? 'desc' : 'asc'
  } else {
    store.tableSortKey = key
    store.tableSortDir = 'asc'
  }
}

function sortArrow(key: string) {
  if (store.tableSortKey !== key) return ''
  return store.tableSortDir === 'asc' ? '↑' : '↓'
}
</script>

<style scoped>
.table-wrap {
  flex: 1;
  overflow: auto;
  padding: 18px 22px;
  min-height: 0;
}
.table-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 11px;
  width: 240px;
}
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  outline: none;
  min-width: 0;
}
.count-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.group-label {
  font-size: 11.5px;
  color: var(--fg3);
}
.seg-wrap {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
}
.seg-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 3px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--fg2);
  background: transparent;
  cursor: pointer;
}
.seg-btn.active {
  background: var(--elevated);
  color: var(--fg);
  font-weight: 600;
}
.table-container {
  border: 1px solid var(--line);
  border-radius: 5px;
  overflow: hidden;
  background: var(--surface);
}
.table-scroll {
  overflow-x: auto;
}
.table-inner {
  min-width: 940px;
}
.table-head {
  display: grid;
  grid-template-columns: minmax(220px, 1.7fr) 130px 112px 142px 122px 112px 84px;
  gap: 14px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
}
.th {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg2);
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 4px;
}
.th:hover {
  color: var(--fg);
}
.sort-arrow {
  color: var(--accent);
  font-size: 10px;
}
.group-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 16px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
}
.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.group-label-text {
  font-size: 12px;
  font-weight: 700;
  color: var(--fg);
}
.group-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
}
.table-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.7fr) 130px 112px 142px 122px 112px 84px;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  align-items: center;
  cursor: pointer;
  transition: background 0.1s;
}
.table-row:hover {
  background: var(--surface-2);
}
.td {
  font-size: 12.5px;
  color: var(--fg);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.title-col {
  font-size: 13px;
  font-weight: 500;
}
.status-col {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.pr-col {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
}
.pr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg2);
}
</style>
