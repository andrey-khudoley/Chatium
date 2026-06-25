<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="08" text="библиотека" style="margin-bottom: 16px" />

    <div class="lib-toolbar">
      <div class="lib-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.v"
          :class="['tab-btn', { active: store.libFilter === tab.v }]"
          @click="store.libFilter = tab.v"
        >
          {{ tab.l }}
        </button>
      </div>
      <span class="count-label">{{ filtered.length }}</span>
      <div style="flex: 1"></div>
      <PrimaryButton @click="addItem">
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
        Материал
      </PrimaryButton>
    </div>

    <div data-role="metrics" class="lib-grid">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="lib-card liftcard"
        @click="openDetail('library', item.id)"
      >
        <div class="lib-card-top">
          <span class="type-badge">{{ typeLabel(item.type) }}</span>
          <div style="flex: 1"></div>
          <span class="status-badge" :style="{ color: libStatusColor(item.status) }">
            <span class="status-dot" :style="{ background: libStatusColor(item.status) }"></span>
            {{ libStatusLabel(item.status) }}
          </span>
        </div>
        <div class="lib-card-body">
          <div class="lib-title">{{ item.title }}</div>
          <div class="lib-author">{{ item.author }}</div>
        </div>
        <ProgressBar v-if="item.status === 'reading'" :value="item.progress" />
        <div class="lib-tags">
          <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="tag-chip">#{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, openDetail } from '../../shared/store'
import { typeLabel, libStatusColor, libStatusLabel } from '../../shared/format'
import ProgressBar from '../../components/ui/ProgressBar.vue'
import PrimaryButton from '../../components/ui/PrimaryButton.vue'
import DecoLabel from '../../components/ui/DecoLabel.vue'

const tabs = [
  { v: '', l: 'Все' },
  { v: 'article', l: 'Статьи' },
  { v: 'book', l: 'Книги' },
  { v: 'note', l: 'Заметки' },
  { v: 'video', l: 'Видео' }
]

const filtered = computed(() =>
  store.lib.filter((item) => !store.libFilter || item.type === store.libFilter)
)

function addItem() {
  // заглушка
}
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.lib-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.lib-tabs {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
}
.tab-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 3px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--fg2);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.tab-btn:hover {
  color: var(--fg);
}
.tab-btn.active {
  background: var(--elevated);
  color: var(--fg);
  font-weight: 600;
}
.count-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.lib-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.lib-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 17px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  cursor: pointer;
}
.lib-card-top {
  display: flex;
  align-items: center;
  gap: 9px;
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
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.lib-card-body {
}
.lib-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--fg);
  line-height: 1.3;
}
.lib-author {
  font-size: 12px;
  color: var(--fg2);
  margin-top: 4px;
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
</style>
