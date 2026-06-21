<script setup lang="ts">
import { computed, ref } from 'vue'
import { createComponentLogger } from '../../shared/logger'
import NotebookBulkBar from './NotebookBulkBar.vue'

const log = createComponentLogger('JournalInboxPane')

type NoteSummary = {
  id: string
  title: string
  folderId: string | null
  categoryIds: string[]
  linkedTaskId: string | null
  linkedProjectId: string | null
  linkedClientId: string | null
  noteDate: string | null
  isArchived: boolean
  sortOrder: number
}

const props = defineProps<{
  notes: NoteSummary[]
  isAuthenticated: boolean
  inboxNotesCreateUrl?: string
  inboxNotesGetUrl?: string
  inboxNotesUpdateUrl?: string
  inboxNotesArchiveUrl?: string
  inboxNotesDeleteUrl?: string
}>()

const emit = defineEmits<{
  noteCreated: [note: { id: string; title: string }]
  noteUpdated: [note: { id: string; title: string }]
  noteDeleted: [id: string]
  foldersChanged: []
  categoriesChanged: []
}>()

const mode = ref<'list' | 'editor'>('list')
const editingNoteId = ref<string | null>(null)
const isCreatingNote = ref(false)
const editContent = ref('')
const editIsArchived = ref(false)
const loadingNote = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const showArchived = ref(false)
const selectedNoteIds = ref<string[]>([])

function htmlToPlainText(html: string): string {
  const raw = html.trim()
  if (!raw) return ''
  if (typeof document === 'undefined') {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const d = document.createElement('div')
  d.innerHTML = raw
  return (d.innerText || d.textContent || '').trim()
}

function deriveTitleFromContent(text: string): string {
  const plain = text.replace(/\r\n/g, '\n').trim()
  const firstLine = plain.split('\n')[0]?.trim() ?? ''
  if (firstLine.length > 0) return firstLine.slice(0, 120)
  return 'Заметка'
}

function previewLine(note: NoteSummary): string {
  const t = note.title?.trim() ?? ''
  if (t) return t.length > 220 ? `${t.slice(0, 220)}...` : t
  return 'Пустая заметка'
}

/** Одна строка заголовка в списке (клик открывает редактор). */
function inboxCardTitle(note: NoteSummary): string {
  const t = note.title?.trim() ?? ''
  if (t) return t.length > 100 ? `${t.slice(0, 100)}…` : t
  return 'Пустая заметка'
}

function inboxShowSnippet(note: NoteSummary): boolean {
  return previewLine(note) !== inboxCardTitle(note)
}

function toggleSelect(id: string) {
  const idx = selectedNoteIds.value.indexOf(id)
  if (idx >= 0) {
    selectedNoteIds.value.splice(idx, 1)
  } else {
    selectedNoteIds.value.push(id)
  }
}

function clearSelection() {
  selectedNoteIds.value = []
}

/** Клик по карточке: выделение (как `nb-card-body` в блокноте). Кнопка заголовка с `@click.stop` не попадает сюда. */
function onInboxCardClick(e: MouseEvent, n: NoteSummary) {
  const el = e.target as HTMLElement | null
  if (!el) return
  if (el.closest('.nb-inbox-card-actions')) return
  if (el.closest('.nb-inbox-card-title')) return
  toggleSelect(n.id)
}

const displayNotes = computed(() => {
  let list = props.notes
  if (showArchived.value) {
    list = list.filter((n) => n.isArchived)
  } else {
    list = list.filter((n) => !n.isArchived)
  }
  return [...list].sort((a, b) => b.sortOrder - a.sortOrder)
})

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

function openCreate() {
  clearSelection()
  editingNoteId.value = null
  isCreatingNote.value = true
  editContent.value = ''
  editIsArchived.value = false
  errorMsg.value = ''
  mode.value = 'editor'
}

async function openEdit(noteId: string) {
  if (!props.inboxNotesGetUrl) return
  clearSelection()
  editingNoteId.value = noteId
  isCreatingNote.value = false
  errorMsg.value = ''
  loadingNote.value = true
  mode.value = 'editor'
  try {
    const res = await fetch(`${props.inboxNotesGetUrl}?id=${encodeURIComponent(noteId)}`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = await res.json() as {
      success?: boolean
      note?: { content: string; isArchived: boolean }
      error?: string
    }
    if (data.success && data.note) {
      editContent.value = htmlToPlainText(data.note.content ?? '')
      editIsArchived.value = data.note.isArchived ?? false
    } else {
      errorMsg.value = data.error || 'Не удалось загрузить заметку'
    }
  } catch (e) {
    errorMsg.value = 'Ошибка сети'
    log.error('Загрузка заметки', { error: String(e) })
  } finally {
    loadingNote.value = false
  }
}

function backToList() {
  mode.value = 'list'
  editingNoteId.value = null
  isCreatingNote.value = false
  editContent.value = ''
  errorMsg.value = ''
  clearSelection()
}

async function saveNote() {
  const title = deriveTitleFromContent(editContent.value)
  const content = editContent.value
  if (!props.inboxNotesCreateUrl || !props.inboxNotesUpdateUrl) return
  saving.value = true
  errorMsg.value = ''
  try {
    if (isCreatingNote.value) {
      const data = await postJson(props.inboxNotesCreateUrl, { title, content }) as {
        success?: boolean
        note?: { id: string; title: string }
        error?: string
      }
      if (data.success && data.note) {
        emit('noteCreated', data.note)
        editingNoteId.value = data.note.id
        isCreatingNote.value = false
      } else {
        errorMsg.value = data.error || 'Не удалось создать заметку'
      }
    } else if (editingNoteId.value) {
      const data = await postJson(props.inboxNotesUpdateUrl, {
        id: editingNoteId.value,
        title,
        content
      }) as { success?: boolean; note?: { id: string; title: string }; error?: string }
      if (data.success && data.note) {
        emit('noteUpdated', data.note)
      } else {
        errorMsg.value = data.error || 'Не удалось сохранить'
      }
    }
  } catch (e) {
    errorMsg.value = 'Ошибка сети'
    log.error('Сохранение заметки', { error: String(e) })
  } finally {
    saving.value = false
  }
}

async function setArchivedForNote(id: string, isArchived: boolean) {
  if (!props.inboxNotesArchiveUrl) return
  try {
    const data = await postJson(props.inboxNotesArchiveUrl, { id, isArchived }) as { success?: boolean }
    if (data.success) {
      emit('noteUpdated', { id, title: '' })
      if (editingNoteId.value === id) {
        editIsArchived.value = isArchived
        if (isArchived) backToList()
      }
    }
  } catch (e) {
    log.error('Архивация', { error: String(e) })
  }
}

async function archiveFromList(id: string) {
  await setArchivedForNote(id, true)
}

async function unarchiveFromList(id: string) {
  await setArchivedForNote(id, false)
}

async function archiveFromEditor() {
  if (!editingNoteId.value) return
  await setArchivedForNote(editingNoteId.value, true)
}

async function unarchiveFromEditor() {
  if (!editingNoteId.value) return
  await setArchivedForNote(editingNoteId.value, false)
}

async function onBulkArchive() {
  if (!props.inboxNotesArchiveUrl || !selectedNoteIds.value.length) return
  const ids = [...selectedNoteIds.value]
  let anyOk = false
  for (const id of ids) {
    const data = (await postJson(props.inboxNotesArchiveUrl, { id, isArchived: true })) as { success?: boolean }
    if (data.success) anyOk = true
  }
  clearSelection()
  if (anyOk) emit('noteUpdated', { id: ids[0] ?? '', title: '' })
}

async function onBulkUnarchive() {
  if (!props.inboxNotesArchiveUrl || !selectedNoteIds.value.length) return
  const ids = [...selectedNoteIds.value]
  let anyOk = false
  for (const id of ids) {
    const data = (await postJson(props.inboxNotesArchiveUrl, { id, isArchived: false })) as { success?: boolean }
    if (data.success) anyOk = true
  }
  clearSelection()
  if (anyOk) emit('noteUpdated', { id: ids[0] ?? '', title: '' })
}

async function onBulkDelete() {
  if (!props.inboxNotesDeleteUrl || !selectedNoteIds.value.length) return
  if (!confirm('Удалить выбранные заметки?')) return
  const ids = [...selectedNoteIds.value]
  for (const id of ids) {
    const data = (await postJson(props.inboxNotesDeleteUrl, { id })) as { success?: boolean }
    if (data.success) emit('noteDeleted', id)
  }
  clearSelection()
}

const bulkSelectionAllArchived = computed(() => {
  if (!selectedNoteIds.value.length) return false
  return selectedNoteIds.value.every((id) => {
    const n = props.notes.find((x) => x.id === id)
    return n?.isArchived === true
  })
})

async function deleteFromList(id: string) {
  if (!props.inboxNotesDeleteUrl) return
  if (!confirm('Удалить заметку?')) return
  try {
    const data = (await postJson(props.inboxNotesDeleteUrl, { id })) as { success?: boolean }
    if (data.success) emit('noteDeleted', id)
  } catch (e) {
    log.error('Удаление заметки', { error: String(e) })
  }
}
</script>

<template>
  <div class="nb-inbox">
    <p v-if="!props.isAuthenticated" class="nb-inbox-hint">
      Войдите в аккаунт, чтобы создавать и видеть свои заметки.
    </p>

    <template v-else-if="mode === 'editor'">
      <div class="nb-inbox-editor">
        <header class="nb-inbox-editor-head">
          <div class="nb-inbox-editor-head-main">
            <span class="nb-inbox-editor-kicker">{{ isCreatingNote ? 'Создание' : 'Редактирование' }}</span>
            <h2 class="nb-inbox-editor-title">
              {{ isCreatingNote ? 'Новая заметка' : 'Заметка' }}
            </h2>
          </div>
          <p v-if="loadingNote" class="nb-inbox-editor-status" aria-live="polite">Загрузка…</p>
          <p v-else-if="editIsArchived" class="nb-inbox-editor-status nb-inbox-editor-status--muted">В архиве (только чтение)</p>
        </header>
        <p v-if="errorMsg" class="nb-inbox-err" role="alert">{{ errorMsg }}</p>
        <textarea
          v-model="editContent"
          class="nb-inbox-textarea"
          :disabled="loadingNote || editIsArchived"
          rows="16"
          spellcheck="true"
          aria-label="Текст заметки"
        />
        <div class="nb-inbox-actions">
          <button type="button" class="nb-inbox-btn nb-inbox-btn--ghost" @click="backToList">К списку</button>
          <div class="nb-inbox-actions-spacer" />
          <button
            type="button"
            class="nb-inbox-btn nb-inbox-btn--primary"
            :disabled="saving || loadingNote || editIsArchived"
            @click="saveNote"
          >
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
          <button
            v-if="editingNoteId && !editIsArchived"
            type="button"
            class="nb-inbox-btn nb-inbox-btn--archive"
            :disabled="saving || loadingNote"
            @click="archiveFromEditor"
          >
            В архив
          </button>
          <button
            v-if="editingNoteId && editIsArchived"
            type="button"
            class="nb-inbox-btn nb-inbox-btn--ghost"
            :disabled="saving || loadingNote"
            @click="unarchiveFromEditor"
          >
            Вернуть из архива
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="nb-inbox-list" role="region" aria-label="Инбокс">
        <div class="nb-inbox-toolbar">
          <div class="nb-inbox-toolbar-left">
            <button type="button" class="nb-inbox-new-btn" @click="openCreate">
              <i class="fa-solid fa-plus" aria-hidden="true" />
              <span>Новая заметка</span>
            </button>
          </div>
          <div class="nb-inbox-toolbar-right">
            <button
              type="button"
              class="nb-inbox-filter-btn"
              :class="{ 'nb-inbox-filter-btn--active': showArchived }"
              :aria-pressed="showArchived"
              @click="showArchived = !showArchived"
            >
              <i class="fa-solid fa-box-archive" aria-hidden="true" />
              <span>Архив</span>
            </button>
          </div>
        </div>

        <div class="nb-inbox-body">
          <div v-if="!displayNotes.length" class="nb-inbox-empty">
            <p class="nb-inbox-empty-text">
              {{ showArchived ? 'В архиве пусто' : 'Заметок нет' }}
            </p>
          </div>

          <ul v-else class="nb-inbox-cards" role="list">
            <li
              v-for="n in displayNotes"
              :key="n.id"
              class="nb-inbox-card"
              :class="{ 'nb-inbox-card--selected': selectedNoteIds.includes(n.id) }"
              :data-archived="n.isArchived ? '1' : '0'"
              @click="onInboxCardClick($event, n)"
            >
              <div class="nb-inbox-card-body">
                <div class="nb-inbox-title-row">
                  <button type="button" class="nb-inbox-card-title" @click.stop="openEdit(n.id)">
                    {{ inboxCardTitle(n) }}
                  </button>
                  <span v-if="n.isArchived" class="nb-inbox-badge">
                    <i class="fa-solid fa-box-archive" aria-hidden="true" /> Архив
                  </span>
                </div>
                <!-- Вторая строка как `.nb-card-meta` в блокноте: зона клика для выделения, если заголовок один на всю ширину -->
                <div
                  class="nb-inbox-card-meta"
                  :class="{ 'nb-inbox-card-meta--empty': !inboxShowSnippet(n) }"
                >
                  <span v-if="inboxShowSnippet(n)" class="nb-inbox-card-snippet">{{ previewLine(n) }}</span>
                </div>
              </div>
              <div class="nb-inbox-card-actions" @click.stop>
                <button
                  v-if="!n.isArchived"
                  type="button"
                  class="nb-inbox-btn nb-inbox-btn--small"
                  @click="archiveFromList(n.id)"
                >
                  В архив
                </button>
                <template v-else>
                  <button
                    type="button"
                    class="nb-inbox-btn nb-inbox-btn--small nb-inbox-btn--ghost"
                    @click="unarchiveFromList(n.id)"
                  >
                    Вернуть
                  </button>
                  <button
                    type="button"
                    class="nb-inbox-btn nb-inbox-btn--small nb-inbox-btn--danger"
                    title="Удалить"
                    @click="deleteFromList(n.id)"
                  >
                    Удалить
                  </button>
                </template>
              </div>
            </li>
          </ul>

          <NotebookBulkBar
            v-if="selectedNoteIds.length > 0"
            :count="selectedNoteIds.length"
            :folders="[]"
            :show-folder-move="false"
            :show-delete="bulkSelectionAllArchived"
            @archive="onBulkArchive"
            @unarchive="onBulkUnarchive"
            @delete="onBulkDelete"
            @clear-selection="clearSelection"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Согласовано с JournalNotebookPane: nb-pane-new-btn, NotebookFilterBar (.nb-filter), NotebookNoteCard (.nb-card) */
.nb-inbox {
  height: 100%;
  min-height: 14rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
}

.nb-inbox-hint {
  margin: 0;
  padding: 1rem 0.5rem;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.nb-inbox-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0;
}

/* Как .nb-filter */
.nb-inbox-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.nb-inbox-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.nb-inbox-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Как .nb-pane-new-btn */
.nb-inbox-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0.3rem 0.55rem;
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

.nb-inbox-new-btn:hover {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
  color: #fff;
}

.nb-inbox-new-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
}

/* Как .nb-filter-btn / .nb-filter-btn--active */
.nb-inbox-filter-btn {
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

.nb-inbox-filter-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.nb-inbox-filter-btn--active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.nb-inbox-filter-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
}

.nb-inbox-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Как .nb-pane-empty */
.nb-inbox-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 8rem;
  padding: 0.5rem;
}

.nb-inbox-empty-text {
  margin: 0;
  padding: 1rem;
  text-align: center;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Как .nb-pane-list */
.nb-inbox-cards {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
  flex: 1;
  scrollbar-gutter: stable;
}

/* Как .nb-card */
.nb-inbox-card {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.2);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.nb-inbox-card[data-archived='1'] {
  opacity: 0.6;
}

.nb-inbox-card:hover {
  border-color: var(--color-border-light);
}

.nb-inbox-card--selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 8px rgba(211, 35, 75, 0.15);
}

.nb-inbox-card-body {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.6rem 0.45rem 0.5rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.nb-inbox-card-body:hover {
  background: rgba(211, 35, 75, 0.04);
}

.nb-inbox-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.nb-inbox-card-title {
  flex: 0 1 auto;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-family: inherit;
  font-size: 0.97rem;
  letter-spacing: 0.03em;
  line-height: 1.35;
  color: var(--color-text);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.nb-inbox-card-title:hover {
  color: var(--color-accent);
}

.nb-inbox-card-title:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
  border-radius: 2px;
}

/* Как в NotebookNoteCard: `.nb-card-meta` вторая строка под заголовком */
.nb-inbox-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.25rem;
  min-height: 0;
}

.nb-inbox-card-meta--empty {
  min-height: 1.15rem;
}

.nb-inbox-card-snippet {
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* Как .nb-card-badge--archive */
.nb-inbox-badge {
  flex-shrink: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  background: rgba(255, 165, 0, 0.15);
  color: #e0a030;
  border: 1px solid rgba(255, 165, 0, 0.3);
}

.nb-inbox-card-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.3rem;
  padding: 0.35rem 0.45rem;
  border-left: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.15);
}

/* Редактор — отступы как у .nb-pane-list */
.nb-inbox-editor {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 1;
  min-height: 0;
  padding: 0.5rem;
  box-sizing: border-box;
  animation: nb-inbox-fade 0.25s ease;
}

@keyframes nb-inbox-fade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nb-inbox-editor-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 1rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--color-border);
}

.nb-inbox-editor-head-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.nb-inbox-editor-kicker {
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.nb-inbox-editor-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}

.nb-inbox-editor-status {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--color-accent);
}

.nb-inbox-editor-status--muted {
  color: var(--color-text-tertiary);
}

.nb-inbox-err {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-accent-hover);
}

.nb-inbox-textarea {
  width: 100%;
  flex: 1;
  min-height: 14rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 0.5rem 0.55rem;
  resize: vertical;
}

.nb-inbox-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.nb-inbox-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nb-inbox-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  padding-top: 0.15rem;
}

.nb-inbox-actions-spacer {
  flex: 1;
  min-width: 0.5rem;
}

.nb-inbox-btn {
  margin: 0;
  padding: 0.4rem 0.65rem;
  font-family: inherit;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.nb-inbox-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.nb-inbox-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
}

.nb-inbox-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.nb-inbox-btn--primary {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  color: var(--color-text);
}

.nb-inbox-btn--primary:hover:not(:disabled) {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
  color: #fff;
}

.nb-inbox-btn--ghost {
  background: transparent;
  border-color: var(--color-border-light);
}

.nb-inbox-btn--archive {
  border-color: var(--color-border-light);
  color: var(--color-text-secondary);
}

.nb-inbox-btn--archive:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent-hover);
}

.nb-inbox-btn--small {
  font-size: 0.72rem;
  padding: 0.25rem 0.4rem;
  letter-spacing: 0.06em;
}

.nb-inbox-btn--danger {
  border-color: rgba(211, 35, 75, 0.45);
  color: var(--color-accent-hover);
}

.nb-inbox-btn--danger:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.12);
  color: var(--color-accent-hover);
}

@media (max-width: 900px) {
  .nb-inbox-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .nb-inbox-toolbar-left,
  .nb-inbox-toolbar-right {
    justify-content: center;
  }

  .nb-inbox-actions-spacer {
    display: none;
  }

  .nb-inbox-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .nb-inbox-actions .nb-inbox-btn--primary {
    order: -1;
  }
}
</style>
