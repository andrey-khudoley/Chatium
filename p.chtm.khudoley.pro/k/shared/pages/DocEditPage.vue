<template>
  <div class="kb-shell">
    <header class="kb-topbar">
      <div class="kb-topbar__inner">
        <div class="kb-brand">
          <h1 class="kb-brand__title">
            <i :class="['fas', isNewDoc ? 'fa-file-circle-plus' : 'fa-pen-to-square']"></i>
            {{ isNewDoc ? 'Create document' : `Edit: ${docFilename}` }}
          </h1>
          <p class="kb-brand__subtitle">markdown editor + directive authoring</p>
        </div>

        <div class="kb-actions">
          <button class="kb-btn kb-btn--ghost" @click="toggleTheme">
            <i :class="['fas', currentTheme === 'dark' ? 'fa-sun' : 'fa-moon']"></i>
            <span>{{ currentTheme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
          <a class="kb-btn" :href="backUrl">
            <i class="fas fa-arrow-left"></i>
            <span>Back</span>
          </a>
          <a v-if="!isNewDoc" class="kb-btn" :href="viewUrl" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-eye"></i>
            <span>Preview page</span>
          </a>
          <button class="kb-btn kb-btn--primary" :disabled="!canSave" @click="saveDoc">
            <i :class="['fas', saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk']"></i>
            <span>{{ saving ? 'Saving...' : 'Save' }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="kb-content">
      <div v-if="error" class="kb-alert kb-alert--error">
        <i class="fas fa-triangle-exclamation"></i>
        <div>{{ error }}</div>
      </div>

      <div v-if="successMessage" class="kb-alert kb-alert--success">
        <i class="fas fa-circle-check"></i>
        <div>{{ successMessage }}</div>
      </div>

      <section class="kb-panel">
        <div class="kb-panel__head">
          <h2 class="kb-panel__title">Document identity</h2>
          <div class="kb-status">
            <span class="kb-status-dot" :class="hasChanges ? 'kb-status-dot--warning' : 'kb-status-dot--ok'"></span>
            <span>{{ hasChanges ? 'unsaved changes' : 'synced' }}</span>
          </div>
        </div>

        <div class="kb-field" v-if="isNewDoc">
          <label class="kb-field__label">Filename</label>
          <input v-model="fileName" class="kb-input" type="text" placeholder="guide.md" />
          <span class="kb-field__hint">Extension <span class="kb-kbd">.md</span> is auto-added if absent.</span>
        </div>

        <div class="kb-field">
          <label class="kb-field__label">Directive line</label>
          <div style="display: flex; gap: 0.45rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
            <button
              v-for="item in directivePresets"
              :key="item"
              class="kb-chip"
              :class="{ 'is-active': selectedDirectives.includes(item) }"
              @click="toggleDirective(item)"
            >
              @{{ item }}
            </button>
          </div>

          <div style="display: flex; gap: 0.45rem;">
            <input
              v-model="directiveInput"
              class="kb-input"
              type="text"
              placeholder="custom-directive"
            />
            <button class="kb-btn" @click="addCustomDirective">
              <i class="fas fa-plus"></i>
              <span>Add</span>
            </button>
            <button class="kb-btn" @click="applyDirectivesToEditor">
              <i class="fas fa-wand-magic-sparkles"></i>
              <span>Apply to editor</span>
            </button>
          </div>

          <div style="margin-top: 0.4rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
            <span class="kb-badge" v-for="directive in selectedDirectives" :key="directive">
              @{{ directive }}
              <button
                class="kb-btn kb-btn--tiny"
                style="margin-left: 0.35rem; padding: 0 0.2rem;"
                @click="removeDirective(directive)"
              >
                <i class="fas fa-xmark"></i>
              </button>
            </span>
            <span v-if="selectedDirectives.length === 0" class="kb-soft">No directives selected</span>
          </div>

          <span class="kb-field__hint">Visible in shared lists only when first line starts with selected @directives.</span>
        </div>
      </section>

      <section class="kb-panel" style="margin-top: 1rem;">
        <div class="kb-panel__head">
          <h2 class="kb-panel__title">Editor</h2>
          <div class="kb-status">
            <span><span class="kb-kbd">Ctrl/Cmd</span> + <span class="kb-kbd">S</span> save</span>
          </div>
        </div>

        <div v-if="loading" style="display: flex; align-items: center; gap: 0.6rem;">
          <div class="kb-loader"></div>
          <span class="kb-muted">Loading markdown...</span>
        </div>

        <div v-else class="kb-split">
          <div>
            <label class="kb-field__label">Raw markdown</label>
            <textarea
              v-model="content"
              class="kb-textarea"
              @input="hasChanges = true"
              placeholder="# Title\n\nWrite markdown here"
            ></textarea>
          </div>

          <div>
            <label class="kb-field__label">Live preview (without instruction line)</label>
            <div class="kb-panel" style="min-height: 360px;">
              <article class="kb-markdown" v-html="renderedMarkdown"></article>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="kb-footer">
      <div class="kb-footer__inner">
        <span>{{ isNewDoc ? 'Create mode' : 'Edit mode' }}</span>
        <span>{{ normalizedFileName || 'untitled.md' }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
declare const ctx: any

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getDocRoute, putDocRoute } from '../api/docs/client'
import { docViewRoute } from '../view'
import { docEditRoute } from '../edit'
import { listPageRoute } from '../list'
import { parseInstructions, stripInstructions } from '../shared/instructionParser'

type ThemeValue = 'dark' | 'light'

const props = defineProps<{
  documentFilename?: string
}>()

const fileName = ref(props.documentFilename || '')
const content = ref('')
const originalContent = ref('')
const loading = ref(false)
const saving = ref(false)
const hasChanges = ref(false)
const error = ref('')
const successMessage = ref('')

const directivePresets = ['shared', 'chatium', 'llm', 'crm', 'support', 'public']
const directiveInput = ref('')
const selectedDirectives = ref<string[]>([])
const renderTick = ref(0)
let keydownHandler: ((event: KeyboardEvent) => void) | null = null

const isNewDoc = computed(() => !props.documentFilename)
const backUrl = computed(() => listPageRoute?.url?.() ?? '#')

const normalizedFileName = computed(() => normalizeFilename(fileName.value || props.documentFilename || ''))
const docFilename = computed(() => isNewDoc.value ? normalizedFileName.value : (props.documentFilename || ''))
const viewUrl = computed(() => {
  try {
    return docViewRoute?.query?.({ f: docFilename.value, admin: '1' })?.url?.() ?? '#'
  } catch {
    return '#'
  }
})

const canSave = computed(() => {
  if (saving.value) return false
  if (!docFilename.value) return false
  if (!content.value.trim()) return false
  return hasChanges.value || isNewDoc.value
})

function normalizeTheme(value: unknown): ThemeValue {
  return value === 'light' ? 'light' : 'dark'
}

const currentTheme = ref<ThemeValue>(normalizeTheme(document.documentElement.getAttribute('data-theme')))

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

function normalizeFilename(raw: string): string {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''

  const cleaned = trimmed
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-') || ''

  if (!cleaned) return ''

  if (/\.(md|markdown|txt)$/i.test(cleaned)) {
    return cleaned
  }

  return `${cleaned}.md`
}

function normalizeDirective(raw: string): string {
  const value = String(raw || '').trim().toLowerCase()
  return /^[a-z0-9_-]+$/.test(value) ? value : ''
}

function toggleDirective(value: string): void {
  if (selectedDirectives.value.includes(value)) {
    selectedDirectives.value = selectedDirectives.value.filter((item) => item !== value)
  } else {
    selectedDirectives.value = [...selectedDirectives.value, value]
  }
  hasChanges.value = true
}

function removeDirective(value: string): void {
  selectedDirectives.value = selectedDirectives.value.filter((item) => item !== value)
  hasChanges.value = true
}

function addCustomDirective(): void {
  const directive = normalizeDirective(directiveInput.value)
  if (!directive) return

  if (!selectedDirectives.value.includes(directive)) {
    selectedDirectives.value = [...selectedDirectives.value, directive]
    hasChanges.value = true
  }

  directiveInput.value = ''
}

function composeContentWithDirectives(source: string): string {
  const normalizedDirectives = selectedDirectives.value
    .map((item) => normalizeDirective(item))
    .filter((item, index, arr) => item && arr.indexOf(item) === index)

  const lines = source.split('\n')
  const firstLine = lines[0] ? lines[0].trim() : ''
  const directivesLine = normalizedDirectives.map((item) => `@${item}`).join(' ')

  if (directivesLine.length === 0) {
    if (firstLine.startsWith('@')) {
      lines.shift()
      return lines.join('\n')
    }
    return source
  }

  if (firstLine.startsWith('@')) {
    lines[0] = directivesLine
  } else {
    lines.unshift(directivesLine)
  }

  return lines.join('\n')
}

function applyDirectivesToEditor(): void {
  content.value = composeContentWithDirectives(content.value)
  hasChanges.value = true
  renderTick.value += 1
}

function syncDirectivesFromContent(value: string): void {
  const parsed = parseInstructions(value)
  selectedDirectives.value = parsed
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const renderedMarkdown = computed(() => {
  renderTick.value

  const previewSource = stripInstructions(content.value || '')
  if (!previewSource.trim()) {
    return '<div class="kb-soft">Preview appears here.</div>'
  }

  const markedInstance = (window as any).marked
  if (markedInstance && typeof markedInstance.parse === 'function') {
    try {
      return markedInstance.parse(previewSource)
    } catch (parseError) {
      return `<pre>${escapeHtml(previewSource)}</pre>`
    }
  }

  return `<pre>${escapeHtml(previewSource)}</pre>`
})

async function loadDoc(): Promise<void> {
  if (isNewDoc.value) {
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await getDocRoute.query({ filename: props.documentFilename }).run(ctx)

    if (result.success && typeof result.data === 'string') {
      content.value = result.data
      originalContent.value = result.data
      hasChanges.value = false
      syncDirectivesFromContent(result.data)
      renderTick.value += 1
    } else {
      error.value = result.error === 'NotFound'
        ? 'Document not found'
        : (result.error || 'Failed to load document')
    }
  } catch (loadError) {
    error.value = String(loadError)
  } finally {
    loading.value = false
  }
}

function setSuccessMessage(message: string): void {
  successMessage.value = message
  setTimeout(() => {
    if (successMessage.value === message) {
      successMessage.value = ''
    }
  }, 2400)
}

async function saveDoc(): Promise<void> {
  if (!canSave.value) return

  const filename = docFilename.value
  if (!filename) {
    error.value = 'Filename is required'
    return
  }

  const payload = composeContentWithDirectives(content.value)
  if (!payload.trim()) {
    error.value = 'Document cannot be empty'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const result = await putDocRoute.run(ctx, {
      filename,
      markdown: payload
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to save document')
    }

    content.value = payload
    originalContent.value = payload
    hasChanges.value = false
    syncDirectivesFromContent(payload)
    setSuccessMessage('Document saved')

    if (isNewDoc.value) {
      setTimeout(() => {
        const editUrl = docEditRoute?.query?.({ f: filename })?.url?.()
      if (editUrl) window.location.href = editUrl
      }, 500)
    }
  } catch (saveError) {
    error.value = String(saveError)
  } finally {
    saving.value = false
  }
}

function onEditorShortcut(event: KeyboardEvent): void {
  const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
  if (!isSaveShortcut) return

  event.preventDefault()
  void saveDoc()
}

onMounted(async () => {
  currentTheme.value = normalizeTheme(document.documentElement.getAttribute('data-theme'))

  if (isNewDoc.value) {
    content.value = '@shared\n\n# New document\n'
    originalContent.value = content.value
    hasChanges.value = true
    syncDirectivesFromContent(content.value)
  }

  await loadDoc()

  keydownHandler = onEditorShortcut
  window.addEventListener('keydown', keydownHandler)

  setTimeout(() => {
    renderTick.value += 1
  }, 100)
})

onUnmounted(() => {
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
})
</script>
