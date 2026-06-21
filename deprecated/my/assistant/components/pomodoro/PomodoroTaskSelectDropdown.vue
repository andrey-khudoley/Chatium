<script setup lang="ts">
import { computed, ref } from 'vue'

type TaskOption = {
  id: string
  title: string
  projectId: string
  projectName?: string
  clientName?: string
}

const props = withDefaults(
  defineProps<{
    tasks: TaskOption[]
    selectedTaskId: string
    loading?: boolean
    /** Блокировка (например, пока нет WebSocket к focus-tools). */
    disabled?: boolean
    placeholder?: string
    clearLabel?: string
  }>(),
  {
    loading: false,
    disabled: false,
    placeholder: 'Выберите задачу',
    clearLabel: 'Снять задачу'
  }
)

const emit = defineEmits<{
  (event: 'select', taskId: string): void
}>()

const expanded = ref(false)
const searchQuery = ref('')
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

const currentTask = computed(
  () => props.tasks.find((item) => item.id === props.selectedTaskId) ?? null
)

const filteredTasks = computed(() => {
  const q = normalizedQuery.value
  if (!q) return props.tasks
  return props.tasks.filter((task) => {
    const title = task.title.toLowerCase()
    const projectName = (task.projectName ?? '').toLowerCase()
    const clientName = (task.clientName ?? '').toLowerCase()
    return title.includes(q) || projectName.includes(q) || clientName.includes(q)
  })
})

function taskMeta(task: TaskOption): string {
  if (task.clientName && task.projectName) return `${task.clientName} / ${task.projectName}`
  if (task.projectName) return task.projectName
  if (task.clientName) return task.clientName
  return 'Без проекта'
}

function selectTask(taskId: string): void {
  expanded.value = false
  emit('select', taskId)
}

function toggleDropdown(): void {
  if (props.disabled || props.loading) return
  expanded.value = !expanded.value
  if (!expanded.value) searchQuery.value = ''
}
</script>

<template>
  <div class="task-selector">
    <button class="task-toggle" :disabled="loading || disabled" @click="toggleDropdown">
      <i class="fa-solid fa-clipboard-list task-toggle__icon" />
      <span class="task-toggle__text">
        <span v-if="currentTask">{{ currentTask.title }}</span>
        <span v-else class="task-toggle__placeholder">{{ placeholder }}</span>
      </span>
      <i
        class="fa-solid fa-chevron-down task-toggle__arrow"
        :class="{ 'task-toggle__arrow--open': expanded }"
      />
    </button>
    <transition name="dropdown">
      <div v-if="expanded" class="task-dropdown">
        <div class="task-dropdown__scanlines"></div>
        <div class="task-search-wrap">
          <i class="fa-solid fa-magnifying-glass task-search__icon" />
          <input
            v-model="searchQuery"
            class="task-search"
            type="text"
            placeholder="Поиск: задача, проект, клиент"
          />
        </div>
        <button class="task-item task-item--clear" @click="selectTask('')">
          <i class="fa-solid fa-times task-item__icon" /> {{ clearLabel }}
        </button>
        <button
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-item"
          :class="{ 'task-item--active': task.id === selectedTaskId }"
          @click="selectTask(task.id)"
        >
          <i
            :class="task.id === selectedTaskId ? 'fa-solid fa-check' : 'fa-solid fa-circle'"
            class="task-item__icon"
          />
          <span class="task-item__body">
            <span class="task-item__title">{{ task.title }}</span>
            <span class="task-item__meta">{{ taskMeta(task) }}</span>
          </span>
        </button>
        <p v-if="filteredTasks.length === 0 && !loading" class="task-empty">Ничего не найдено</p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.task-selector {
  position: relative;
}
.task-toggle {
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  padding: 0.45rem 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  font-size: 0.8rem;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.task-toggle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
}
.task-toggle:hover:not(:disabled) {
  border-color: var(--color-border-light);
  background: var(--color-bg-secondary);
}
.task-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.task-toggle__icon {
  color: var(--color-accent);
  opacity: 0.7;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.task-toggle__text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-toggle__placeholder {
  color: var(--color-text-secondary);
}
.task-toggle__arrow {
  transition: transform 0.2s ease;
  font-size: 0.6rem;
  color: var(--color-text-secondary);
}
.task-toggle__arrow--open {
  transform: rotate(180deg);
}
.task-dropdown {
  position: absolute;
  top: calc(100% + 0.3rem);
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(0, 0, 0, 0.2);
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}
.task-dropdown__scanlines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 0;
}
.task-search-wrap {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}
.task-search__icon {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}
.task-search {
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  padding: 0.4rem 0.5rem;
  font-family: inherit;
  font-size: 0.76rem;
}
.task-item {
  border: none;
  background: transparent;
  color: var(--color-text);
  padding: 0.52rem 0.65rem;
  width: 100%;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  transition: all 0.15s ease;
  font-size: 0.8rem;
  font-family: inherit;
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: 1;
}
.task-item:last-child {
  border-bottom: none;
}
.task-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
.task-item__icon {
  font-size: 0.55rem;
  flex-shrink: 0;
  width: 14px;
  text-align: center;
  margin-top: 0.18rem;
}
.task-item__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.task-item__title {
  line-height: 1.2;
}
.task-item__meta {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  line-height: 1.2;
  margin-top: 0.2rem;
}
.task-item--active {
  color: var(--color-accent);
  font-weight: 500;
}
.task-item--active .task-item__icon {
  font-size: 0.7rem;
}
.task-item--clear {
  color: #ff8a8a;
}
.task-item--clear:hover {
  background: rgba(255, 107, 107, 0.06);
}
.task-empty {
  padding: 0.7rem;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  position: relative;
  z-index: 1;
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
