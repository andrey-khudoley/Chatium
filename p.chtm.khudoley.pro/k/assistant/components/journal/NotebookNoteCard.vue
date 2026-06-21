<script setup lang="ts">
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

type CategoryDto = { id: string; name: string; color: string }

const props = defineProps<{
  note: NoteSummary
  categories: CategoryDto[]
  selected: boolean
  dragging: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-select', id: string): void
  (e: 'open', id: string): void
  (e: 'dragstart', id: string, evt: DragEvent): void
  (e: 'dragend'): void
  (e: 'archive', id: string): void
  (e: 'unarchive', id: string): void
  (e: 'delete', id: string): void
}>()

function noteCategories() {
  return props.categories.filter((c) => props.note.categoryIds.includes(c.id))
}

function formatDate(d: string | null): string {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.note.id)
  emit('dragstart', props.note.id, e)
}
</script>

<template>
  <div
    class="nb-card"
    :class="{
      'nb-card--selected': props.selected,
      'nb-card--archived': props.note.isArchived,
      'nb-card--dragging': props.dragging
    }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="emit('dragend')"
  >
    <div class="nb-card-left">
      <i class="fa-solid fa-grip-vertical nb-card-grip" aria-hidden="true" />
    </div>

    <div class="nb-card-body" @click="emit('toggle-select', props.note.id)">
      <div class="nb-card-title-row">
        <button
          type="button"
          class="nb-card-title"
          @click.stop="emit('open', props.note.id)"
        >
          {{ props.note.title }}
        </button>
        <span v-if="props.note.isArchived" class="nb-card-badge nb-card-badge--archive">
          <i class="fa-solid fa-box-archive" aria-hidden="true" /> Архив
        </span>
      </div>

      <div class="nb-card-meta">
        <span
          v-for="cat in noteCategories()"
          :key="cat.id"
          class="nb-card-cat"
          :style="{ '--cat-color': cat.color }"
        >
          {{ cat.name }}
        </span>
        <span v-if="props.note.noteDate" class="nb-card-date">
          <i class="fa-regular fa-calendar" aria-hidden="true" />
          {{ formatDate(props.note.noteDate) }}
        </span>
        <span v-if="props.note.linkedTaskId || props.note.linkedProjectId || props.note.linkedClientId" class="nb-card-link-indicator">
          <i class="fa-solid fa-link" aria-hidden="true" />
        </span>
      </div>
    </div>

    <div class="nb-card-actions" @click.stop>
      <button
        v-if="!props.note.isArchived"
        type="button"
        class="nb-card-btn nb-card-btn--small"
        @click="emit('archive', props.note.id)"
      >
        В архив
      </button>
      <template v-else>
        <button
          type="button"
          class="nb-card-btn nb-card-btn--small nb-card-btn--ghost"
          @click="emit('unarchive', props.note.id)"
        >
          Вернуть
        </button>
        <button
          type="button"
          class="nb-card-btn nb-card-btn--small nb-card-btn--danger"
          title="Удалить"
          @click="emit('delete', props.note.id)"
        >
          Удалить
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.nb-card {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.2);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  cursor: default;
}

.nb-card:hover {
  border-color: var(--color-border-light);
}

.nb-card--selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 8px rgba(211, 35, 75, 0.15);
}

.nb-card--archived {
  opacity: 0.6;
}

.nb-card--dragging {
  opacity: 0.4;
  border-style: dashed;
}

.nb-card-left {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.3rem 0.4rem 0.5rem;
  flex-shrink: 0;
}

.nb-card-grip {
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
  cursor: grab;
  padding: 0.2rem;
}

.nb-card-grip:active {
  cursor: grabbing;
}

.nb-card-body {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.6rem 0.45rem 0.25rem;
  cursor: pointer;
}

.nb-card-body:hover {
  background: rgba(211, 35, 75, 0.04);
}

.nb-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.nb-card-title {
  flex: 0 1 auto;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: inherit;
  font-size: 0.97rem;
  color: var(--color-text);
  letter-spacing: 0.03em;
  text-align: left;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.nb-card-title:hover {
  color: var(--color-accent);
}

.nb-card-title:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
  border-radius: 2px;
}

.nb-card-badge {
  flex-shrink: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.nb-card-badge--archive {
  background: rgba(255, 165, 0, 0.15);
  color: #e0a030;
  border: 1px solid rgba(255, 165, 0, 0.3);
}

.nb-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.nb-card-cat {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  background: color-mix(in srgb, var(--cat-color, #888) 15%, transparent);
  color: var(--cat-color, #888);
  border: 1px solid color-mix(in srgb, var(--cat-color, #888) 35%, transparent);
}

.nb-card-date {
  font-size: 0.76rem;
  color: var(--color-text-tertiary);
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.nb-card-link-indicator {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.nb-card-actions {
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

.nb-card-btn {
  margin: 0;
  font-family: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.25rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.nb-card-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.nb-card-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent-medium);
}

.nb-card-btn--small {
  font-size: 0.72rem;
  padding: 0.25rem 0.4rem;
}

.nb-card-btn--ghost {
  background: transparent;
  border-color: var(--color-border-light);
}

.nb-card-btn--danger {
  border-color: rgba(211, 35, 75, 0.45);
  color: var(--color-accent-hover);
}

.nb-card-btn--danger:hover {
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.12);
  color: var(--color-accent-hover);
}
</style>
