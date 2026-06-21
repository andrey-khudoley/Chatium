<template>
  <div class="journal-day">
    <header class="journal-day-head">
      <div class="journal-day-head-text">
        <h2 class="journal-day-title">Задачи на день</h2>
        <p class="journal-day-sub">
          Отмечайте задачи на странице «Управление задачами» — здесь видны все со статусом «В работе». Порядок можно менять
          кнопками или перетаскиванием.
        </p>
      </div>
      <button
        v-if="props.isAuthenticated && dayTasks.length > 0"
        type="button"
        class="journal-day-release"
        :disabled="loading"
        title="Перевести все задачи «В работе» в «К выполнению»"
        @click="releaseAll"
      >
        <i class="fas fa-arrow-rotate-left" aria-hidden="true" />
        В очередь
      </button>
    </header>

    <p v-if="!props.isAuthenticated" class="journal-day-hint">Войдите в аккаунт, чтобы видеть задачи на день.</p>

    <template v-else>
      <p v-if="globalError" class="journal-day-err" role="alert">{{ globalError }}</p>
      <p v-if="loading && !dayTasks.length" class="journal-day-loading">Загрузка…</p>

      <p v-else-if="!dayTasks.length" class="journal-day-empty">
        Нет задач «В работе». На странице задач нажмите «Отметить» у нужной задачи.
      </p>

      <ul
        v-else
        class="journal-day-list"
        aria-label="Задачи на день, перетаскивание для смены порядка"
      >
        <li
          v-for="(t, idx) in dayTasks"
          :key="t.id"
          class="journal-day-item"
          :class="{ 'journal-day-item--dragging': draggingId === t.id }"
          @dragover.prevent="onItemDragOver($event, idx)"
          @drop.prevent="onDrop(idx)"
        >
          <span
            class="journal-day-grip"
            draggable="true"
            title="Перетащить"
            aria-hidden="true"
            @dragstart="onDragStart(t.id)"
            @dragend="onDragEnd"
          >
            <i class="fas fa-grip-vertical" />
          </span>

          <div class="journal-day-body">
            <div
              class="journal-day-task-title"
              :class="{ 'journal-day-task-title--clickable': !!props.taskItemUpdateUrl }"
              role="button"
              :tabindex="props.taskItemUpdateUrl ? 0 : -1"
              @click="onTaskTitleClick(t)"
              @keydown.enter.prevent="onTaskTitleClick(t)"
              @keydown.space.prevent="onTaskTitleClick(t)"
            >
              {{ t.title }}
            </div>
            <div v-if="t.details" class="journal-day-task-desc">{{ t.details }}</div>
            <div class="journal-day-meta">
              <span class="journal-day-meta-label">Клиент</span>
              <a
                class="journal-day-link"
                :href="hrefToTasks(clientIdForTask(t), null)"
                @click.stop
              >{{ clientNameForTask(t) }}</a>
              <span class="journal-day-meta-sep" aria-hidden="true">·</span>
              <span class="journal-day-meta-label">Проект</span>
              <a class="journal-day-link" :href="hrefToTasks(clientIdForTask(t), t.projectId)" @click.stop>{{
                projectNameForTask(t)
              }}</a>
            </div>
          </div>

          <div class="journal-day-actions">
            <button
              type="button"
              class="journal-day-sort-btn"
              title="Выше"
              :disabled="idx === 0 || loading"
              @click="moveTask(idx, -1)"
            >
              <i class="fas fa-chevron-up" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="journal-day-sort-btn"
              title="Ниже"
              :disabled="idx >= dayTasks.length - 1 || loading"
              @click="moveTask(idx, 1)"
            >
              <i class="fas fa-chevron-down" aria-hidden="true" />
            </button>
            <button type="button" class="journal-day-sort-btn" title="В помидор" @click="addToPomodoro(t.id)">
              <i class="fas fa-clock" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </template>

    <Teleport to="body">
      <Transition name="jn-modal">
        <div
          v-if="taskModalOpen"
          class="jn-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jd-task-edit-title"
          @click.self="closeTaskModal"
        >
          <div class="jn-modal jn-modal--wide crt-form-panel" @click.stop>
            <h2 id="jd-task-edit-title" class="jn-modal-heading">Задача</h2>
            <label class="jn-label" for="jd-tt-title">Заголовок</label>
            <input id="jd-tt-title" v-model="taskForm.title" type="text" class="jn-input" maxlength="500" />
            <label class="jn-label" for="jd-tt-desc">Детали</label>
            <textarea id="jd-tt-desc" v-model="taskForm.details" class="jn-textarea" rows="5" />
            <label class="jn-label" for="jd-tt-p">Приоритет</label>
            <JnCrtSelect id="jd-tt-p" v-model="taskForm.priority" :options="prioritySelectOptions" />
            <label class="jn-label" for="jd-tt-s">Статус</label>
            <JnCrtSelect id="jd-tt-s" v-model="taskForm.status" :options="statusSelectOptions" />
            <label class="jn-label" for="jd-tt-pr">Проект</label>
            <JnCrtSelect
              id="jd-tt-pr"
              v-model="taskForm.projectId"
              :options="taskProjectSelectOptions"
              :disabled="!taskProjectSelectOptions.length"
            />
            <p v-if="taskError" class="jn-modal-error" role="alert">{{ taskError }}</p>
            <div class="jn-modal-actions">
              <button type="button" class="journal-nav-btn" @click="closeTaskModal">Отмена</button>
              <button type="button" class="journal-nav-action" :disabled="taskSaving" @click="submitTaskModal">
                {{ taskSaving ? '…' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch, withDefaults } from 'vue'
import type { TasksTreeDto, TaskItemDto, TaskProjectDto } from '../../lib/tasks-types'
import { computePomodoroStatsDayKeyForUtcOffsetHours } from '../../lib/pomodoro-stats-day'
import { DEFAULT_USER_TIMEZONE_OFFSET_HOURS } from '../../shared/user-settings-defaults'
import { createComponentLogger } from '../../shared/logger'
import JnCrtSelect from '../JnCrtSelect.vue'

const log = createComponentLogger('JournalDayPane')

const props = withDefaults(
  defineProps<{
    isAuthenticated: boolean
    tasksTreeInitial: TasksTreeDto
    tasksTreeGetUrl: string
    taskItemReorderDayUrl: string
    taskReleaseDayUrl: string
    taskItemUpdateUrl: string
    tasksPageUrl: string
    toolsControlUrl: string
    timezoneOffsetHours?: number
  }>(),
  { timezoneOffsetHours: DEFAULT_USER_TIMEZONE_OFFSET_HOURS },
)

const tree = ref<TasksTreeDto>({
  clients: [...(props.tasksTreeInitial?.clients ?? [])],
  projects: [...(props.tasksTreeInitial?.projects ?? [])],
  tasks: [...(props.tasksTreeInitial?.tasks ?? [])]
})

watch(
  () => props.tasksTreeInitial,
  (next) => {
    tree.value = {
      clients: [...(next?.clients ?? [])],
      projects: [...(next?.projects ?? [])],
      tasks: [...(next?.tasks ?? [])]
    }
  },
  { deep: true }
)

const loading = ref(false)
const globalError = ref('')
const draggingId = ref<string | null>(null)

const dayTasks = computed(() => {
  const list = tree.value.tasks.filter((t) => t.status === 'in_progress')
  return list.sort((a, b) => {
    const da = a.daySortOrder ?? 0
    const db = b.daySortOrder ?? 0
    if (da !== db) return da - db
    return a.title.localeCompare(b.title, 'ru')
  })
})

function projectForTask(t: TaskItemDto) {
  return tree.value.projects.find((p) => p.id === t.projectId) ?? null
}

function clientIdForTask(t: TaskItemDto): string {
  return projectForTask(t)?.clientId ?? ''
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Срочно',
  2: 'Высокий',
  3: 'Обычный',
  4: 'Низкий'
}

const statusSelectOptions = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Готово' },
  { value: 'cancelled', label: 'Отмена' }
]

const prioritySelectOptions = computed(() =>
  ([1, 2, 3, 4] as const).map((n) => ({ value: n, label: `${n} — ${PRIORITY_LABELS[n]}` }))
)

const taskModalOpen = ref(false)
const taskEditId = ref<string | null>(null)
const taskEditClientId = ref('')
const taskForm = ref({
  title: '',
  details: '',
  priority: 2,
  status: 'todo' as TaskItemDto['status'],
  projectId: '' as string
})
const taskSaving = ref(false)
const taskError = ref('')

const projectsForEditClient = computed((): TaskProjectDto[] => {
  const cid = taskEditClientId.value
  if (!cid) return []
  return [...tree.value.projects]
    .filter((p) => p.clientId === cid)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'))
})

const taskProjectSelectOptions = computed(() =>
  projectsForEditClient.value.map((p) => ({ value: p.id, label: p.name }))
)

function onTaskTitleClick(t: TaskItemDto) {
  if (!props.taskItemUpdateUrl) return
  openTaskEdit(t)
}

function openTaskEdit(t: TaskItemDto) {
  taskModalOpen.value = true
  taskEditId.value = t.id
  taskEditClientId.value = clientIdForTask(t)
  taskForm.value = {
    title: t.title,
    details: t.details ?? '',
    priority: t.priority,
    status: t.status,
    projectId: t.projectId
  }
  taskError.value = ''
}

function closeTaskModal() {
  taskModalOpen.value = false
  taskEditId.value = null
  taskEditClientId.value = ''
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && taskModalOpen.value) closeTaskModal()
}

watch(taskModalOpen, (open) => {
  if (open) document.addEventListener('keydown', onDocKeydown)
  else document.removeEventListener('keydown', onDocKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocKeydown)
})

function clientNameForTask(t: TaskItemDto): string {
  const cid = clientIdForTask(t)
  return tree.value.clients.find((c) => c.id === cid)?.name ?? '—'
}

function projectNameForTask(t: TaskItemDto): string {
  return projectForTask(t)?.name ?? '—'
}

function hrefToTasks(clientId: string | null, projectId: string | null): string {
  const base = props.tasksPageUrl.replace(/\?.*$/, '')
  const q = new URLSearchParams()
  if (clientId) q.set('client', clientId)
  if (projectId) q.set('project', projectId)
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  })
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`)
  }
  const contentType = r.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Сервер вернул не-JSON ответ')
  }
  return r.json() as Promise<T>
}

async function submitTaskModal() {
  if (!props.taskItemUpdateUrl || !taskEditId.value) return
  taskSaving.value = true
  taskError.value = ''
  try {
    const j = await postJson<{ success: boolean; task?: TaskItemDto; error?: string }>(props.taskItemUpdateUrl, {
      id: taskEditId.value,
      title: taskForm.value.title,
      details: taskForm.value.details,
      priority: taskForm.value.priority,
      status: taskForm.value.status,
      projectId: taskForm.value.projectId
    })
    if (!j.success || !j.task) {
      taskError.value = j.error ?? 'Ошибка'
      return
    }
    tree.value.tasks = tree.value.tasks.map((x) => (x.id === j.task!.id ? j.task! : x))
    closeTaskModal()
  } catch (e) {
    taskError.value = String(e)
  } finally {
    taskSaving.value = false
  }
}

async function refreshTree() {
  if (!props.isAuthenticated) return
  loading.value = true
  globalError.value = ''
  try {
    const r = await fetch(props.tasksTreeGetUrl, { credentials: 'include' })
    const j = (await r.json()) as { success?: boolean; tree?: TasksTreeDto; error?: string }
    if (j.success && j.tree) {
      tree.value = j.tree
    } else {
      globalError.value = j.error ?? 'Не удалось загрузить задачи'
    }
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
  }
}

async function persistOrder(ordered: TaskItemDto[]) {
  const orderedIds = ordered.map((t) => t.id)
  const r = await postJson<{ success: boolean; error?: string }>(props.taskItemReorderDayUrl, { orderedIds })
  if (!r.success) {
    globalError.value = r.error ?? 'Не удалось сохранить порядок'
    await refreshTree()
    return
  }
  let i = 0
  for (const id of orderedIds) {
    const row = tree.value.tasks.find((x) => x.id === id)
    if (row) row.daySortOrder = i
    i++
  }
}

function moveTask(fromIdx: number, dir: -1 | 1) {
  const list = dayTasks.value
  const j = fromIdx + dir
  if (fromIdx < 0 || j < 0 || j >= list.length) return
  const orderedIds = list.map((x) => x.id)
  const tmp = orderedIds[fromIdx]
  orderedIds[fromIdx] = orderedIds[j]
  orderedIds[j] = tmp
  const byId = new Map(list.map((t) => [t.id, t]))
  const ordered = orderedIds.map((id) => byId.get(id)!).filter(Boolean)
  void persistOrder(ordered)
}

function onDragStart(id: string) {
  draggingId.value = id
}

function onDragEnd() {
  draggingId.value = null
}

function onDrop(dropIdx: number) {
  const id = draggingId.value
  onDragEnd()
  if (!id) return
  const a = [...dayTasks.value]
  const fromIdx = a.findIndex((x) => x.id === id)
  if (fromIdx < 0 || fromIdx === dropIdx) return
  const [item] = a.splice(fromIdx, 1)
  a.splice(dropIdx, 0, item)
  void persistOrder(a)
}

async function releaseAll() {
  loading.value = true
  globalError.value = ''
  try {
    const r = await postJson<{ success: boolean; count?: number; error?: string }>(props.taskReleaseDayUrl, {})
    if (!r.success) {
      globalError.value = r.error ?? 'Не удалось обновить задачи'
      return
    }
    log.info('release day tasks', { count: r.count })
    await refreshTree()
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
  }
}

async function addToPomodoro(taskId: string) {
  globalError.value = ''
  try {
    const j = await postJson<{ success: boolean; error?: string }>(props.toolsControlUrl, {
      statsDayKey: computePomodoroStatsDayKeyForUtcOffsetHours(Date.now(), props.timezoneOffsetHours),
      command: { kind: 'assign-task', taskId },
    })
    if (!j.success) {
      globalError.value = j.error ?? 'Не удалось добавить задачу в pomodoro'
      return
    }
    window.dispatchEvent(new CustomEvent('assistant:focus-task-selected', { detail: { taskId } }))
  } catch (e) {
    globalError.value = String(e)
  }
}
</script>

<style scoped>
.journal-day {
  padding: 0.85rem 1rem 1.1rem;
  min-height: 12rem;
  box-sizing: border-box;
}

.journal-day-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 0.85rem;
}

.journal-day-head-text {
  flex: 1 1 220px;
  min-width: 0;
}

.journal-day-title {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text);
}

.journal-day-sub {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  max-width: 42rem;
}

.journal-day-release {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.4rem 0.65rem;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.journal-day-release:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  box-shadow: 0 0 10px var(--color-accent-medium);
}

.journal-day-release:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.journal-day-hint,
.journal-day-empty,
.journal-day-loading {
  margin: 0.5rem 0 0;
  font-size: 0.84rem;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.journal-day-err {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  color: var(--color-accent-hover);
}

.journal-day-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.journal-day-item {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.35rem;
  padding: 0.5rem 0.45rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  border-left: 2px solid var(--color-accent);
  transition: var(--transition);
}

.journal-day-item--dragging {
  opacity: 0.55;
}

.journal-day-grip {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  padding: 0.15rem 0.2rem 0 0;
  color: var(--color-text-tertiary);
  cursor: grab;
  user-select: none;
}

.journal-day-grip:active {
  cursor: grabbing;
}

.journal-day-body {
  flex: 1 1 auto;
  min-width: 0;
}

.journal-day-task-title {
  font-size: 0.88rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
  line-height: 1.35;
  word-break: break-word;
}

.journal-day-task-title--clickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: var(--transition);
}

.journal-day-task-title--clickable:hover {
  color: var(--color-accent-hover);
  text-decoration-color: var(--color-accent);
}

.journal-day-task-title--clickable:focus {
  outline: none;
}

.journal-day-task-title--clickable:focus-visible {
  outline: 1px solid var(--color-accent);
  outline-offset: 2px;
}

.journal-day-task-desc {
  margin-top: 0.25rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.journal-day-meta {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.35rem;
  font-size: 0.84rem;
  line-height: 1.45;
  letter-spacing: 0.06em;
}

.journal-day-meta-label {
  color: var(--color-text-tertiary);
  text-transform: uppercase;
}

.journal-day-meta-sep {
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

.journal-day-link {
  color: var(--color-accent-hover);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: var(--transition);
}

.journal-day-link:hover {
  color: var(--color-text);
  border-bottom-color: var(--color-accent);
}

.journal-day-actions {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  justify-content: flex-start;
}

.journal-day-sort-btn {
  margin: 0;
  padding: 0.2rem 0.35rem;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
  line-height: 1;
}

.journal-day-sort-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.journal-day-sort-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

@media (max-width: 520px) {
  .journal-day-head {
    flex-direction: column;
    align-items: stretch;
  }

  .journal-day-release {
    width: 100%;
    justify-content: center;
  }
}

/* Модалка редактирования задачи — как на TasksPage */
.jn-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200000;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.jn-modal {
  width: 100%;
  max-width: 420px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  padding: 1.25rem;
  border-radius: 2px;
  box-shadow: 0 0 24px rgba(211, 35, 75, 0.15);
}

.jn-modal.crt-form-panel {
  position: relative;
  overflow: visible;
}

.jn-modal.crt-form-panel::before {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 2px;
  opacity: 0.1;
  z-index: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.48) 1px,
    rgba(0, 0, 0, 0.48) 2px
  );
}

.jn-modal.crt-form-panel > *:not(.jn-crt-select) {
  position: relative;
  z-index: 1;
}

.crt-form-panel input.jn-input {
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08),
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  background-color: var(--color-bg);
}

.crt-form-panel textarea.jn-textarea {
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.09),
    rgba(0, 0, 0, 0.09) 1px,
    transparent 1px,
    transparent 2px
  );
  background-color: var(--color-bg);
}

.jn-modal--wide {
  max-width: 520px;
}

.jn-modal-heading {
  margin: 0 0 1rem;
  font-size: 0.98rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 400;
  color: var(--color-text);
}

.jn-label {
  display: block;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 0.35rem;
}

.jn-input,
.jn-textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.6rem;
  font-family: inherit;
  font-size: 0.95rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 2px;
}

.jn-textarea {
  resize: vertical;
  min-height: 80px;
}

.jn-modal-error {
  color: var(--color-accent-hover);
  font-size: 0.88rem;
  margin: 0 0 0.5rem;
}

.jn-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.jn-modal-actions .journal-nav-btn,
.jn-modal-actions .journal-nav-action {
  width: auto;
}

.journal-nav-btn {
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
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.25;
}

.journal-nav-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.journal-nav-action {
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
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.journal-nav-action:hover:not(:disabled) {
  background: var(--color-accent-medium);
  border-color: var(--color-accent-hover);
  color: #fff;
}

.journal-nav-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.jn-modal-enter-active,
.jn-modal-leave-active {
  transition: opacity 0.2s ease;
}

.jn-modal-enter-from,
.jn-modal-leave-to {
  opacity: 0;
}
</style>
