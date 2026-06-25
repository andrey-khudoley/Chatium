<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="05" text="пространство PARA" style="margin-bottom: 13px" />
    <p class="screen-desc">
      Метод PARA организует всё пространство по действенности: <b>P</b>rojects · <b>A</b>reas ·
      <b>R</b>esources · <b>A</b>rchive. Каждый элемент системы лежит в одной из четырёх корзин.
    </p>

    <div data-role="metrics" class="para-grid">
      <div v-for="section in paraSections" :key="section.key" class="para-card">
        <div class="para-header">
          <div class="para-icon">{{ section.letter }}</div>
          <div class="para-meta">
            <div class="para-title-row">
              <span class="para-title">{{ section.title }}</span>
              <span class="para-count">{{ section.items.length }}</span>
            </div>
            <span class="para-sub">{{ section.sub }}</span>
          </div>
          <button class="add-btn" @click="addItem(section)">+</button>
        </div>
        <div class="para-items">
          <div
            v-for="item in section.items"
            :key="item.id"
            class="para-item"
            @click="openDetail(section.detailType, item.id)"
          >
            <span class="item-dot"></span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-meta">{{ item.meta }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, openDetail } from '../../shared/store'
import { seedProjs, seedRefs } from '../../shared/mocks/para.mock'
import DecoLabel from '../../components/ui/DecoLabel.vue'

const paraSections = computed(() => [
  {
    key: 'projects',
    letter: 'P',
    title: 'Проекты',
    sub: 'Активные, с дедлайном',
    detailType: 'project',
    items: store.projs.map((p) => ({ id: p.id, name: p.name, meta: p.deadline || '' }))
  },
  {
    key: 'areas',
    letter: 'A',
    title: 'Области',
    sub: 'Постоянные зоны ответственности',
    detailType: 'ref',
    items: store.refs
      .filter((r) => r.kind === 'area')
      .map((r) => ({ id: r.id, name: r.name, meta: r.tags?.join(', ') || '' }))
  },
  {
    key: 'resources',
    letter: 'R',
    title: 'Ресурсы',
    sub: 'Материалы и справочники',
    detailType: 'ref',
    items: store.refs
      .filter((r) => r.kind === 'resource')
      .map((r) => ({ id: r.id, name: r.name, meta: r.tags?.join(', ') || '' }))
  },
  {
    key: 'archive',
    letter: 'A',
    title: 'Архив',
    sub: 'Завершённые и неактивные',
    detailType: 'ref',
    items: store.refs
      .filter((r) => r.kind === 'archive')
      .map((r) => ({ id: r.id, name: r.name, meta: '' }))
  }
])

function addItem(section: any) {
  // заглушка добавления
}
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
.screen-desc {
  font-size: 13px;
  color: var(--fg2);
  line-height: 1.55;
  max-width: 660px;
  margin-bottom: 20px;
}
.screen-desc b {
  color: var(--fg);
  font-weight: 600;
}
.para-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.para-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: var(--pad);
}
.para-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 13px;
}
.para-icon {
  width: 38px;
  height: 38px;
  border-radius: 4px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 17px;
  font-weight: 600;
  color: var(--accent);
  flex: none;
}
.para-meta {
  flex: 1;
  min-width: 0;
}
.para-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.para-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--fg);
}
.para-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.para-sub {
  font-size: 11.5px;
  color: var(--fg3);
  margin-top: 2px;
  display: block;
}
.add-btn {
  width: 30px;
  height: 30px;
  border-radius: 3px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--accent);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  flex: none;
  transition: border-color 0.12s;
}
.add-btn:hover {
  border-color: var(--accent-line);
}
.para-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.para-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s;
}
.para-item:hover {
  background: var(--surface-2);
}
.item-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--fg3);
  flex: none;
}
.item-name {
  font-size: 13px;
  color: var(--fg);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-meta {
  font-size: 11px;
  color: var(--fg3);
  white-space: nowrap;
  flex: none;
}
</style>
