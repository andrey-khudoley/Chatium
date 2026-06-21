<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createComponentLogger } from '../../shared/logger'
import NotebookFolderSidebar from './NotebookFolderSidebar.vue'
import NotebookFilterBar from './NotebookFilterBar.vue'
import NotebookNoteCard from './NotebookNoteCard.vue'
import NotebookBulkBar from './NotebookBulkBar.vue'
import NotebookNoteEditor from './NotebookNoteEditor.vue'

const log = createComponentLogger('JournalNotebookPane')

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

type FolderDto = { id: string; name: string; color: string; sortOrder: number; isArchived: boolean }
type CategoryDto = { id: string; name: string; color: string; sortOrder: number }
type TaskClientDto = { id: string; name: string }
type TaskProjectDto = { id: string; clientId: string; name: string }
type TaskItemDto = { id: string; projectId: string; title: string }

const props = defineProps<{
  notes: NoteSummary[]
  folders: FolderDto[]
  categories: CategoryDto[]
  isAuthenticated: boolean
  taskClients: TaskClientDto[]
  taskProjects: TaskProjectDto[]
  taskItems: TaskItemDto[]
  journalNotesCreateUrl?: string
  journalNotesGetUrl?: string
  journalNotesUpdateUrl?: string
  journalNotesDeleteUrl?: string
  journalNotesListUrl?: string
  journalNotesReorderUrl?: string
  journalNotesArchiveUrl?: string
  journalNotesMoveUrl?: string
  journalNotesBulkUrl?: string
  notebookFoldersCreateUrl?: string
  notebookFoldersUpdateUrl?: string
  notebookFoldersDeleteUrl?: string
  notebookFoldersReorderUrl?: string
  notebookFoldersArchiveUrl?: string
  notebookCategoriesListUrl?: string
  notebookCategoriesCreateUrl?: string
  notebookCategoriesUpdateUrl?: string
  notebookCategoriesDeleteUrl?: string
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

const activeFolderId = ref<string | null>(null)
const selectedCategoryIds = ref<string[]>([])
const showArchived = ref(false)
const showArchivedFolders = ref(false)
const selectedNoteIds = ref<string[]>([])
const draggingNoteId = ref<string | null>(null)
const catManagerOpen = ref(false)
const newCatName = ref('')
const newCatColor = ref('#d3234b')

const filteredNotes = computed(() => {
  let list = props.notes

  if (activeFolderId.value !== null) {
    list = list.filter((n) => n.folderId === activeFolderId.value)
  }

  if (showArchived.value) {
    list = list.filter((n) => n.isArchived)
  } else {
    list = list.filter((n) => !n.isArchived)
  }

  if (selectedCategoryIds.value.length > 0) {
    list = list.filter((n) =>
      selectedCategoryIds.value.some((cId) => n.categoryIds.includes(cId))
    )
  }

  return list
})

const bulkSelectionAllArchived = computed(() => {
  if (!selectedNoteIds.value.length) return false
  return selectedNoteIds.value.every((id) => {
    const n = props.notes.find((x) => x.id === id)
    return n?.isArchived === true
  })
})

const activeFolders = computed(() => props.folders.filter((f) => !f.isArchived))

function openEditor(noteId: string) {
  editingNoteId.value = noteId
  isCreatingNote.value = false
  mode.value = 'editor'
  log.info('Открыт редактор заметки', { noteId })
}

function openCreateEditor() {
  editingNoteId.value = null
  isCreatingNote.value = true
  mode.value = 'editor'
  log.info('Открыт редактор для новой заметки')
}

function onEditorBack() {
  mode.value = 'list'
  editingNoteId.value = null
  isCreatingNote.value = false
}

function onEditorSaved(note: { id: string; title: string }) {
  if (isCreatingNote.value) {
    emit('noteCreated', note)
    editingNoteId.value = note.id
    isCreatingNote.value = false
  } else {
    emit('noteUpdated', note)
  }
  refreshList()
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

function toggleCategoryFilter(id: string) {
  const idx = selectedCategoryIds.value.indexOf(id)
  if (idx >= 0) {
    selectedCategoryIds.value.splice(idx, 1)
  } else {
    selectedCategoryIds.value.push(id)
  }
}

function clearFilters() {
  selectedCategoryIds.value = []
  showArchived.value = false
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

async function refreshList() {
  if (!props.journalNotesListUrl) return
  try {
    const url = `${props.journalNotesListUrl}?includeArchived=true`
    const res = await fetch(url, { method: 'GET', credentials: 'include' })
    const _data = await res.json()
  } catch (e) {
    log.error('Обновление списка', { error: String(e) })
  }
}

async function bulkAction(action: string, extra?: Record<string, unknown>) {
  if (!props.journalNotesBulkUrl || !selectedNoteIds.value.length) return
  try {
    const data = await postJson(props.journalNotesBulkUrl, {
      ids: selectedNoteIds.value,
      action,
      ...extra
    })
    if (data.success) {
      log.info('Массовое действие', { action, count: data.count })
      clearSelection()
      emit('foldersChanged')
    }
  } catch (e) {
    log.error('Массовое действие', { error: String(e) })
  }
}

async function onBulkArchive() { await bulkAction('archive') }
async function onBulkUnarchive() { await bulkAction('unarchive') }
async function onBulkDelete() {
  if (!confirm('Удалить выбранные заметки?')) return
  await bulkAction('delete')
}

async function archiveNoteFromList(id: string) {
  if (!props.journalNotesArchiveUrl) return
  try {
    const data = (await postJson(props.journalNotesArchiveUrl, { id, isArchived: true })) as { success?: boolean }
    if (data.success) {
      emit('noteUpdated', { id, title: '' })
      emit('foldersChanged')
    }
  } catch (e) {
    log.error('Архивация заметки', { error: String(e) })
  }
}

async function unarchiveNoteFromList(id: string) {
  if (!props.journalNotesArchiveUrl) return
  try {
    const data = (await postJson(props.journalNotesArchiveUrl, { id, isArchived: false })) as { success?: boolean }
    if (data.success) {
      emit('noteUpdated', { id, title: '' })
      emit('foldersChanged')
    }
  } catch (e) {
    log.error('Разархивация заметки', { error: String(e) })
  }
}

async function deleteNoteFromList(id: string) {
  if (!props.journalNotesDeleteUrl) return
  if (!confirm('Удалить заметку?')) return
  try {
    const data = (await postJson(props.journalNotesDeleteUrl, { id })) as { success?: boolean }
    if (data.success) {
      emit('noteDeleted', id)
      emit('foldersChanged')
    }
  } catch (e) {
    log.error('Удаление заметки', { error: String(e) })
  }
}

async function onBulkMove(folderId: string | null) {
  await bulkAction('move', { folderId: folderId ?? '' })
}

async function onCreateFolder() {
  if (!props.notebookFoldersCreateUrl) return
  try {
    const data = await postJson(props.notebookFoldersCreateUrl, {
      name: 'Новая папка',
      color: '#888888'
    })
    if (data.success) {
      emit('foldersChanged')
    }
  } catch (e) {
    log.error('Создание папки', { error: String(e) })
  }
}

async function onRenameFolder(id: string, name: string) {
  if (!props.notebookFoldersUpdateUrl) return
  try {
    await postJson(props.notebookFoldersUpdateUrl, { id, name })
    emit('foldersChanged')
  } catch (e) {
    log.error('Переименование папки', { error: String(e) })
  }
}

async function onArchiveFolder(id: string, isArchived: boolean) {
  if (!props.notebookFoldersArchiveUrl) return
  try {
    await postJson(props.notebookFoldersArchiveUrl, { id, isArchived })
    if (activeFolderId.value === id && isArchived) {
      activeFolderId.value = null
    }
    emit('foldersChanged')
  } catch (e) {
    log.error('Архивация папки', { error: String(e) })
  }
}

async function onDeleteFolder(id: string) {
  if (!props.notebookFoldersDeleteUrl) return
  if (!confirm('Удалить папку? Заметки будут перемещены в корень.')) return
  try {
    await postJson(props.notebookFoldersDeleteUrl, { id })
    if (activeFolderId.value === id) {
      activeFolderId.value = null
    }
    emit('foldersChanged')
  } catch (e) {
    log.error('Удаление папки', { error: String(e) })
  }
}

async function onDropNotesToFolder(folderId: string | null, noteIds: string[]) {
  if (!props.journalNotesMoveUrl) return
  try {
    await postJson(props.journalNotesMoveUrl, {
      ids: noteIds,
      folderId: folderId ?? ''
    })
    emit('foldersChanged')
  } catch (e) {
    log.error('Перемещение заметок', { error: String(e) })
  }
}

async function onCreateCategory() {
  if (!props.notebookCategoriesCreateUrl || !newCatName.value.trim()) return
  try {
    await postJson(props.notebookCategoriesCreateUrl, {
      name: newCatName.value.trim(),
      color: newCatColor.value
    })
    newCatName.value = ''
    emit('categoriesChanged')
  } catch (e) {
    log.error('Создание категории', { error: String(e) })
  }
}

async function onDeleteCategory(id: string) {
  if (!props.notebookCategoriesDeleteUrl) return
  if (!confirm('Удалить категорию?')) return
  try {
    await postJson(props.notebookCategoriesDeleteUrl, { id })
    selectedCategoryIds.value = selectedCategoryIds.value.filter((c) => c !== id)
    emit('categoriesChanged')
  } catch (e) {
    log.error('Удаление категории', { error: String(e) })
  }
}

function onDragStart(id: string) {
  draggingNoteId.value = id
}

function onDragEnd() {
  draggingNoteId.value = null
}
</script>

<template>
  <div class="nb-pane">
    <p v-if="!props.isAuthenticated" class="nb-pane-hint">
      Войдите в аккаунт, чтобы создавать и видеть свои заметки.
    </p>

    <template v-else-if="mode === 'editor'">
      <NotebookNoteEditor
        :noteId="editingNoteId"
        :isCreate="isCreatingNote"
        :categories="props.categories"
        :folders="activeFolders"
        :taskClients="props.taskClients"
        :taskProjects="props.taskProjects"
        :taskItems="props.taskItems"
        :journalNotesGetUrl="props.journalNotesGetUrl ?? ''"
        :journalNotesCreateUrl="props.journalNotesCreateUrl ?? ''"
        :journalNotesUpdateUrl="props.journalNotesUpdateUrl ?? ''"
        @back="onEditorBack"
        @saved="onEditorSaved"
      />
    </template>

    <template v-else>
      <div class="nb-pane-layout">
        <NotebookFolderSidebar
          :folders="props.folders"
          :activeFolderId="activeFolderId"
          :showArchived="showArchivedFolders"
          @select-folder="activeFolderId = $event"
          @create-folder="onCreateFolder"
          @rename-folder="onRenameFolder"
          @archive-folder="onArchiveFolder"
          @delete-folder="onDeleteFolder"
          @toggle-show-archived="showArchivedFolders = !showArchivedFolders"
          @reorder-folders="() => {}"
          @drop-notes-to-folder="onDropNotesToFolder"
        />

        <div class="nb-pane-content">
          <div class="nb-pane-toolbar">
            <NotebookFilterBar
              :categories="props.categories"
              :selectedCategoryIds="selectedCategoryIds"
              :showArchived="showArchived"
              @toggle-category="toggleCategoryFilter"
              @clear-filters="clearFilters"
              @toggle-archived="showArchived = !showArchived"
              @manage-categories="catManagerOpen = !catManagerOpen"
            />

            <div class="nb-pane-toolbar-actions">
              <button type="button" class="nb-pane-new-btn" @click="openCreateEditor">
                <i class="fa-solid fa-plus" aria-hidden="true" />
                <span>Новая заметка</span>
              </button>
            </div>
          </div>

          <Transition name="nb-cat-mgr">
            <div v-if="catManagerOpen" class="nb-cat-manager">
              <div class="nb-cat-manager-header">
                <span class="nb-cat-manager-title">Управление категориями</span>
                <button type="button" class="nb-cat-manager-close" @click="catManagerOpen = false">
                  <i class="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
              <div class="nb-cat-manager-list">
                <div v-for="cat in props.categories" :key="cat.id" class="nb-cat-manager-item">
                  <span class="nb-cat-manager-dot" :style="{ background: cat.color }" />
                  <span class="nb-cat-manager-name">{{ cat.name }}</span>
                  <button type="button" class="nb-cat-manager-del" @click="onDeleteCategory(cat.id)">
                    <i class="fa-solid fa-trash-can" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="nb-cat-manager-add">
                <input
                  v-model="newCatName"
                  type="text"
                  class="nb-cat-manager-input"
                  placeholder="Название"
                  maxlength="100"
                  @keydown.enter="onCreateCategory"
                />
                <input v-model="newCatColor" type="color" class="nb-cat-manager-color" />
                <button type="button" class="nb-cat-manager-add-btn" @click="onCreateCategory">
                  <i class="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Transition>

          <div class="nb-pane-list">
            <p v-if="!filteredNotes.length" class="nb-pane-empty">
              {{ showArchived ? 'В архиве пусто' : 'Заметок нет' }}
            </p>
            <NotebookNoteCard
              v-for="n in filteredNotes"
              :key="n.id"
              :note="n"
              :categories="props.categories"
              :selected="selectedNoteIds.includes(n.id)"
              :dragging="draggingNoteId === n.id"
              @toggle-select="toggleSelect"
              @open="openEditor"
              @dragstart="onDragStart"
              @dragend="onDragEnd"
              @archive="archiveNoteFromList"
              @unarchive="unarchiveNoteFromList"
              @delete="deleteNoteFromList"
            />
          </div>

          <NotebookBulkBar
            v-if="selectedNoteIds.length > 0"
            :count="selectedNoteIds.length"
            :folders="activeFolders"
            :show-delete="bulkSelectionAllArchived"
            @archive="onBulkArchive"
            @unarchive="onBulkUnarchive"
            @delete="onBulkDelete"
            @move="onBulkMove"
            @clear-selection="clearSelection"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.nb-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.nb-pane-hint {
  margin: 0;
  padding: 1rem;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.nb-pane-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.nb-pane-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.nb-pane-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.nb-pane-toolbar-actions {
  padding: 0 0.5rem 0 0;
}

.nb-pane-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
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

.nb-pane-new-btn:hover {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
  color: #fff;
}

.nb-pane-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nb-pane-empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nb-cat-manager {
  border-bottom: 1px solid var(--color-border);
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.15);
}

.nb-cat-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.nb-cat-manager-title {
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.nb-cat-manager-close {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 0.76rem;
  padding: 0.15rem 0.25rem;
}

.nb-cat-manager-close:hover {
  color: var(--color-text);
}

.nb-cat-manager-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.4rem;
}

.nb-cat-manager-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.3rem;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.nb-cat-manager-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nb-cat-manager-name {
  flex: 1;
}

.nb-cat-manager-del {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0.15rem;
}

.nb-cat-manager-del:hover {
  color: var(--color-accent-hover);
}

.nb-cat-manager-add {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nb-cat-manager-input {
  flex: 1;
  padding: 0.25rem 0.3rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  box-sizing: border-box;
}

.nb-cat-manager-color {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg);
  cursor: pointer;
}

.nb-cat-manager-add-btn {
  background: var(--color-accent-light);
  border: 1px solid var(--color-accent);
  color: var(--color-text);
  font-size: 0.72rem;
  padding: 0.25rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.nb-cat-manager-add-btn:hover {
  background: var(--color-accent-medium);
  color: #fff;
}

.nb-cat-mgr-enter-active,
.nb-cat-mgr-leave-active {
  transition: all 0.2s ease;
}

.nb-cat-mgr-enter-from,
.nb-cat-mgr-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

@media (max-width: 900px) {
  .nb-pane-layout {
    flex-direction: column;
  }
}
</style>
