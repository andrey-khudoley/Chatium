<script setup lang="ts">
type FolderDto = { id: string; name: string; color: string }

const props = withDefaults(
  defineProps<{
    count: number
    folders: FolderDto[]
    /** Если false — скрыть блок «В корень» и папки (например, инбокс без папок). */
    showFolderMove?: boolean
    /** Показывать «Удалить» только если все выделенные заметки в архиве. */
    showDelete?: boolean
  }>(),
  { showFolderMove: true, showDelete: false }
)

const emit = defineEmits<{
  (e: 'archive'): void
  (e: 'unarchive'): void
  (e: 'delete'): void
  (e: 'move', folderId: string | null): void
  (e: 'clear-selection'): void
}>()
</script>

<template>
  <div class="nb-bulk">
    <div class="nb-bulk-left">
      <span class="nb-bulk-count">{{ props.count }} выбрано</span>
      <button type="button" class="nb-bulk-clear" @click="emit('clear-selection')">
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </div>
    <div class="nb-bulk-actions">
      <button type="button" class="nb-bulk-btn" @click="emit('archive')" title="В архив">
        <i class="fa-solid fa-box-archive" aria-hidden="true" />
        <span>Архив</span>
      </button>
      <button type="button" class="nb-bulk-btn" @click="emit('unarchive')" title="Из архива">
        <i class="fa-solid fa-box-open" aria-hidden="true" />
        <span>Из архива</span>
      </button>
      <div v-if="props.showFolderMove" class="nb-bulk-move-group">
        <button
          type="button"
          class="nb-bulk-btn"
          @click="emit('move', null)"
          title="В корень"
        >
          <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
          <span>В корень</span>
        </button>
        <button
          v-for="f in props.folders"
          :key="f.id"
          type="button"
          class="nb-bulk-btn"
          @click="emit('move', f.id)"
          :title="'В папку: ' + f.name"
        >
          <i class="fa-solid fa-folder" :style="{ color: f.color }" aria-hidden="true" />
          <span>{{ f.name }}</span>
        </button>
      </div>
      <button
        v-if="props.showDelete"
        type="button"
        class="nb-bulk-btn nb-bulk-btn--danger"
        @click="emit('delete')"
        title="Удалить"
      >
        <i class="fa-solid fa-trash-can" aria-hidden="true" />
        <span>Удалить</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.nb-bulk {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  background: linear-gradient(135deg, rgba(211, 35, 75, 0.12) 0%, rgba(20, 20, 20, 0.95) 100%);
  border-top: 1px solid var(--color-accent);
  flex-wrap: wrap;
}

.nb-bulk-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.nb-bulk-count {
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}

.nb-bulk-clear {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 0.76rem;
  padding: 0.15rem 0.25rem;
  transition: var(--transition);
}

.nb-bulk-clear:hover {
  color: var(--color-text);
}

.nb-bulk-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.nb-bulk-move-group {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-wrap: wrap;
}

.nb-bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.4rem;
  font-family: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.nb-bulk-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.nb-bulk-btn--danger:hover {
  color: var(--color-accent-hover);
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.1);
}
</style>
