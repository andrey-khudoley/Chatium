<template>
  <div class="kb-shell">
    <header class="kb-topbar">
      <div class="kb-topbar__inner">
        <div class="kb-brand">
          <h1 class="kb-brand__title">
            <i class="fas fa-terminal"></i>
            Knowledge Console
          </h1>
          <p class="kb-brand__subtitle">docs cache, directives, markdown workflows</p>
        </div>

        <div class="kb-actions">
          <button class="kb-btn kb-btn--ghost" @click="toggleTheme" title="Switch theme">
            <i :class="['fas', currentTheme === 'dark' ? 'fa-sun' : 'fa-moon']"></i>
            <span>{{ currentTheme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
          <button class="kb-btn" @click="openSettings">
            <i class="fas fa-sliders"></i>
            <span>Settings</span>
          </button>
          <button class="kb-btn" @click="triggerFileUpload">
            <i class="fas fa-upload"></i>
            <span>Upload</span>
          </button>
          <a class="kb-btn kb-btn--primary" :href="createUrl">
            <i class="fas fa-plus"></i>
            <span>New doc</span>
          </a>
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

      <div class="kb-grid kb-grid--dashboard">
        <section class="kb-panel kb-panel--flush">
          <div style="padding: 0.95rem 0.95rem 0">
            <div class="kb-panel__head">
              <h2 class="kb-panel__title">Document Registry</h2>
              <div class="kb-status">
                <span class="kb-status-dot" :class="loading || uploading ? 'kb-status-dot--warning' : 'kb-status-dot--ok'"></span>
                <span>{{ loading || uploading ? 'sync in progress' : 'ready' }}</span>
              </div>
            </div>

            <div class="kb-toolbar">
              <input
                v-model="searchQuery"
                type="search"
                class="kb-input"
                placeholder="Search by filename"
                style="max-width: 320px"
              />

              <select v-model="sortBy" class="kb-select kb-inline-input">
                <option value="updated">Sort: updated</option>
                <option value="name">Sort: name</option>
                <option value="size">Sort: size</option>
              </select>

              <button class="kb-btn" :disabled="loading" @click="loadDocs(true)">
                <i :class="['fas', loading ? 'fa-spinner fa-spin' : 'fa-rotate-right']"></i>
                <span>Refresh</span>
              </button>

              <div class="kb-toolbar__spacer"></div>

              <div class="kb-badges">
                <span class="kb-badge">
                  <i class="fas fa-file-lines"></i>
                  {{ filteredDocuments.length }} shown
                </span>
                <span class="kb-badge">
                  <i class="fas fa-check-double"></i>
                  {{ selectedCount }} selected
                </span>
              </div>
            </div>

            <div
              class="kb-upload-zone"
              :class="{ 'is-active': isDragging }"
              @dragenter.prevent="onDragEnter"
              @dragover.prevent="onDragOver"
              @dragleave.prevent="onDragLeave"
              @drop.prevent="onDrop"
            >
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap;">
                <i class="fas fa-cloud-arrow-up"></i>
                <span>Drop .md/.markdown/.txt files here or use <span class="kb-kbd">Upload</span></span>
              </div>
            </div>

            <div v-if="selectedCount > 0" class="kb-alert kb-alert--info" style="margin-top: 0.75rem; margin-bottom: 0;">
              <i class="fas fa-layer-group"></i>
              <div>
                {{ selectedCount }} files in selection
                <span class="kb-soft">(Shift+click for range)</span>
              </div>
              <div style="margin-left: auto; display: flex; gap: 0.45rem;">
                <button class="kb-btn kb-btn--danger kb-btn--tiny" :disabled="deleting" @click="deleteSelected">
                  <i :class="['fas', deleting ? 'fa-spinner fa-spin' : 'fa-trash']"></i>
                  <span>Delete selected</span>
                </button>
                <button class="kb-btn kb-btn--tiny" @click="clearSelection">Clear</button>
              </div>
            </div>
          </div>

          <div v-if="loadingInitial" style="padding: 1.2rem; display: flex; align-items: center; gap: 0.6rem;">
            <div class="kb-loader"></div>
            <span class="kb-muted">Loading documents...</span>
          </div>

          <div v-else-if="filteredDocuments.length === 0" style="padding: 1rem;">
            <div class="kb-empty">
              <i class="fas fa-box-open"></i>
              <div style="margin-top: 0.45rem;">No files match current filters</div>
            </div>
          </div>

          <div v-else class="kb-table-wrap">
            <table class="kb-table">
              <thead>
                <tr>
                  <th style="width: 36px;">
                    <input
                      type="checkbox"
                      class="kb-checkbox"
                      :checked="allSelected"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th>Filename</th>
                  <th class="kb-mobile-hide">Size</th>
                  <th class="kb-mobile-hide">Updated</th>
                  <th class="kb-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(doc, index) in filteredDocuments"
                  :key="doc.key"
                  :class="{ 'is-selected': selectedDocuments.has(doc.key) }"
                >
                  <td>
                    <input
                      type="checkbox"
                      class="kb-checkbox"
                      :checked="selectedDocuments.has(doc.key)"
                      @click.stop="toggleDocumentSelection(doc.key, index, $event)"
                    />
                  </td>
                  <td>
                    <a class="kb-link" :href="getViewUrl(doc.key)">{{ doc.key }}</a>
                  </td>
                  <td class="kb-mobile-hide">{{ formatSize(doc.size) }}</td>
                  <td class="kb-mobile-hide">{{ formatDate(doc.lastModified) }}</td>
                  <td class="kb-right">
                    <div style="display: inline-flex; gap: 0.38rem;">
                      <a class="kb-btn kb-btn--tiny" :href="getEditUrl(doc.key)">
                        <i class="fas fa-pen"></i>
                      </a>
                      <button class="kb-btn kb-btn--tiny kb-btn--danger" :disabled="deleting" @click="deleteSingle(doc.key)">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="kb-panel">
          <div class="kb-panel__head">
            <h2 class="kb-panel__title">Directive Explorer</h2>
            <div style="display: inline-flex; gap: 0.38rem;">
              <a class="kb-btn kb-btn--tiny" :href="directivePublicUrl" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-up-right-from-square"></i>
                <span>public</span>
              </a>
              <a class="kb-btn kb-btn--tiny" :href="directiveCrawlUrl" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-spider"></i>
                <span>crawl</span>
              </a>
            </div>
          </div>

          <div class="kb-field">
            <label class="kb-field__label">Quick directives</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              <button
                v-for="directive in presetDirectives"
                :key="directive"
                class="kb-chip"
                :class="{ 'is-active': directive === activeDirective }"
                @click="applyDirective(directive)"
              >
                @{{ directive }}
              </button>
            </div>
          </div>

          <div class="kb-field">
            <label class="kb-field__label">Custom directive</label>
            <div style="display: flex; gap: 0.45rem;">
              <input
                v-model="directiveInput"
                class="kb-input"
                type="text"
                placeholder="shared"
              />
              <button class="kb-btn" @click="applyCustomDirective">
                <i class="fas fa-filter"></i>
                <span>Load</span>
              </button>
            </div>
            <span class="kb-field__hint">Files are filtered by first-line instructions like <span class="kb-kbd">@shared</span>.</span>
          </div>

          <div class="kb-toolbar" style="margin-bottom: 0.5rem;">
            <span class="kb-badge">@{{ activeDirective }}</span>
            <span class="kb-badge">{{ directiveDocs.length }} files</span>
            <button class="kb-btn kb-btn--tiny" :disabled="directiveLoading" @click="loadDirectiveDocs(true)">
              <i :class="['fas', directiveLoading ? 'fa-spinner fa-spin' : 'fa-arrows-rotate']"></i>
              <span>Refresh</span>
            </button>
          </div>

          <div v-if="directiveError" class="kb-alert kb-alert--error" style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-circle-exclamation"></i>
              <div>{{ directiveError }}</div>
            </div>
            <button class="kb-btn kb-btn--secondary kb-btn--tiny" :disabled="directiveLoading" @click="loadDirectiveDocs(true)">
              <i :class="['fas', directiveLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right']"></i>
              <span>Повторить попытку</span>
            </button>
          </div>

          <div v-if="directiveLoading" style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
            <div class="kb-loader"></div>
            <span class="kb-muted">Scanning directive list...</span>
          </div>

          <div v-else-if="directiveDocs.length === 0" class="kb-empty">
            <div>No files with @{{ activeDirective }}</div>
          </div>

          <div v-else class="kb-table-wrap" style="max-height: 460px; overflow-y: auto;">
            <table class="kb-table" style="min-width: 100%;">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th class="kb-right">View</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in directiveDocs" :key="`directive-${doc.key}`">
                  <td>{{ doc.key }}</td>
                  <td class="kb-right">
                    <a class="kb-btn kb-btn--tiny" :href="getPublicViewUrl(doc.key)" target="_blank" rel="noopener noreferrer">
                      <i class="fas fa-arrow-right"></i>
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </main>

    <footer class="kb-footer">
      <div class="kb-footer__inner">
        <span>Knowledge Console UI rebuild</span>
        <span>Ctrl/Cmd + Shift + R to force hard refresh</span>
      </div>
    </footer>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".md,.markdown,.txt"
      style="display: none"
      @change="handleFileSelect"
    />

    <div v-if="showSettings" class="kb-modal" @click.self="showSettings = false">
      <div class="kb-modal__box">
        <h3 class="kb-modal__title">Workspace Settings</h3>

        <div v-if="settingsError" class="kb-alert kb-alert--error">
          <i class="fas fa-circle-exclamation"></i>
          <div>{{ settingsError }}</div>
        </div>

        <div v-if="settingsSaved" class="kb-alert kb-alert--success">
          <i class="fas fa-circle-check"></i>
          <div>Settings saved</div>
        </div>

        <div class="kb-field">
          <label class="kb-field__label">Base URL</label>
          <input v-model="baseUrl" type="text" class="kb-input" placeholder="https://..." />
        </div>

        <div class="kb-field">
          <label class="kb-field__label">Admin token</label>
          <input v-model="adminToken" type="password" class="kb-input" placeholder="token" />
        </div>

        <div class="kb-field">
          <label class="kb-field__label">Default theme</label>
          <select v-model="defaultTheme" class="kb-select">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div class="kb-modal__actions">
          <button class="kb-btn" @click="showSettings = false">Close</button>
          <button class="kb-btn kb-btn--primary" :disabled="settingsSaving" @click="saveSettings">
            <i :class="['fas', settingsSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk']"></i>
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
declare const ctx: any

import { computed, onMounted, ref } from 'vue'
import { listDocsRoute, putDocRoute, deleteDocRoute, listSharedDocsRoute } from '../api/docs/client'
import { getSettingRoute, saveSettingRoute } from '../api/settings/client'
import { getDefaultThemeRoute, saveDefaultThemeRoute } from '../api/theme/client'
import { docCreateRoute } from '../create'
import { docEditRoute } from '../edit'
import { docViewRoute } from '../view'
import { publicPageRoute } from '../public'
import { crawlPageRoute } from '../crawl'

interface DocumentItem {
  key: string
  size: number
  lastModified: string
}

type ThemeValue = 'dark' | 'light'

function normalizeTheme(value: unknown): ThemeValue {
  return value === 'light' ? 'light' : 'dark'
}

function normalizeInitialDocuments(raw: unknown): DocumentItem[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item: any) => ({
      key: typeof item?.key === 'string' ? item.key : '',
      size: typeof item?.size === 'number' ? item.size : Number(item?.size) || 0,
      lastModified: typeof item?.lastModified === 'string' ? item.lastModified : ''
    }))
    .filter((item: DocumentItem) => item.key.length > 0)
}

function normalizeDirective(raw: string): string {
  const value = String(raw || '').trim().toLowerCase()
  return /^[a-z0-9_-]+$/.test(value) ? value : 'shared'
}

function normalizeUploadFilename(rawName: string): string {
  const base = rawName.trim().replace(/\s+/g, '-')
  if (!base) return `doc-${Date.now()}.md`
  if (/\.(md|markdown|txt)$/i.test(base)) return base
  return `${base}.md`
}

const props = defineProps<{
  initialDocuments?: DocumentItem[]
  initialError?: string
}>()

const windowSsrDocs = (window as any).__SSR_DOCS__
const windowSsrError = (window as any).__SSR_DOCS_ERROR__

const initialDocuments = normalizeInitialDocuments(
  props.initialDocuments !== undefined ? props.initialDocuments : windowSsrDocs
)

const rawInitialError = typeof props.initialError === 'string' ? props.initialError : windowSsrError
const initialError = typeof rawInitialError === 'string' && rawInitialError.length > 0 ? rawInitialError : ''
const hasSSRBootstrap = props.initialDocuments !== undefined || Array.isArray(windowSsrDocs) || !!initialError

const documents = ref<DocumentItem[]>(initialDocuments)
const loading = ref(false)
const loadingInitial = ref(!hasSSRBootstrap)
const uploading = ref(false)
const deleting = ref(false)
const error = ref(initialError)
const successMessage = ref('')

const searchQuery = ref('')
const sortBy = ref<'updated' | 'name' | 'size'>('updated')
const selectedDocuments = ref<Set<string>>(new Set())
const lastSelectedIndex = ref<number | null>(null)

const showSettings = ref(false)
const settingsSaving = ref(false)
const settingsSaved = ref(false)
const settingsError = ref('')
const baseUrl = ref('')
const adminToken = ref('')
const defaultTheme = ref<ThemeValue>('dark')

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const presetDirectives = ['shared', 'chatium', 'llm', 'crm', 'support', 'internal']
const directiveInput = ref('shared')
const activeDirective = ref('shared')
const directiveDocs = ref<DocumentItem[]>([])
const directiveLoading = ref(false)
const directiveError = ref('')

const createUrl = computed(() => docCreateRoute?.url?.() ?? '#')

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

const selectedCount = computed(() => selectedDocuments.value.size)

const allSelected = computed(() => {
  if (!filteredDocuments.value.length) return false
  return filteredDocuments.value.every((item) => selectedDocuments.value.has(item.key))
})

const directivePublicUrl = computed(() => {
  if (!publicPageRoute || typeof publicPageRoute.query !== 'function') {
    return '#'
  }
  try {
    const withQuery = publicPageRoute.query({ s: activeDirective.value })
    return withQuery?.url?.() ?? '#'
  } catch {
    return '#'
  }
})

const directiveCrawlUrl = computed(() => {
  if (!crawlPageRoute || typeof crawlPageRoute.query !== 'function') {
    return '#'
  }
  try {
    const withQuery = crawlPageRoute.query({ s: activeDirective.value })
    return withQuery?.url?.() ?? '#'
  } catch {
    return '#'
  }
})

const currentTheme = ref<ThemeValue>(
  normalizeTheme(document.documentElement.getAttribute('data-theme'))
)

function getTimestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function setSuccessMessage(message: string): void {
  successMessage.value = message
  setTimeout(() => {
    if (successMessage.value === message) {
      successMessage.value = ''
    }
  }, 2800)
}

function setTheme(theme: ThemeValue): void {
  const setter = (window as any).__setKnowledgeTheme
  if (typeof setter === 'function') {
    setter(theme)
  } else {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('knowledge-app-theme', theme)
    } catch (error) {
      // ignore storage issue
    }
  }
  currentTheme.value = theme
}

function toggleTheme(): void {
  setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
}

async function loadDocs(refreshFromSource: boolean = false): Promise<void> {
  loading.value = true
  error.value = ''

  const query: Record<string, string> = { limit: '1000' }
  if (refreshFromSource) {
    query.refresh = 'true'
  }

  try {
    const result = await listDocsRoute.query(query).run(ctx)

    if (result.success) {
      documents.value = normalizeInitialDocuments(result.data?.items)
      if (selectedDocuments.value.size > 0) {
        const validKeys = new Set(documents.value.map((item) => item.key))
        selectedDocuments.value = new Set(
          [...selectedDocuments.value].filter((key) => validKeys.has(key))
        )
      }
    } else {
      error.value = result.error || 'Failed to load documents'
    }
  } catch (loadError) {
    error.value = String(loadError)
  } finally {
    loading.value = false
    loadingInitial.value = false
  }
}

async function loadDirectiveDocs(refreshFromSource: boolean = false): Promise<void> {
  directiveLoading.value = true
  directiveError.value = ''

  const query: Record<string, string> = {
    s: activeDirective.value,
    limit: '300'
  }
  if (refreshFromSource) {
    query.refresh = 'true'
  }

  try {
    const result = await listSharedDocsRoute.query(query).run(ctx)

    if (result.success) {
      directiveDocs.value = normalizeInitialDocuments(result.data?.items)
    } else {
      directiveError.value = result.error || 'Не удалось загрузить список документов'
      directiveDocs.value = []
    }
  } catch (loadError) {
    directiveError.value = String(loadError)
    directiveDocs.value = []
  } finally {
    directiveLoading.value = false
  }
}

function applyDirective(value: string): void {
  activeDirective.value = normalizeDirective(value)
  directiveInput.value = activeDirective.value
  void loadDirectiveDocs()
}

function applyCustomDirective(): void {
  activeDirective.value = normalizeDirective(directiveInput.value)
  directiveInput.value = activeDirective.value
  void loadDirectiveDocs()
}

function openSettings(): void {
  showSettings.value = true
  settingsSaved.value = false
  settingsError.value = ''
  void loadSettings()
}

async function loadSettings(): Promise<void> {
  settingsError.value = ''

  try {
    const [baseResult, tokenResult, themeResult] = await Promise.all([
      getSettingRoute.query({ key: 'baseUrl' }).run(ctx),
      getSettingRoute.query({ key: 'adminToken' }).run(ctx),
      getDefaultThemeRoute.run(ctx)
    ])

    if (baseResult.success && typeof baseResult.value === 'string') {
      baseUrl.value = baseResult.value
    }

    if (tokenResult.success && typeof tokenResult.value === 'string') {
      adminToken.value = tokenResult.value
    }

    if (themeResult.success) {
      defaultTheme.value = normalizeTheme(themeResult.theme)
    }
  } catch (loadError) {
    settingsError.value = String(loadError)
  }
}

async function saveSettings(): Promise<void> {
  settingsSaving.value = true
  settingsSaved.value = false
  settingsError.value = ''

  try {
    const writes: Array<Promise<any>> = [saveDefaultThemeRoute.run(ctx, { theme: defaultTheme.value })]

    if (baseUrl.value.trim().length > 0) {
      writes.push(saveSettingRoute.run(ctx, { key: 'baseUrl', value: baseUrl.value.trim() }))
    }

    if (adminToken.value.trim().length > 0) {
      writes.push(saveSettingRoute.run(ctx, { key: 'adminToken', value: adminToken.value.trim() }))
    }

    const results = await Promise.all(writes)
    const failed = results.find((item) => !item.success)

    if (failed) {
      throw new Error(failed.error || 'Failed to save settings')
    }

    settingsSaved.value = true
    setTheme(defaultTheme.value)
    setSuccessMessage('Settings updated')
  } catch (saveError) {
    settingsError.value = String(saveError)
  } finally {
    settingsSaving.value = false
  }
}

function getViewUrl(filename: string): string {
  try {
    const route = docViewRoute?.query?.({ f: filename, admin: '1' })
    return route?.url?.() ?? '#'
  } catch {
    return '#'
  }
}

function getPublicViewUrl(filename: string): string {
  try {
    const route = docViewRoute?.query?.({ f: filename })
    return route?.url?.() ?? '#'
  } catch {
    return '#'
  }
}

function getEditUrl(filename: string): string {
  try {
    const route = docEditRoute?.query?.({ f: filename })
    return route?.url?.() ?? '#'
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

function clearSelection(): void {
  selectedDocuments.value = new Set()
  lastSelectedIndex.value = null
}

function toggleSelectAll(): void {
  const next = new Set(selectedDocuments.value)

  if (allSelected.value) {
    filteredDocuments.value.forEach((item) => next.delete(item.key))
  } else {
    filteredDocuments.value.forEach((item) => next.add(item.key))
  }

  selectedDocuments.value = next
}

function toggleDocumentSelection(key: string, index: number, event: MouseEvent): void {
  const next = new Set(selectedDocuments.value)

  if (event.shiftKey && lastSelectedIndex.value !== null) {
    const start = Math.min(lastSelectedIndex.value, index)
    const end = Math.max(lastSelectedIndex.value, index)
    const shouldSelect = !next.has(key)

    for (let i = start; i <= end; i += 1) {
      const item = filteredDocuments.value[i]
      if (!item) continue
      if (shouldSelect) {
        next.add(item.key)
      } else {
        next.delete(item.key)
      }
    }
  } else {
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    lastSelectedIndex.value = index
  }

  selectedDocuments.value = next
}

async function deleteMany(keys: string[]): Promise<void> {
  if (!keys.length) return

  deleting.value = true
  error.value = ''

  try {
    let deleted = 0

    for (const key of keys) {
      const result = await deleteDocRoute.run(ctx, { filename: key })
      if (result.success) {
        deleted += 1
      }
    }

    if (deleted === 0) {
      throw new Error('No files were deleted')
    }

    clearSelection()
    setSuccessMessage(`Deleted: ${deleted}`)

    await Promise.all([loadDocs(true), loadDirectiveDocs(true)])
  } catch (deleteError) {
    error.value = String(deleteError)
  } finally {
    deleting.value = false
  }
}

async function deleteSingle(filename: string): Promise<void> {
  const confirmed = window.confirm(`Delete ${filename}?`)
  if (!confirmed) return
  await deleteMany([filename])
}

async function deleteSelected(): Promise<void> {
  const keys = [...selectedDocuments.value]
  if (!keys.length) return

  const confirmed = window.confirm(`Delete ${keys.length} selected files?`)
  if (!confirmed) return

  await deleteMany(keys)
}

function triggerFileUpload(): void {
  fileInput.value?.click()
}

async function uploadFiles(files: File[]): Promise<void> {
  if (!files.length) return

  uploading.value = true
  error.value = ''

  try {
    let successCount = 0

    for (const file of files) {
      const markdown = await file.text()
      const filename = normalizeUploadFilename(file.name)

      const result = await putDocRoute.run(ctx, {
        filename,
        markdown
      })

      if (result.success) {
        successCount += 1
      }
    }

    if (successCount === 0) {
      throw new Error('Upload failed for all files')
    }

    setSuccessMessage(`Uploaded: ${successCount}`)
    await Promise.all([loadDocs(true), loadDirectiveDocs(true)])
  } catch (uploadError) {
    error.value = String(uploadError)
  } finally {
    uploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input?.files ? Array.from(input.files) : []
  await uploadFiles(files)
}

function onDragEnter(): void {
  isDragging.value = true
}

function onDragOver(): void {
  isDragging.value = true
}

function onDragLeave(event: DragEvent): void {
  if (!event.currentTarget) {
    isDragging.value = false
    return
  }

  const target = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as Node | null

  if (relatedTarget && target.contains(relatedTarget)) {
    return
  }

  isDragging.value = false
}

async function onDrop(event: DragEvent): Promise<void> {
  isDragging.value = false
  const droppedFiles = event.dataTransfer?.files
  if (!droppedFiles || droppedFiles.length === 0) return

  await uploadFiles(Array.from(droppedFiles))
}

onMounted(async () => {
  currentTheme.value = normalizeTheme(document.documentElement.getAttribute('data-theme'))

  if (!hasSSRBootstrap) {
    await loadDocs()
  } else {
    loadingInitial.value = false
  }

  await loadDirectiveDocs()
})
</script>