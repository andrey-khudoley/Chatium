<template>
  <div class="kb-shell">
    <header class="kb-topbar">
      <div class="kb-topbar__inner">
        <div class="kb-brand">
          <h1 class="kb-brand__title">
            <i class="fas fa-book-open"></i>
            {{ docName }}
          </h1>
          <p class="kb-brand__subtitle">reader mode{{ props.isPublic ? ' / public' : '' }}</p>
        </div>

        <div class="kb-actions">
          <button class="kb-btn kb-btn--ghost" @click="toggleTheme">
            <i :class="['fas', currentTheme === 'dark' ? 'fa-sun' : 'fa-moon']"></i>
            <span>{{ currentTheme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
          <a v-if="!props.isPublic" class="kb-btn" :href="backUrl">
            <i class="fas fa-arrow-left"></i>
            <span>Back</span>
          </a>
          <a v-if="!props.isPublic" class="kb-btn" :href="publicViewUrl" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-share-nodes"></i>
            <span>Public</span>
          </a>
          <a v-if="!props.isPublic" class="kb-btn kb-btn--primary" :href="editUrl">
            <i class="fas fa-pen"></i>
            <span>Edit</span>
          </a>
          <button v-if="!props.isPublic" class="kb-btn" :disabled="loading" @click="loadDoc(true)">
            <i :class="['fas', loading ? 'fa-spinner fa-spin' : 'fa-rotate-right']"></i>
            <span>Reload</span>
          </button>
        </div>
      </div>
    </header>

    <main class="kb-content">
      <div v-if="error" class="kb-alert kb-alert--error">
        <i class="fas fa-triangle-exclamation"></i>
        <div>{{ error }}</div>
      </div>

      <div class="kb-panel">
        <div class="kb-panel__head">
          <h2 class="kb-panel__title">Document</h2>
          <div class="kb-badges">
            <span class="kb-badge">{{ contentLength }} chars</span>
            <span class="kb-badge">{{ loading ? 'loading' : 'ready' }}</span>
          </div>
        </div>

        <div v-if="loading" style="display: flex; align-items: center; gap: 0.6rem;">
          <div class="kb-loader"></div>
          <span class="kb-muted">Loading markdown...</span>
        </div>

        <div v-else-if="!cleanMarkdown" class="kb-empty">
          Empty file
        </div>

        <article
          v-else
          class="kb-markdown"
          v-html="renderedMarkdown"
        ></article>
      </div>
    </main>

    <footer class="kb-footer">
      <div class="kb-footer__inner">
        <span>Reader</span>
        <span>Route: {{ props.isPublic ? 'public view' : 'admin view' }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
declare const ctx: any

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getDocRoute } from '../api/docs/client'
import { docViewRoute } from '../view'
import { docEditRoute } from '../edit'
import { listPageRoute } from '../list'
import { publicPageRoute } from '../public'
import { stripInstructions } from '../shared/instructionParser'

type ThemeValue = 'dark' | 'light'

const props = defineProps<{
  documentFilename: string
  ssrContent?: string
  ssrHtml?: string
  ssrError?: string
  isPublic?: boolean
}>()

const rawMarkdown = ref<string>(
  typeof props.ssrContent === 'string' ? props.ssrContent : ((window as any).__SSR_MARKDOWN__ || '')
)

const loading = ref(!rawMarkdown.value)
const error = ref<string>(
  typeof props.ssrError === 'string' ? props.ssrError : ((window as any).__SSR_ERROR__ || '')
)

const renderTick = ref(0)
let markedWaitInterval: ReturnType<typeof setInterval> | null = null

const docName = computed(() => props.documentFilename)
const cleanMarkdown = computed(() => stripInstructions(rawMarkdown.value || ''))
const contentLength = computed(() => cleanMarkdown.value.length)
const backUrl = computed(() => {
  try {
    if (props.isPublic) {
      const u = publicPageRoute?.query?.({ s: 'shared' })?.url?.() ?? publicPageRoute?.url?.()
      return u ?? '#'
    }
    return listPageRoute?.url?.() ?? '#'
  } catch {
    return '#'
  }
})
const editUrl = computed(() => {
  try {
    return docEditRoute?.query?.({ f: props.documentFilename })?.url?.() ?? '#'
  } catch {
    return '#'
  }
})
const publicViewUrl = computed(() => {
  try {
    return docViewRoute?.query?.({ f: props.documentFilename })?.url?.() ?? '#'
  } catch {
    return '#'
  }
})

function normalizeTheme(value: unknown): ThemeValue {
  return value === 'light' ? 'light' : 'dark'
}

const currentTheme = ref<ThemeValue>(
  normalizeTheme(document.documentElement.getAttribute('data-theme'))
)

function setTheme(theme: ThemeValue): void {
  const setter = (window as any).__setKnowledgeTheme
  if (typeof setter === 'function') {
    setter(theme)
  } else {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('knowledge-app-theme', theme)
    } catch (storageError) {
      // ignore local storage failures
    }
  }
  currentTheme.value = theme
}

function toggleTheme(): void {
  setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const renderedMarkdown = computed(() => {
  renderTick.value

  if (!cleanMarkdown.value) {
    return ''
  }

  const markedInstance = (window as any).marked

  if (markedInstance && typeof markedInstance.parse === 'function') {
    try {
      return markedInstance.parse(cleanMarkdown.value)
    } catch (parseError) {
      return `<pre>${escapeHtml(cleanMarkdown.value)}</pre>`
    }
  }

  const bootstrapHtml = typeof props.ssrHtml === 'string' && props.ssrHtml
    ? props.ssrHtml
    : (window as any).__SSR_HTML__

  if (typeof bootstrapHtml === 'string' && bootstrapHtml.length > 0) {
    return bootstrapHtml
  }

  return `<pre>${escapeHtml(cleanMarkdown.value)}</pre>`
})

async function loadDoc(forceReload: boolean = false): Promise<void> {
  if (!forceReload && rawMarkdown.value.length > 0) {
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await getDocRoute.query({ filename: props.documentFilename }).run(ctx)

    if (result.success && typeof result.data === 'string') {
      rawMarkdown.value = result.data
      renderTick.value += 1
    } else {
      error.value = result.error === 'NotFound'
        ? 'Document not found'
        : (result.error || 'Failed to load markdown')
    }
  } catch (loadError) {
    error.value = String(loadError)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  currentTheme.value = normalizeTheme(document.documentElement.getAttribute('data-theme'))

  if (!rawMarkdown.value) {
    await loadDoc()
  } else {
    loading.value = false
  }

  markedWaitInterval = setInterval(() => {
    if ((window as any).marked && typeof (window as any).marked.parse === 'function') {
      renderTick.value += 1
      if (markedWaitInterval) {
        clearInterval(markedWaitInterval)
        markedWaitInterval = null
      }
    }
  }, 120)
})

onUnmounted(() => {
  if (markedWaitInterval) {
    clearInterval(markedWaitInterval)
    markedWaitInterval = null
  }
})
</script>