<script setup lang="ts">
import { ref } from 'vue'

type FolderDto = { id: string; name: string; color: string; sortOrder: number; isArchived: boolean }

const props = defineProps<{
  folders: FolderDto[]
  activeFolderId: string | null
  showArchived: boolean
}>()

const emit = defineEmits<{
  (e: 'select-folder', id: string | null): void
  (e: 'create-folder'): void
  (e: 'rename-folder', id: string, name: string): void
  (e: 'archive-folder', id: string, isArchived: boolean): void
  (e: 'delete-folder', id: string): void
  (e: 'toggle-show-archived'): void
  (e: 'reorder-folders', orderedIds: string[]): void
  (e: 'drop-notes-to-folder', folderId: string | null, noteIds: string[]): void
}>()

const editingFolderId = ref<string | null>(null)
const editingName = ref('')
const dragOverFolderId = ref<string | null>(null)

function activeFolders() {
  return props.folders.filter((f) => !f.isArchived)
}

function archivedFolders() {
  return props.folders.filter((f) => f.isArchived)
}

function startRename(f: FolderDto) {
  editingFolderId.value = f.id
  editingName.value = f.name
}

function commitRename() {
  if (editingFolderId.value && editingName.value.trim()) {
    emit('rename-folder', editingFolderId.value, editingName.value.trim())
  }
  editingFolderId.value = null
}

function onFolderDragOver(e: DragEvent, folderId: string | null) {
  e.preventDefault()
  dragOverFolderId.value = folderId
}

function onFolderDragLeave() {
  dragOverFolderId.value = null
}

function onFolderDrop(e: DragEvent, folderId: string | null) {
  e.preventDefault()
  dragOverFolderId.value = null
  const noteId = e.dataTransfer?.getData('text/plain')
  if (noteId) {
    emit('drop-notes-to-folder', folderId, [noteId])
  }
}
</script>

<template>
  <aside class="nb-sidebar">
    <div class="nb-sidebar-section">
      <button
        type="button"
        class="nb-sidebar-item"
        :class="{ 'nb-sidebar-item--active': props.activeFolderId === null }"
        @click="emit('select-folder', null)"
        @dragover="onFolderDragOver($event, null)"
        @dragleave="onFolderDragLeave"
        @drop="onFolderDrop($event, null)"
      >
        <i class="fa-solid fa-inbox nb-sidebar-icon" aria-hidden="true" />
        <span>Все заметки</span>
      </button>
    </div>

    <div class="nb-sidebar-divider" />

    <div class="nb-sidebar-section">
      <div class="nb-sidebar-header">
        <span class="nb-sidebar-header-text">Папки</span>
        <button type="button" class="nb-sidebar-add" title="Создать папку" @click="emit('create-folder')">
          <i class="fa-solid fa-plus" aria-hidden="true" />
        </button>
      </div>

      <div
        v-for="f in activeFolders()"
        :key="f.id"
        class="nb-sidebar-item"
        :class="{
          'nb-sidebar-item--active': props.activeFolderId === f.id,
          'nb-sidebar-item--drop-target': dragOverFolderId === f.id
        }"
        @click="emit('select-folder', f.id)"
        @dragover="onFolderDragOver($event, f.id)"
        @dragleave="onFolderDragLeave"
        @drop="onFolderDrop($event, f.id)"
      >
        <i class="fa-solid fa-folder nb-sidebar-icon" :style="{ color: f.color }" aria-hidden="true" />
        <template v-if="editingFolderId === f.id">
          <input
            v-model="editingName"
            class="nb-sidebar-rename-input"
            type="text"
            maxlength="100"
            @blur="commitRename"
            @keydown.enter="commitRename"
            @keydown.escape="editingFolderId = null"
            @click.stop
          />
        </template>
        <span v-else class="nb-sidebar-item-name">{{ f.name }}</span>
        <div class="nb-sidebar-item-actions" @click.stop>
          <button type="button" class="nb-sidebar-item-btn" title="Переименовать" @click="startRename(f)">
            <i class="fa-solid fa-pen" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="nb-sidebar-item-btn"
            title="В архив"
            @click="emit('archive-folder', f.id, true)"
          >
            <i class="fa-solid fa-box-archive" aria-hidden="true" />
          </button>
          <button type="button" class="nb-sidebar-item-btn nb-sidebar-item-btn--danger" title="Удалить" @click="emit('delete-folder', f.id)">
            <i class="fa-solid fa-trash-can" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p v-if="!activeFolders().length" class="nb-sidebar-empty">Нет папок</p>
    </div>

    <div v-if="archivedFolders().length || props.showArchived" class="nb-sidebar-section">
      <button type="button" class="nb-sidebar-archive-toggle" @click="emit('toggle-show-archived')">
        <i
          class="fa-solid"
          :class="props.showArchived ? 'fa-chevron-down' : 'fa-chevron-right'"
          aria-hidden="true"
        />
        <span>Архив ({{ archivedFolders().length }})</span>
      </button>

      <template v-if="props.showArchived">
        <div
          v-for="f in archivedFolders()"
          :key="f.id"
          class="nb-sidebar-item nb-sidebar-item--archived"
          @click="emit('select-folder', f.id)"
        >
          <i class="fa-solid fa-folder nb-sidebar-icon" :style="{ color: f.color, opacity: 0.5 }" aria-hidden="true" />
          <span class="nb-sidebar-item-name">{{ f.name }}</span>
          <div class="nb-sidebar-item-actions" @click.stop>
            <button
              type="button"
              class="nb-sidebar-item-btn"
              title="Разархивировать"
              @click="emit('archive-folder', f.id, false)"
            >
              <i class="fa-solid fa-box-open" aria-hidden="true" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.nb-sidebar {
  width: 11rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem 0;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
}

.nb-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0 0.4rem;
}

.nb-sidebar-divider {
  height: 0;
  margin: 0.2rem 0.4rem;
  border-top: 1px solid var(--color-border);
}

.nb-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.3rem;
}

.nb-sidebar-header-text {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.nb-sidebar-add {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 0.72rem;
  padding: 0.15rem 0.25rem;
  border-radius: 2px;
  transition: var(--transition);
}

.nb-sidebar-add:hover {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.nb-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.35rem;
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.86rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  transition: var(--transition);
  font-family: inherit;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.nb-sidebar-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
}

.nb-sidebar-item--active {
  background: var(--color-accent-light);
  color: var(--color-text);
  border-color: var(--color-accent);
}

.nb-sidebar-item--drop-target {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
}

.nb-sidebar-item--archived {
  opacity: 0.6;
}

.nb-sidebar-icon {
  font-size: 0.76rem;
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
}

.nb-sidebar-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nb-sidebar-item-actions {
  display: none;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
}

.nb-sidebar-item:hover .nb-sidebar-item-actions {
  display: flex;
}

.nb-sidebar-item-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0.15rem;
  border-radius: 2px;
  transition: var(--transition);
}

.nb-sidebar-item-btn:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.05);
}

.nb-sidebar-item-btn--danger:hover {
  color: var(--color-accent-hover);
}

.nb-sidebar-rename-input {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 0.86rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  padding: 0.15rem 0.25rem;
  outline: none;
}

.nb-sidebar-empty {
  margin: 0;
  padding: 0.3rem;
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.nb-sidebar-archive-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.35rem;
  font-family: inherit;
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: var(--transition);
}

.nb-sidebar-archive-toggle:hover {
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .nb-sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    gap: 0.15rem;
    padding: 0.4rem;
  }

  .nb-sidebar-section {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.15rem;
  }

  .nb-sidebar-divider {
    display: none;
  }
}
</style>
