<template>
  <div class="docs-page">
    <div class="docs-page__glow docs-page__glow--left" aria-hidden="true"></div>
    <div class="docs-page__glow docs-page__glow--right" aria-hidden="true"></div>

    <div class="docs-shell">
      <header class="hero-card">
        <p class="hero-eyebrow">GetCourse Tech API</p>
        <h1 class="hero-title">{{ projectTitle }}</h1>

        <div
          v-if="apiDocs.info.description"
          class="hero-description"
          v-html="formattedDescription"
        />

        <div class="hero-meta">
          <span v-if="apiDocs.info.version" class="hero-meta__item">Версия: {{ apiDocs.info.version }}</span>
          <span class="hero-meta__item">Разделов: {{ groupStats.length }}</span>
          <span class="hero-meta__item">Эндпоинтов: {{ totalEndpoints }}</span>
        </div>

        <label class="hero-search" for="docs-search">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <input
            id="docs-search"
            v-model="searchQuery"
            type="search"
            placeholder="Поиск по операциям, пути или методу..."
          />
        </label>
      </header>

      <section class="controls-card">
        <nav class="group-nav" aria-label="Навигация по разделам">
          <button
            v-for="g in groupStats"
            :key="g.tag"
            type="button"
            class="group-chip"
            @click="scrollToGroup(g.tag)"
          >
            <span class="group-chip__name">{{ g.tag }}</span>
            <span class="group-chip__count">{{ g.count }}</span>
          </button>
        </nav>

        <div class="toolbar-actions">
          <button type="button" class="toolbar-btn toolbar-btn--primary" @click="expandAll">
            Развернуть все
          </button>
          <button type="button" class="toolbar-btn" @click="collapseAll">
            Свернуть все
          </button>
        </div>
      </section>

      <main class="sections-list">
        <ApiSection
          v-for="group in filteredGroups"
          :key="group.tag"
          :tag="group.tag"
          :operations="group.operations"
          :expanded-operations="expandedOperationsSet"
          :schemas="apiDocs.schemas"
          @toggle-operation="toggleOperation"
        />

        <section v-if="!filteredGroups.length" class="empty-state">
          <i class="fas fa-folder-open"></i>
          <p>По вашему запросу ничего не найдено. Попробуйте изменить строку поиска.</p>
        </section>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ApiSection from '../components/ApiSection.vue'
import AppFooter from '../components/AppFooter.vue'
import type { ApiDocs } from '../lib/openapi.lib'

const props = defineProps<{
  apiDocs: ApiDocs
  projectTitle: string
}>()

const searchQuery = ref('')
const expandedOperations = ref<Record<string, boolean>>({})

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.apiDocs.groups
  return props.apiDocs.groups
    .map((g) => ({
      tag: g.tag,
      operations: g.operations.filter(
        (op) =>
          (op.summary || '').toLowerCase().includes(q) ||
          op.path.toLowerCase().includes(q) ||
          op.method.toLowerCase().includes(q)
      )
    }))
    .filter((g) => g.operations.length > 0)
})

const totalEndpoints = computed(() =>
  props.apiDocs.groups.reduce((acc, g) => acc + g.operations.length, 0)
)

const groupStats = computed(() =>
  props.apiDocs.groups.map((g) => ({ tag: g.tag, count: g.operations.length }))
)

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const formattedDescription = computed(() => {
  const d = props.apiDocs.info.description
  if (!d) return ''
  const withNewlines = d.replace(/<br\s*\/?>/gi, '\n')
  const escaped = escapeHtml(withNewlines)
  return escaped
    .replace(/\n/g, '<br>')
    .replace(/^# (.+)$/gm, '<span class="description-heading">$1</span>')
})

const expandedOperationsSet = computed(() => {
  const set = new Set<string>()
  Object.entries(expandedOperations.value).forEach(([k, v]) => {
    if (v) set.add(k)
  })
  return set
})

function toggleOperation(key: string) {
  expandedOperations.value[key] = !expandedOperations.value[key]
  expandedOperations.value = { ...expandedOperations.value }
}

function expandAll() {
  const next: Record<string, boolean> = {}
  props.apiDocs.groups.forEach((g) => {
    g.operations.forEach((op) => {
      next[op.method + ':' + op.path] = true
    })
  })
  expandedOperations.value = next
}

function collapseAll() {
  expandedOperations.value = {}
}

function scrollToGroup(tag: string) {
  const el = document.getElementById('group-' + tag)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.docs-page {
  position: relative;
  overflow: hidden;
  padding: clamp(1rem, 2.2vw, 2rem) 0 clamp(2rem, 5vw, 3rem);
}

.docs-page__glow {
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  z-index: 0;
}

.docs-page__glow--left {
  width: 26rem;
  height: 26rem;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0) 70%);
  top: -13rem;
  left: -9rem;
}

.docs-page__glow--right {
  width: 22rem;
  height: 22rem;
  background: radial-gradient(circle, rgba(15, 108, 218, 0.18) 0%, rgba(15, 108, 218, 0) 72%);
  top: 2rem;
  right: -10rem;
}

.docs-shell {
  position: relative;
  z-index: 1;
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-card,
.controls-card {
  border-radius: 1.25rem;
  border: 1px solid var(--color-border);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.94) 0%, rgba(245, 250, 255, 0.9) 100%);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(3px);
}

.hero-card {
  padding: clamp(1rem, 2vw, 1.75rem);
}

.hero-eyebrow {
  margin: 0;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-weight: 800;
  color: var(--color-accent);
}

.hero-title {
  margin: 0.3rem 0 0;
  font-size: clamp(1.55rem, 4vw, 2.45rem);
  line-height: 1.15;
  font-weight: 800;
  color: var(--color-text);
}

.hero-description {
  margin-top: 0.95rem;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.65;
  max-width: 74ch;
}

.hero-description :deep(.description-heading) {
  display: block;
  margin: 0.85rem 0 0.2rem;
  color: var(--color-text);
  font-weight: 700;
}

.hero-meta {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.hero-meta__item {
  font-size: 0.78rem;
  font-weight: 700;
  color: #274260;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid #cfe1f4;
  background: #edf5ff;
}

.hero-search {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 0.9rem;
  padding: 0.66rem 0.8rem;
  background: var(--color-surface-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.hero-search i {
  color: var(--color-accent);
  font-size: 0.92rem;
}

.hero-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: var(--color-text);
}

.hero-search input::placeholder {
  color: #8697b4;
}

.controls-card {
  padding: 0.95rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.group-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.group-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid #cfe1f4;
  border-radius: 999px;
  padding: 0.4rem 0.65rem;
  background: #f4f9ff;
  color: #1b3653;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.group-chip:hover {
  transform: translateY(-1px);
  border-color: #a9caec;
  box-shadow: 0 10px 22px -17px rgba(15, 108, 218, 0.75);
}

.group-chip__count {
  min-width: 1.5rem;
  text-align: center;
  border-radius: 999px;
  padding: 0 0.4rem;
  line-height: 1.5;
  background: #dff0ff;
  color: #0c4977;
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toolbar-btn {
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: #f7faff;
  color: #1b3653;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.toolbar-btn:hover {
  border-color: #b9cde7;
  background: #eff5ff;
}

.toolbar-btn--primary {
  color: #ffffff;
  border-color: #0f6cda;
  background: linear-gradient(135deg, #1187e8 0%, #0f6cda 100%);
}

.toolbar-btn--primary:hover {
  border-color: #0d5ec1;
  background: linear-gradient(135deg, #0f79d1 0%, #0d5ec1 100%);
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  border-radius: 1.1rem;
  border: 1px dashed #c4d8ef;
  background: #f7fbff;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 1.3rem;
}

.empty-state i {
  color: var(--color-accent);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.92rem;
}

@media (max-width: 860px) {
  .docs-shell {
    width: min(1120px, calc(100% - 1.2rem));
  }

  .controls-card {
    padding: 0.8rem;
  }

  .group-nav {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .hero-card {
    padding: 0.95rem;
  }

  .hero-meta__item {
    font-size: 0.74rem;
  }

  .group-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .group-chip {
    justify-content: space-between;
    width: 100%;
  }

  .toolbar-actions,
  .toolbar-btn {
    width: 100%;
  }
}

@media (max-width: 430px) {
  .docs-shell {
    width: min(1120px, calc(100% - 0.8rem));
  }

  .group-nav {
    grid-template-columns: 1fr;
  }
}
</style>
