<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createComponentLogger } from '../../shared/logger'
import WysiwygEditor from './WysiwygEditor.vue'

const log = createComponentLogger('NotebookNoteEditor')

type CategoryDto = { id: string; name: string; color: string }
type FolderDto = { id: string; name: string; color: string }
type TaskClientDto = { id: string; name: string }
type TaskProjectDto = { id: string; clientId: string; name: string }
type TaskItemDto = { id: string; projectId: string; title: string }

type NoteFullData = {
  id: string
  title: string
  content: string
  folderId: string | null
  categoryIds: string[]
  linkedTaskId: string | null
  linkedProjectId: string | null
  linkedClientId: string | null
  noteDate: string | null
  isArchived: boolean
}

const props = defineProps<{
  noteId: string | null
  isCreate: boolean
  categories: CategoryDto[]
  folders: FolderDto[]
  taskClients: TaskClientDto[]
  taskProjects: TaskProjectDto[]
  taskItems: TaskItemDto[]
  journalNotesGetUrl: string
  journalNotesCreateUrl: string
  journalNotesUpdateUrl: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'saved', note: { id: string; title: string }): void
  (e: 'deleted', id: string): void
}>()

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const title = ref('')
const content = ref('')
const folderId = ref<string | null>(null)
const selectedCategoryIds = ref<string[]>([])
const linkedClientId = ref<string | null>(null)
const linkedProjectId = ref<string | null>(null)
const linkedTaskId = ref<string | null>(null)
const noteDate = ref<string | null>(null)
const noteDateInput = ref('')
const isArchived = ref(false)

const catDropOpen = ref(false)
const exportDropOpen = ref(false)

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  if (!props.isCreate && props.noteId) {
    await loadNote(props.noteId)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

async function loadNote(id: string) {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${props.journalNotesGetUrl}?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = await res.json() as { success?: boolean; note?: NoteFullData; error?: string }
    if (data.success && data.note) {
      title.value = data.note.title
      content.value = data.note.content
      folderId.value = data.note.folderId
      selectedCategoryIds.value = data.note.categoryIds ?? []
      linkedClientId.value = data.note.linkedClientId
      linkedProjectId.value = data.note.linkedProjectId
      linkedTaskId.value = data.note.linkedTaskId
      noteDate.value = data.note.noteDate
      noteDateInput.value = formatDateForInput(data.note.noteDate)
      isArchived.value = data.note.isArchived
    } else {
      error.value = data.error || 'Не удалось загрузить заметку'
    }
  } catch (e) {
    error.value = 'Ошибка сети'
    log.error('Загрузка заметки', { error: String(e) })
  } finally {
    loading.value = false
  }
}

function formatDateForInput(value: string | null): string {
  if (!value) return ''
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

function parseDateInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const parsed = new Date(year, month - 1, day)
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`
    }
    return ''
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const day = Number(isoMatch[3])
    const month = Number(isoMatch[2])
    const year = Number(isoMatch[1])
    const parsed = new Date(year, month - 1, day)
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
    }
    return ''
  }

  return ''
}

function onDateInputBlur() {
  const parsed = parseDateInput(noteDateInput.value)
  if (parsed === '') {
    error.value = 'Дата должна быть в формате dd/mm/yyyy'
    return
  }
  noteDate.value = parsed
  noteDateInput.value = formatDateForInput(parsed)
}

function onDateInput(e: Event) {
  const inputEvent = e as InputEvent
  const isDeleting = inputEvent.inputType?.startsWith('delete') ?? false
  const raw = noteDateInput.value.replace(/\D/g, '').slice(0, 8)

  let formatted = ''
  if (raw.length <= 2) {
    formatted = raw
    if (!isDeleting && raw.length === 2) formatted += '/'
  } else if (raw.length <= 4) {
    formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`
    if (!isDeleting && raw.length === 4) formatted += '/'
  } else {
    formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`
  }

  noteDateInput.value = formatted
}

async function save() {
  const t = title.value.trim()
  if (!t) {
    error.value = 'Введите название заметки'
    return
  }
  const parsedDate = parseDateInput(noteDateInput.value)
  if (parsedDate === '') {
    error.value = 'Дата должна быть в формате dd/mm/yyyy'
    return
  }
  noteDate.value = parsedDate
  saving.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      title: t,
      content: content.value,
      folderId: folderId.value || '',
      categoryIds: selectedCategoryIds.value,
      linkedTaskId: linkedTaskId.value || '',
      linkedProjectId: linkedProjectId.value || '',
      linkedClientId: linkedClientId.value || '',
      noteDate: noteDate.value || ''
    }
    if (!props.isCreate) {
      body.id = props.noteId
      body.isArchived = isArchived.value
    }
    const url = props.isCreate ? props.journalNotesCreateUrl : props.journalNotesUpdateUrl
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json() as { success?: boolean; note?: { id: string; title: string }; error?: string }
    if (data.success && data.note) {
      emit('saved', data.note)
    } else {
      error.value = data.error || 'Не удалось сохранить'
    }
  } catch (e) {
    error.value = 'Ошибка сети'
    log.error('Сохранение заметки', { error: String(e) })
  } finally {
    saving.value = false
  }
}

function toggleCategory(id: string) {
  const idx = selectedCategoryIds.value.indexOf(id)
  if (idx >= 0) {
    selectedCategoryIds.value.splice(idx, 1)
  } else {
    selectedCategoryIds.value.push(id)
  }
}

function filteredProjects() {
  if (!linkedClientId.value) return props.taskProjects
  return props.taskProjects.filter((p) => p.clientId === linkedClientId.value)
}

function filteredTasks() {
  if (!linkedProjectId.value) return props.taskItems
  return props.taskItems.filter((t) => t.projectId === linkedProjectId.value)
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.nb-editor-export-wrap')) {
    exportDropOpen.value = false
  }
}

function safeFileName(rawTitle: string, ext: string): string {
  const base = (rawTitle.trim() || 'journal-note')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
  return `${base || 'journal-note'}.${ext}`
}

function downloadAsFile(textValue: string, ext: string, mimeType: string) {
  const blob = new Blob([textValue], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeFileName(title.value, ext)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const text = doc.body.textContent ?? ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

function inlineToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (!(node instanceof HTMLElement)) return ''

  const tag = node.tagName.toLowerCase()
  const inner = Array.from(node.childNodes).map(inlineToMarkdown).join('')

  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `*${inner}*`
  if (tag === 'u') return `<u>${inner}</u>`
  if (tag === 's' || tag === 'strike') return `~~${inner}~~`
  if (tag === 'code') return `\`${inner}\``
  if (tag === 'a') {
    const href = node.getAttribute('href') || '#'
    return `[${inner || href}](${href})`
  }
  if (tag === 'br') return '\n'
  return inner
}

function listToMarkdown(listEl: HTMLElement, level = 0): string {
  const isOrdered = listEl.tagName.toLowerCase() === 'ol'
  const items = Array.from(listEl.children).filter((x): x is HTMLElement => x.tagName.toLowerCase() === 'li')
  return items.map((item, i) => {
    const prefix = isOrdered ? `${i + 1}. ` : '- '
    const indent = '  '.repeat(level)
    const own = Array.from(item.childNodes)
      .filter((child) => !(child instanceof HTMLElement && (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol')))
      .map(inlineToMarkdown)
      .join('')
      .trim()
    const nested = Array.from(item.children)
      .filter((child): child is HTMLElement => child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol')
      .map((child) => `\n${listToMarkdown(child, level + 1)}`)
      .join('')
    return `${indent}${prefix}${own}${nested}`
  }).join('\n')
}

function blockToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').trim()
  if (!(node instanceof HTMLElement)) return ''

  const tag = node.tagName.toLowerCase()
  const text = Array.from(node.childNodes).map(inlineToMarkdown).join('').trim()

  if (tag === 'h1') return `# ${text}`
  if (tag === 'h2') return `## ${text}`
  if (tag === 'h3') return `### ${text}`
  if (tag === 'h4') return `#### ${text}`
  if (tag === 'h5') return `##### ${text}`
  if (tag === 'h6') return `###### ${text}`
  if (tag === 'blockquote') return text.split('\n').map((line) => `> ${line}`).join('\n')
  if (tag === 'pre') {
    const lang = node.dataset?.language || ''
    return `\`\`\`${lang}\n${node.textContent?.trim() || ''}\n\`\`\``
  }
  if (tag === 'hr') return '---'
  if (tag === 'ul' || tag === 'ol') return listToMarkdown(node)
  if (tag === 'p' || tag === 'div') return text
  if (tag === 'table') return text
  return text
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const blocks = Array.from(doc.body.childNodes)
    .map(blockToMarkdown)
    .map((x) => x.trim())
    .filter(Boolean)
  return blocks.join('\n\n').trim()
}

function getEditorHtml(): string {
  return content.value || '<p><br></p>'
}

function exportAsTxt() {
  const plain = htmlToPlainText(getEditorHtml())
  downloadAsFile(plain, 'txt', 'text/plain')
  exportDropOpen.value = false
}

function exportAsMarkdown() {
  const md = htmlToMarkdown(getEditorHtml())
  downloadAsFile(md, 'md', 'text/markdown')
  exportDropOpen.value = false
}

function escapePrintHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function exportAsPdf() {
  const printWindow = window.open('', '_blank', 'width=980,height=760')
  if (!printWindow) {
    error.value = 'Не удалось открыть окно печати. Разрешите всплывающие окна.'
    return
  }

  const currentTitle = title.value.trim() || 'Без названия'
  const printableBody = getEditorHtml()

  const html = `
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapePrintHtml(currentTitle)}</title>
  <style>
    body { margin: 0; padding: 24px; font-family: Georgia, "Times New Roman", serif; color: #111; background: #fff; }
    .doc { max-width: 820px; margin: 0 auto; }
    h1.doc-title { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
    .doc-meta { margin: 0 0 20px; color: #666; font-size: 13px; }
    .doc-content { font-size: 16px; line-height: 1.6; word-break: break-word; }
    .doc-content img, .doc-content video, .doc-content iframe { max-width: 100%; height: auto; }
    .doc-content table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    .doc-content th, .doc-content td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    .doc-content pre { background: #f6f6f6; border: 1px solid #e3e3e3; padding: 12px; overflow: auto; }
    .doc-content blockquote { margin: 12px 0; padding-left: 12px; border-left: 3px solid #bbb; color: #444; }
    @media print {
      body { padding: 0; }
      .doc { max-width: none; }
    }
  </style>
</head>
<body>
  <article class="doc">
    <h1 class="doc-title">${escapePrintHtml(currentTitle)}</h1>
    <section class="doc-content">${printableBody}</section>
  </article>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 120)
  exportDropOpen.value = false
}
</script>

<template>
  <div class="nb-editor">
    <div class="nb-editor-topbar">
      <button type="button" class="nb-editor-back" @click="emit('back')">
        <i class="fa-solid fa-arrow-left" aria-hidden="true" />
        <span>Назад к списку</span>
      </button>
      <div class="nb-editor-topbar-right">
        <label
          v-if="!props.isCreate"
          class="nb-editor-archive-check"
          :class="{ 'nb-editor-archive-check--active': isArchived }"
        >
          <input type="checkbox" v-model="isArchived" />
          <i class="fa-solid fa-box-archive" aria-hidden="true" />
          <span>В архиве</span>
        </label>
        <div class="nb-editor-export-wrap">
          <button type="button" class="nb-editor-export-btn" @click.stop="exportDropOpen = !exportDropOpen">
            <i class="fa-solid fa-file-export" aria-hidden="true" />
            <span>Экспорт</span>
            <i class="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
          <div v-if="exportDropOpen" class="nb-editor-export-drop">
            <button type="button" class="nb-editor-export-item" @click="exportAsTxt">Скачать TXT (без разметки)</button>
            <button type="button" class="nb-editor-export-item" @click="exportAsMarkdown">Скачать MD (с разметкой)</button>
            <button type="button" class="nb-editor-export-item" @click="exportAsPdf">Печать в PDF…</button>
          </div>
        </div>
        <button
          type="button"
          class="nb-editor-save"
          :disabled="saving"
          @click="save"
        >
          <span v-if="saving" class="nb-editor-spinner" />
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="nb-editor-loading">Загрузка…</div>

    <div v-else class="nb-editor-body">
      <div class="nb-editor-main">
        <input
          v-model="title"
          type="text"
          class="nb-editor-title-input"
          maxlength="500"
          placeholder="Название заметки"
          autocomplete="off"
        />
        <WysiwygEditor
          v-model="content"
          placeholder="Содержимое заметки"
        />
        <p v-if="error" class="nb-editor-error" role="alert">{{ error }}</p>
      </div>

      <aside class="nb-editor-meta">
        <div class="nb-editor-meta-section">
          <label class="nb-editor-meta-label">Папка</label>
          <select v-model="folderId" class="nb-editor-select">
            <option :value="null">— без папки —</option>
            <option v-for="f in props.folders" :key="f.id" :value="f.id">
              {{ f.name }}
            </option>
          </select>
        </div>

        <div class="nb-editor-meta-section">
          <label class="nb-editor-meta-label">Категории</label>
          <div class="nb-editor-cat-wrap">
            <button type="button" class="nb-editor-cat-btn" @click="catDropOpen = !catDropOpen">
              {{ selectedCategoryIds.length ? selectedCategoryIds.length + ' выбрано' : 'Выбрать' }}
              <i class="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>
            <div v-if="catDropOpen" class="nb-editor-cat-drop">
              <label
                v-for="cat in props.categories"
                :key="cat.id"
                class="nb-editor-cat-item"
              >
                <input
                  type="checkbox"
                  :checked="selectedCategoryIds.includes(cat.id)"
                  @change="toggleCategory(cat.id)"
                />
                <span class="nb-editor-cat-dot" :style="{ background: cat.color }" />
                <span>{{ cat.name }}</span>
              </label>
              <p v-if="!props.categories.length" class="nb-editor-cat-empty">Нет категорий</p>
            </div>
          </div>
        </div>

        <div class="nb-editor-meta-section">
          <label class="nb-editor-meta-label">Дата</label>
          <input
            v-model="noteDateInput"
            type="text"
            class="nb-editor-date-input"
            inputmode="numeric"
            placeholder="dd/mm/yyyy"
            autocomplete="off"
            @input="onDateInput"
            @blur="onDateInputBlur"
          />
        </div>

        <div class="nb-editor-meta-section">
          <label class="nb-editor-meta-label">Привязка</label>
          <select v-model="linkedClientId" class="nb-editor-select" @change="linkedProjectId = null; linkedTaskId = null">
            <option :value="null">— клиент —</option>
            <option v-for="c in props.taskClients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <select v-model="linkedProjectId" class="nb-editor-select" @change="linkedTaskId = null">
            <option :value="null">— проект —</option>
            <option v-for="p in filteredProjects()" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <select v-model="linkedTaskId" class="nb-editor-select">
            <option :value="null">— задача —</option>
            <option v-for="t in filteredTasks()" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.nb-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 50vh;
}

.nb-editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.7rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: 0.4rem;
}

.nb-editor-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0.25rem 0.35rem;
  transition: var(--transition);
}

.nb-editor-back:hover {
  color: var(--color-text);
}

.nb-editor-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Как .nb-inbox-filter-btn / .nb-inbox-filter-btn--active (JournalInboxPane) */
.nb-editor-archive-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0.25rem 0.45rem;
  font-family: inherit;
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.nb-editor-archive-check:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.nb-editor-archive-check--active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.nb-editor-archive-check:has(input:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
}

.nb-editor-archive-check input[type='checkbox'] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.nb-editor-save {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.65rem;
  font-family: inherit;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  background: var(--color-accent-light);
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.nb-editor-export-wrap {
  position: relative;
}

.nb-editor-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.3rem 0.58rem;
  font-family: inherit;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.nb-editor-export-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.nb-editor-export-drop {
  position: absolute;
  top: calc(100% + 0.2rem);
  right: 0;
  min-width: 13.5rem;
  z-index: 80;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.nb-editor-export-item {
  text-align: left;
  font-family: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: 0.45rem 0.55rem;
  cursor: pointer;
}

.nb-editor-export-item:last-child {
  border-bottom: none;
}

.nb-editor-export-item:hover {
  background: var(--color-accent-light);
  color: var(--color-text);
}

.nb-editor-save:hover:not(:disabled) {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
  color: #fff;
}

.nb-editor-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nb-editor-spinner {
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--color-border-light);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: nb-spin 0.7s linear infinite;
}

@keyframes nb-spin {
  to { transform: rotate(360deg); }
}

.nb-editor-loading {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.nb-editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.nb-editor-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0.7rem;
  gap: 0.5rem;
}

.nb-editor-title-input {
  width: 100%;
  padding: 0.5rem 0.55rem;
  font-family: inherit;
  font-size: 1.06rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  box-sizing: border-box;
  letter-spacing: 0.03em;
}

.nb-editor-title-input:focus {
  border-color: var(--color-accent);
  outline: none;
}

.nb-editor-main :deep(.wy-editor-wrap) {
  flex: 1;
  min-height: 20rem;
}

.nb-editor-error {
  margin: 0;
  font-size: 0.86rem;
  color: var(--color-accent-hover);
}

.nb-editor-meta {
  width: 14rem;
  flex-shrink: 0;
  border-left: 1px solid var(--color-border);
  padding: 0.7rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  overflow-y: auto;
}

.nb-editor-meta-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nb-editor-meta-label {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.nb-editor-select {
  width: 100%;
  padding: 0.3rem 0.35rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  box-sizing: border-box;
}

.nb-editor-date-input {
  width: 100%;
  padding: 0.3rem 0.35rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  box-sizing: border-box;
}

.nb-editor-cat-wrap {
  position: relative;
}

.nb-editor-cat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
  padding: 0.3rem 0.35rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  box-sizing: border-box;
}

.nb-editor-cat-btn i {
  font-size: 0.74rem;
}

.nb-editor-cat-drop {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 0.15rem;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  max-height: 12rem;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.nb-editor-cat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.4rem;
  cursor: pointer;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.nb-editor-cat-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.nb-editor-cat-item input {
  accent-color: var(--color-accent);
  width: 12px;
  height: 12px;
}

.nb-editor-cat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nb-editor-cat-empty {
  margin: 0;
  padding: 0.3rem 0.4rem;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

@media (max-width: 900px) {
  .nb-editor-body {
    flex-direction: column;
  }

  .nb-editor-meta {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--color-border);
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .nb-editor-meta-section {
    flex: 1;
    min-width: 8rem;
  }
}
</style>
