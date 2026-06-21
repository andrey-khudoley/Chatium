<template>
  <div class="kb-shell">
    <header class="kb-topbar">
      <div class="kb-topbar__inner">
        <div class="kb-brand">
          <h1 class="kb-brand__title">
            <i class="fas fa-book"></i>
            Public Knowledge @{{ instruction }}
          </h1>
          <p class="kb-brand__subtitle">public document listing by first-line directive</p>
        </div>

        <div class="kb-actions">
          <button class="kb-btn kb-btn--ghost" @click="toggleTheme">
            <i :class="['fas', currentTheme === 'dark' ? 'fa-sun' : 'fa-moon']"></i>
            <span>{{ currentTheme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
          <a class="kb-btn" :href="publicRootUrl">
            <i class="fas fa-layer-group"></i>
            <span>@shared</span>
          </a>
          <button class="kb-btn" :disabled="loading" @click="loadDocs(true)">
            <i :class="['fas', loading ? 'fa-spinner fa-spin' : 'fa-rotate-right']"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>

    <main class="kb-content">
      <div v-if="error" class="kb-alert kb-alert--error">
        <i class="fas fa-circle-exclamation"></i>
        <div>{{ error }}</div>
      </div>

      <section v-if="isAdmin" class="kb-panel">
        <div class="kb-panel__head">
          <h2 class="kb-panel__title">Directive filter</h2>
          <div class="kb-badges">
            <span class="kb-badge">{{ filteredDocuments.length }} files</span>
            <span class="kb-badge">@{{ instruction }}</span>
          </div>
        </div>

        <div class="kb-toolbar">
          <button
            v-for="item in presetDirectives"
            :key="item"
            class="kb-chip"
            :class="{ 'is-active': item === instruction }"
            @click="applyDirective(item)"
          >
            @{{ item }}
          </button>

          <div class="kb-toolbar__spacer"></div>

          <input
            v-model="directiveInput"
            class="kb-input"
            type="text"
            placeholder="custom"
            style="max-width: 180px"
          />
          <button class="kb-btn" @click="applyCustomDirective">
            <i class="fas fa-filter"></i>
            <span>Apply</span>
          </button>
        </div>

        <div class="kb-toolbar" style="margin-top: 0.2rem;">
          <input
            v-model="searchQuery"
            class="kb-input"
            type="search"
            placeholder="Search filename"
            style="max-width: 320px"
          />

          <select v-model="sortBy" class="kb-select kb-inline-input">
            <option value="name">Sort: name</option>
            <option value="updated">Sort: updated</option>
            <option value="size">Sort: size</option>
          </select>
        </div>
      </section>

      <section class="kb-panel" style="margin-top: 1rem;">
        <div v-if="loadingInitial" style="display: flex; align-items: center; gap: 0.6rem;">
          <div class="kb-loader"></div>
          <span class="kb-muted">Loading public docs...</span>
        </div>

        <div v-else-if="filteredDocuments.length === 0" class="kb-empty">
          No documents found for @{{ instruction }}
        </div>

        <div v-else class="kb-table-wrap">
          <table class="kb-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th class="kb-mobile-hide">Size</th>
                <th class="kb-mobile-hide">Updated</th>
                <th class="kb-right">Open</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in filteredDocuments" :key="doc.key">
                <td>
                  <a class="kb-link" :href="getViewUrl(doc.key)">{{ doc.key }}</a>
                </td>
                <td class="kb-mobile-hide">{{ formatSize(doc.size) }}</td>
                <td class="kb-mobile-hide">{{ formatDate(doc.lastModified) }}</td>
                <td class="kb-right">
                  <a class="kb-btn kb-btn--tiny" :href="getViewUrl(doc.key)">
                    <i class="fas fa-arrow-right"></i>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="kb-footer">
      <div class="kb-footer__inner">
        <span>Public route</span>
        <span>{{ publicPageUrl }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
declare const ctx: any

import { computed, onMounted, ref } from 'vue'
import { listSharedDocsRoute } from '../api/docs/client'
import { docViewRoute } from '../view'
import { publicPageRoute } from '../public'

interface DocumentItem {
  key: string
  size: number
  lastModified: string
}

type ThemeValue = 'dark' | 'light'

const props = defineProps<{
  initialDocuments?: DocumentItem[]
  initialInstruction?: string
  initialError?: string
  initialIsAdmin?: boolean
}>()

function normalizeDirective(raw: unknown): string {
  const value = String(raw || '').trim().toLowerCase()
  return /^[a-z0-9_-]+$/.test(value) ? value : 'shared'
}

function normalizeDocuments(raw: unknown): DocumentItem[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item: any) => ({
      key: typeof item?.key === 'string' ? item.key : '',
      size: typeof item?.size === 'number' ? item.size : Number(item?.size) || 0,
      lastModified: typeof item?.lastModified === 'string' ? item.lastModified : ''
    }))
    .filter((item: DocumentItem) => item.key.length > 0)
}

function getInstructionFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return normalizeDirective(params.get('s') || params.get('instruction') || 'shared')
}

function normalizeTheme(value: unknown): ThemeValue {
  return value === 'light' ? 'light' : 'dark'
}

const windowSsrDocs = (window as any).__SSR_SHARED_DOCS__
const windowSsrInstruction = (window as any).__SSR_SHARED_INSTRUCTION__
const windowSsrError = (window as any).__SSR_SHARED_DOCS_ERROR__
const windowSsrIsAdmin = (window as any).__SSR_IS_ADMIN__

const initialDocuments = normalizeDocuments(
  props.initialDocuments !== undefined ? props.initialDocuments : windowSsrDocs
)

const initialInstruction = normalizeDirective(
  typeof props.initialInstruction === 'string'
    ? props.initialInstruction
    : (typeof windowSsrInstruction === 'string' ? windowSsrInstruction : getInstructionFromUrl())
)

const rawInitialError = typeof props.initialError === 'string' ? props.initialError : windowSsrError
const initialError = typeof rawInitialError === 'string' && rawInitialError.length > 0 ? rawInitialError : ''
const hasSSRBootstrap = props.initialDocuments !== undefined || Array.isArray(windowSsrDocs) || !!initialError

const isAdmin = ref(
  typeof props.initialIsAdmin === 'boolean'
    ? props.initialIsAdmin
    : (typeof windowSsrIsAdmin === 'boolean' ? windowSsrIsAdmin : false)
)

const presetDirectives = ['shared', 'chatium', 'llm', 'crm', 'support', 'public']
const instruction = ref(initialInstruction)
const directiveInput = ref(initialInstruction)
const documents = ref<DocumentItem[]>(initialDocuments)
const loading = ref(false)
const loadingInitial = ref(!hasSSRBootstrap)
const error = ref(initialError)
const searchQuery = ref('')
const sortBy = ref<'name' | 'updated' | 'size'>('name')

const currentTheme = ref<ThemeValue>(normalizeTheme(document.documentElement.getAttribute('data-theme')))

const publicRootUrl = computed(() => {
  try {
    return publicPageRoute?.query?.({ s: 'shared' })?.url?.() ?? publicPageRoute?.url?.() ?? '#'
  } catch {
    return '#'
  }
})
const publicPageUrl = computed(() => {
  try {
    return publicPageRoute?.query?.({ s: instruction.value })?.url?.() ?? publicPageRoute?.url?.() ?? '#'
  } catch {
    return '#'
  }
})

const filteredDocuments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const sorted = [...documents.value]

  if (sortBy.value === 'name') {
    sorted.sort((a, b) => a.key.localeCompare(b.key))
  } else if (sortBy.value === 'size') {
    sorted.sort((a, b) => b.size - a.size)
  } else {
    sorted.sort((a, b) => getTimestamp(b.lastModified) - getTimestamp(a.lastModified))
  }

  if (!query) return sorted

  return sorted.filter((item) => item.key.toLowerCase().includes(query))
})

function getTimestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function setTheme(theme: ThemeValue): void {
  const setter = (window as any).__setKnowledgeTheme
  if (typeof setter === 'function') {
    setter(theme)
  } else {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('knowledge-app-theme', theme)
    } catch (storageError) {
      // ignore
    }
  }

  currentTheme.value = theme
}

function toggleTheme(): void {
  setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
}

function updateInstructionInUrl(nextInstruction: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set('s', nextInstruction)
  url.searchParams.delete('instruction')
  window.history.replaceState({}, '', url.toString())
}

function applyDirective(value: string): void {
  const normalized = normalizeDirective(value)
  instruction.value = normalized
  directiveInput.value = normalized
  updateInstructionInUrl(normalized)
  void loadDocs()
}

function applyCustomDirective(): void {
  applyDirective(directiveInput.value)
}

async function loadDocs(refreshFromSource: boolean = false): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const query: Record<string, string> = {
      s: instruction.value,
      limit: '300'
    }

    if (refreshFromSource) {
      query.refresh = 'true'
    }

    const result = await listSharedDocsRoute.query(query).run(ctx)

    if (result.success) {
      documents.value = normalizeDocuments(result.data?.items)
    } else {
      error.value = result.error || 'Failed to load public docs'
      documents.value = []
    }
  } catch (loadError) {
    error.value = String(loadError)
    documents.value = []
  } finally {
    loading.value = false
    loadingInitial.value = false
  }
}

function getViewUrl(filename: string): string {
  try {
    return docViewRoute?.query?.({ f: filename })?.url?.() ?? '#'
  } catch {
    return '#'
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('ru-RU', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  currentTheme.value = normalizeTheme(document.documentElement.getAttribute('data-theme'))

  const urlInstruction = getInstructionFromUrl()
  if (urlInstruction !== instruction.value) {
    instruction.value = urlInstruction
    directiveInput.value = urlInstruction
  }

  if (!hasSSRBootstrap || urlInstruction !== initialInstruction) {
    await loadDocs()
  } else {
    loadingInitial.value = false
  }
})
</script>