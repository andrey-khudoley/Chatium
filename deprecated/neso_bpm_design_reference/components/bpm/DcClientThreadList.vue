<script setup lang="ts">
import type { ClientThread } from '../../shared/clientSupportDemo'
import type { ClientThreadFilter } from '../../shared/bpmVueExportedTypes'

const props = defineProps<{
  title: string
  searchPlaceholder: string
  searchValue: string
  filters: ClientThreadFilter[]
  activeFilter: string
  threads: ClientThread[]
  selectedThreadId: string
}>()

const emit = defineEmits<{
  selectThread: [id: string]
  changeFilter: [id: string]
  updateSearch: [value: string]
}>()

function statusClass(status: ClientThread['status']): string {
  if (status === 'new') return 'state-new'
  if (status === 'waiting') return 'state-waiting'
  return 'state-active'
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function onSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('updateSearch', target.value)
}
</script>

<template>
  <aside class="dc-client-thread-list">
    <header class="dc-client-thread-list__header">
      <h3>{{ title }}</h3>
      <button type="button" aria-label="More">
        <i class="fas fa-ellipsis-h"></i>
      </button>
    </header>

    <label class="dc-client-thread-list__search">
      <i class="fas fa-search"></i>
      <input
        :value="searchValue"
        type="text"
        :placeholder="searchPlaceholder"
        @input="onSearchInput"
      />
    </label>

    <nav class="dc-client-thread-list__filters">
      <button
        v-for="filter in filters"
        :key="filter.id"
        type="button"
        :class="{ active: activeFilter === filter.id }"
        @click="emit('changeFilter', filter.id)"
      >
        <span>{{ filter.label }}</span>
        <em v-if="typeof filter.count === 'number'">{{ filter.count }}</em>
      </button>
    </nav>

    <div class="dc-client-thread-list__items">
      <button
        v-for="thread in threads"
        :key="thread.id"
        type="button"
        class="dc-client-thread-list__item"
        :class="[statusClass(thread.status), { selected: selectedThreadId === thread.id }]"
        @click="emit('selectThread', thread.id)"
      >
        <span class="dc-client-thread-list__avatar">{{ initials(thread.clientName) }}</span>

        <span class="dc-client-thread-list__body">
          <span class="dc-client-thread-list__row">
            <strong>{{ thread.clientName }}</strong>
            <time>{{ thread.time }}</time>
          </span>
          <span class="dc-client-thread-list__manager">{{ thread.managerName }}</span>
          <span class="dc-client-thread-list__preview">{{ thread.preview }}</span>
          <span class="dc-client-thread-list__meta">
            <i class="fab fa-telegram-plane"></i>
            <span>{{ thread.channel }}</span>
            <span v-if="thread.mine" class="mine">Мой</span>
            <span v-if="thread.unread > 0" class="unread">{{ thread.unread }}</span>
          </span>
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.dc-client-thread-list {
  width: 360px;
  min-width: 320px;
  border-right: 1px solid color-mix(in srgb, var(--border-soft) 70%, transparent);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  max-height: 100%;
}

.dc-client-thread-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
}

.dc-client-thread-list__header h3 {
  margin: 0;
  font-size: 1rem;
}

.dc-client-thread-list__header button {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
  color: var(--text-tertiary);
}

.dc-client-thread-list__search {
  margin: 0 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
}

.dc-client-thread-list__search i {
  color: var(--text-tertiary);
  font-size: 0.78rem;
}

.dc-client-thread-list__search input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.76rem;
}

.dc-client-thread-list__filters {
  margin: 8px 10px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: auto;
  padding-bottom: 4px;
}

.dc-client-thread-list__filters button {
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-2) 88%, transparent);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  font-size: 0.7rem;
  white-space: nowrap;
}

.dc-client-thread-list__filters button.active {
  border-color: var(--border-accent);
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent-soft) 60%, transparent);
}

.dc-client-thread-list__filters em {
  font-style: normal;
  font-size: 0.64rem;
  color: var(--text-tertiary);
}

.dc-client-thread-list__items {
  overflow: auto;
  display: grid;
}

.dc-client-thread-list__item {
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--border-soft) 64%, transparent);
  background: transparent;
  text-align: left;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 8px;
  padding: 10px 12px;
}

.dc-client-thread-list__item:hover {
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
}

.dc-client-thread-list__item.selected {
  background: color-mix(in srgb, var(--chart-2) 28%, var(--surface-2));
}

.dc-client-thread-list__item.state-new {
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--status-info) 84%, transparent);
}

.dc-client-thread-list__item.state-waiting {
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--status-warning) 84%, transparent);
}

.dc-client-thread-list__item.state-active {
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--status-success) 76%, transparent);
}

.dc-client-thread-list__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-soft);
  display: grid;
  place-items: center;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-3) 90%, transparent);
}

.dc-client-thread-list__body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.dc-client-thread-list__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.dc-client-thread-list__row strong {
  font-size: 0.78rem;
}

.dc-client-thread-list__row time {
  font-size: 0.67rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.dc-client-thread-list__manager {
  font-size: 0.66rem;
  color: var(--text-tertiary);
}

.dc-client-thread-list__preview {
  font-size: 0.72rem;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dc-client-thread-list__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  color: var(--text-tertiary);
}

.dc-client-thread-list__meta i {
  color: color-mix(in srgb, var(--status-info) 72%, var(--accent));
}

.dc-client-thread-list__meta .mine {
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  padding: 1px 6px;
}

.dc-client-thread-list__meta .unread {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--status-danger) 76%, transparent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
}

@media (max-width: 1380px) {
  .dc-client-thread-list {
    width: 320px;
    min-width: 280px;
  }
}

@media (max-width: 1120px) {
  .dc-client-thread-list {
    width: 100%;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid color-mix(in srgb, var(--border-soft) 70%, transparent);
    max-height: 360px;
  }
}
</style>
