<script setup lang="ts">
type JournalNavTab = { id: string; label: string }

const props = defineProps<{
  tabs: JournalNavTab[]
  activeTab: string
  showNotebookToolbar: boolean
  showTasksToolbar: boolean
  isAuthenticated: boolean
  notebookCreateTitle: string
  notebookCreateError: string
}>()

const emit = defineEmits<{
  (e: 'select-tab', tabId: string): void
  (e: 'create-note'): void
  (e: 'open-all-tasks'): void
}>()
</script>

<template>
  <nav class="journal-nav" aria-label="Разделы журнала">
    <ul class="journal-nav-list" role="tablist">
      <li v-for="t in props.tabs" :key="t.id" class="journal-nav-item">
        <button
          type="button"
          role="tab"
          class="journal-nav-btn"
          :class="{ 'journal-nav-btn--active': props.activeTab === t.id }"
          :aria-selected="props.activeTab === t.id"
          @click="emit('select-tab', t.id)"
        >
          {{ t.label }}
        </button>
      </li>
    </ul>

    <div
      v-if="props.showNotebookToolbar || props.showTasksToolbar"
      class="journal-nav-divider"
      aria-hidden="true"
    />

    <Transition name="journal-nav-toolbar">
      <div v-if="props.showNotebookToolbar" class="journal-nav-toolbar">
        <button
          type="button"
          class="journal-nav-action"
          :disabled="!props.isAuthenticated"
          :title="props.notebookCreateTitle"
          @click="emit('create-note')"
        >
          Новая заметка
        </button>
        <p v-if="props.notebookCreateError" class="journal-nav-action-error" role="alert">
          {{ props.notebookCreateError }}
        </p>
      </div>
    </Transition>

    <Transition name="journal-nav-toolbar">
      <div v-if="props.showTasksToolbar" class="journal-nav-toolbar">
        <button type="button" class="journal-nav-action journal-nav-action--tasks" @click="emit('open-all-tasks')">
          Все задачи
        </button>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
.journal-nav {
  flex: 0 0 auto;
  width: 7.25rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
}

.journal-nav-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
}

.journal-nav-toolbar-enter-active,
.journal-nav-toolbar-leave-active {
  transition:
    opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.journal-nav-toolbar-enter-from,
.journal-nav-toolbar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.journal-nav-divider {
  height: 0;
  margin: 0.1rem 0;
  border: 0;
  border-top: 1px solid var(--color-border-light);
  opacity: 0.85;
}

.journal-nav-action {
  width: 100%;
  margin: 0;
  padding: 0.35rem 0.4rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.3;
  color: var(--color-text);
  background: var(--color-accent-light);
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  outline: none;
}

.journal-nav-action:hover:not(:disabled) {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
  color: #fff;
}

.journal-nav-action--tasks {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-light);
  color: var(--color-text-secondary);
}

.journal-nav-action--tasks:hover:not(:disabled) {
  background: var(--color-bg-tertiary);
  border-color: var(--color-accent);
  color: var(--color-text);
}

.journal-nav-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.journal-nav-action:focus-visible {
  border-color: var(--color-accent);
  box-shadow:
    0 0 0 1px var(--color-accent),
    0 0 10px var(--color-accent-medium);
}

.journal-nav-action-error {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.25;
  color: var(--color-accent-hover);
  letter-spacing: 0.03em;
}

.journal-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.journal-nav-item {
  margin: 0;
}

.journal-nav-btn {
  width: 100%;
  margin: 0;
  padding: 0.35rem 0.45rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-left: 2px solid var(--color-border);
  cursor: pointer;
  transition: var(--transition);
  line-height: 1.25;
  outline: none;
}

.journal-nav-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  border-left-color: var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.journal-nav-btn--active {
  color: var(--color-text);
  border-color: var(--color-border-light);
  border-left-color: var(--color-accent);
  background: var(--color-accent-light);
  box-shadow: 0 0 12px var(--color-accent-medium);
}

.journal-nav-btn:focus-visible {
  border-color: var(--color-accent);
  border-left-color: var(--color-accent);
  box-shadow:
    0 0 0 1px var(--color-accent),
    0 0 10px var(--color-accent-medium);
}

@media (max-width: 900px) {
  .journal-nav {
    width: 100%;
    flex-direction: column;
  }

  .journal-nav-action {
    font-size: 0.82rem;
    padding: 0.4rem 0.5rem;
  }

  .journal-nav-divider {
    margin: 0.15rem 0;
  }

  .journal-nav-list {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 0.25rem;
    overflow-x: auto;
    padding-bottom: 0.15rem;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
  }

  .journal-nav-item {
    scroll-snap-align: start;
  }

  .journal-nav-btn {
    width: auto;
    flex: 0 0 auto;
    white-space: nowrap;
    border-left-width: 1px;
    border-bottom: 2px solid transparent;
    text-align: center;
    padding: 0.3rem 0.5rem;
    min-height: 2.5rem;
  }

  .journal-nav-btn--active {
    border-left-color: var(--color-border-light);
    border-bottom-color: var(--color-accent);
  }
}
</style>
