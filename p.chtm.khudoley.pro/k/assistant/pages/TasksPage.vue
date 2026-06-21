<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, withDefaults } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import JnCrtSelect from '../components/JnCrtSelect.vue'
import TasksAiChatPanel from '../components/tasks/TasksAiChatPanel.vue'
import { subscribeBootStaticReady, scheduleHideBootLoader } from '../shared/bootUi'
import { createComponentLogger } from '../shared/logger'
import type { TasksTreeDto, TaskClientDto, TaskProjectDto, TaskItemDto } from '../lib/tasks-types'
import { computePomodoroStatsDayKeyForUtcOffsetHours } from '../lib/pomodoro-stats-day'
import { DEFAULT_USER_TIMEZONE_OFFSET_HOURS } from '../shared/user-settings-defaults'

const log = createComponentLogger('TasksPage')

declare global {
  interface Window {
    hideAppLoader?: () => void
  }
}

const props = withDefaults(
  defineProps<{
    projectTitle: string
    indexUrl: string
    profileUrl: string
    testsUrl?: string
    loginUrl: string
    isAuthenticated: boolean
    isAdmin?: boolean
    adminUrl?: string
    tasksTreeInitial: TasksTreeDto
    tasksTreeGetUrl: string
    taskClientCreateUrl: string
    taskClientUpdateUrl: string
    taskClientDeleteUrl: string
    taskProjectCreateUrl: string
    taskProjectUpdateUrl: string
    taskProjectDeleteUrl: string
    taskClientReorderUrl: string
    taskProjectReorderUrl: string
    taskItemCreateUrl: string
    taskItemUpdateUrl: string
    taskItemDeleteUrl: string
    taskItemReorderUrl: string
    taskAiChatEnsureUrl: string
    taskAiChatResetUrl: string
    toolsControlUrl: string
    toolsStateUrl: string
    encodedFocusToolsSocketId: string
    timezoneOffsetHours?: number
  }>(),
  { timezoneOffsetHours: DEFAULT_USER_TIMEZONE_OFFSET_HOURS },
)

const bootLoaderDone = ref(false)

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

const selectedClientId = ref<string | null>(null)
const selectedProjectId = ref<string | null>(null)

const sortedClients = computed(() =>
  [...tree.value.clients].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
)

function projectsForClientId(clientId: string): TaskProjectDto[] {
  return [...tree.value.projects]
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

const projectsForClient = computed(() => {
  if (!selectedClientId.value) return [] as TaskProjectDto[]
  return projectsForClientId(selectedClientId.value)
})

const tasksForProject = computed(() => {
  if (!selectedProjectId.value) return [] as TaskItemDto[]
  return [...tree.value.tasks]
    .filter((t) => t.projectId === selectedProjectId.value)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
})

const ARCHIVE_STATUSES = ['done', 'cancelled'] as const

function isTaskArchived(status: TaskItemDto['status']): boolean {
  return ARCHIVE_STATUSES.includes(status)
}

const showArchive = ref(false)

const visibleTasksForProject = computed(() =>
  tasksForProject.value.filter((t) =>
    showArchive.value ? isTaskArchived(t.status) : !isTaskArchived(t.status)
  )
)

const selectedClient = computed(() =>
  selectedClientId.value ? tree.value.clients.find((c) => c.id === selectedClientId.value) ?? null : null
)

const selectedProject = computed(() =>
  selectedProjectId.value ? tree.value.projects.find((p) => p.id === selectedProjectId.value) ?? null : null
)

watch(sortedClients, (list) => {
  if (!list.length) {
    selectedClientId.value = null
    selectedProjectId.value = null
    return
  }
  if (!selectedClientId.value || !list.some((c) => c.id === selectedClientId.value)) {
    selectedClientId.value = list[0].id
  }
})

watch(projectsForClient, (list) => {
  if (!list.length) {
    selectedProjectId.value = null
    return
  }
  if (!selectedProjectId.value || !list.some((p) => p.id === selectedProjectId.value)) {
    selectedProjectId.value = list[0].id
  }
})

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Срочно',
  2: 'Высокий',
  3: 'Обычный',
  4: 'Низкий'
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Завершено',
  cancelled: 'Отменено'
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

const taskProjectSelectOptions = computed(() =>
  tree.value.projects
    .filter((x) => x.clientId === selectedClientId.value)
    .map((p) => ({ value: p.id, label: p.name }))
)

const globalError = ref('')
const loading = ref(false)

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

let chatRefreshTimer: ReturnType<typeof setTimeout> | null = null

/** После ответа AI в чате список задач мог обновиться на сервере. */
function onTasksChatMaybeChanged() {
  if (chatRefreshTimer) clearTimeout(chatRefreshTimer)
  chatRefreshTimer = setTimeout(() => {
    chatRefreshTimer = null
    void refreshTree()
  }, 700)
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
      globalError.value = j.error ?? 'Не удалось загрузить данные'
    }
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
  }
}

/** Мобильный UI: только дерево или только задачи (не две колонки). */
const TASKS_MOBILE_MQ = '(max-width: 1023px)'
/** Класс на `document.documentElement` — увеличивает базовый rem на странице задач (читабельность). */
const TASKS_HTML_MOBILE_CLASS = 'tasks-page-html-mobile'

const isMobileTasksLayout = ref(false)
const mobilePane = ref<'tree' | 'tasks'>('tree')

function syncMobileLayout() {
  if (typeof window === 'undefined') return
  const mq = window.matchMedia(TASKS_MOBILE_MQ)
  isMobileTasksLayout.value = mq.matches
  if (!isMobileTasksLayout.value) {
    mobilePane.value = 'tree'
  }
  if (typeof document !== 'undefined') {
    if (mq.matches) {
      document.documentElement.classList.add(TASKS_HTML_MOBILE_CLASS)
    } else {
      document.documentElement.classList.remove(TASKS_HTML_MOBILE_CLASS)
    }
  }
}

const showTasksSidebar = computed(
  () => !isMobileTasksLayout.value || mobilePane.value === 'tree'
)
const showTasksPanel = computed(
  () => !isMobileTasksLayout.value || mobilePane.value === 'tasks'
)

/** Правая колонка чата: только десктоп (≥1024px). */
const showDesktopAiChat = computed(() => !isMobileTasksLayout.value)

const mobileAiChatOpen = ref(false)

function backToTasksTree() {
  mobilePane.value = 'tree'
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    window.scrollTo(0, 0)
  }
}

watch(selectedProjectId, (id) => {
  if (isMobileTasksLayout.value && !id) {
    mobilePane.value = 'tree'
  }
})

function selectProject(id: string) {
  const row = tree.value.projects.find((x) => x.id === id)
  if (!row) return
  selectedClientId.value = row.clientId
  selectedProjectId.value = id
  if (isMobileTasksLayout.value) {
    mobilePane.value = 'tasks'
  }
  log.info('Project selected', { id })
}

function prepareClientForNewProject(clientId: string) {
  if (!props.isAuthenticated) return
  selectedClientId.value = clientId
  selectedProjectId.value = null
  nextTick(() => openProjectCreate())
}

/** --- Модалки клиента --- */
const clientModal = ref<'create' | 'edit' | null>(null)
const clientFormName = ref('')
const clientEditId = ref<string | null>(null)
const clientSaving = ref(false)
const clientError = ref('')

function openClientCreate() {
  if (!props.isAuthenticated) return
  clientModal.value = 'create'
  clientFormName.value = ''
  clientError.value = ''
}

function openClientEdit(c: TaskClientDto) {
  clientModal.value = 'edit'
  clientEditId.value = c.id
  clientFormName.value = c.name
  clientError.value = ''
}

function closeClientModal() {
  clientModal.value = null
  clientEditId.value = null
}

async function submitClientModal() {
  clientSaving.value = true
  clientError.value = ''
  try {
    if (clientModal.value === 'create') {
      const j = await postJson<{ success: boolean; client?: TaskClientDto; error?: string }>(
        props.taskClientCreateUrl,
        { name: clientFormName.value }
      )
      if (!j.success || !j.client) {
        clientError.value = j.error ?? 'Ошибка'
        return
      }
      tree.value.clients.push(j.client)
      selectedClientId.value = j.client.id
      closeClientModal()
    } else if (clientModal.value === 'edit' && clientEditId.value) {
      const j = await postJson<{ success: boolean; client?: TaskClientDto; error?: string }>(
        props.taskClientUpdateUrl,
        { id: clientEditId.value, name: clientFormName.value }
      )
      if (!j.success || !j.client) {
        clientError.value = j.error ?? 'Ошибка'
        return
      }
      tree.value.clients = tree.value.clients.map((x) => (x.id === j.client!.id ? j.client! : x))
      closeClientModal()
    }
  } catch (e) {
    clientError.value = String(e)
  } finally {
    clientSaving.value = false
  }
}

const deleteTarget = ref<{ kind: 'client' | 'project' | 'task'; id: string; label: string } | null>(null)

function openDelete(kind: 'client' | 'project' | 'task', id: string, label: string) {
  deleteTarget.value = { kind, id, label }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const { kind, id } = deleteTarget.value
  deleteTarget.value = null
  try {
    if (kind === 'client') {
      const j = await postJson<{ success: boolean }>(props.taskClientDeleteUrl, { id })
      if (!j.success) return
      await refreshTree()
    } else if (kind === 'project') {
      const j = await postJson<{ success: boolean }>(props.taskProjectDeleteUrl, { id })
      if (!j.success) return
      selectedProjectId.value = null
      await refreshTree()
    } else {
      const j = await postJson<{ success: boolean }>(props.taskItemDeleteUrl, { id })
      if (!j.success) return
      tree.value.tasks = tree.value.tasks.filter((t) => t.id !== id)
    }
  } catch (e) {
    globalError.value = String(e)
  }
}

/** --- Проект --- */
const projectModal = ref<'create' | 'edit' | null>(null)
const projectFormName = ref('')
const projectFormDetails = ref('')
const projectEditId = ref<string | null>(null)
const projectSaving = ref(false)
const projectError = ref('')

function openProjectCreate() {
  if (!props.isAuthenticated || !selectedClientId.value) return
  projectModal.value = 'create'
  projectFormName.value = ''
  projectFormDetails.value = ''
  projectError.value = ''
}

function openProjectEdit(p: TaskProjectDto) {
  projectModal.value = 'edit'
  projectEditId.value = p.id
  projectFormName.value = p.name
  projectFormDetails.value = p.details ?? ''
  projectError.value = ''
}

function closeProjectModal() {
  projectModal.value = null
  projectEditId.value = null
  projectFormDetails.value = ''
}

async function submitProjectModal() {
  if (!selectedClientId.value && projectModal.value === 'create') return
  projectSaving.value = true
  projectError.value = ''
  try {
    if (projectModal.value === 'create') {
      const j = await postJson<{ success: boolean; project?: TaskProjectDto; error?: string }>(
        props.taskProjectCreateUrl,
        { clientId: selectedClientId.value!, name: projectFormName.value, details: projectFormDetails.value }
      )
      if (!j.success || !j.project) {
        projectError.value = j.error ?? 'Ошибка'
        return
      }
      tree.value.projects.push(j.project)
      selectedProjectId.value = j.project.id
      closeProjectModal()
    } else if (projectModal.value === 'edit' && projectEditId.value) {
      // Не передаём clientId: иначе при переименовании подставится selectedClientId сайдбара
      // (клиент выбранного проекта), и проект «переедет» к другому клиенту.
      const j = await postJson<{ success: boolean; project?: TaskProjectDto; error?: string }>(
        props.taskProjectUpdateUrl,
        {
          id: projectEditId.value,
          name: projectFormName.value,
          details: projectFormDetails.value
        }
      )
      if (!j.success || !j.project) {
        projectError.value = j.error ?? 'Ошибка'
        return
      }
      tree.value.projects = tree.value.projects.map((x) => (x.id === j.project!.id ? j.project! : x))
      closeProjectModal()
    }
  } catch (e) {
    projectError.value = String(e)
  } finally {
    projectSaving.value = false
  }
}

/** --- Задача --- */
const taskModal = ref<'create' | 'edit' | null>(null)
const taskForm = ref({
  title: '',
  details: '',
  priority: 2,
  status: 'todo' as TaskItemDto['status'],
  projectId: '' as string,
  eventAtLocal: '',
  reminderMinutesBefore: 15
})
const taskEditId = ref<string | null>(null)
const taskSaving = ref(false)
const taskError = ref('')

const REMINDER_AUDIO_URL = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'
const TASK_REMINDER_FIRED_KEY = 'assistant:task-reminders-fired:v1'
const reminderPermission = ref<NotificationPermission | 'unsupported'>('unsupported')
let reminderTimer: ReturnType<typeof setInterval> | null = null
let reminderAudioEl: HTMLAudioElement | null = null

function formatEventAtLocalInput(eventAtMs: number | null | undefined): string {
  if (!eventAtMs || !Number.isFinite(eventAtMs)) return ''
  const d = new Date(eventAtMs)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hour}:${minute}`
}

function parseEventAtLocalInput(value: string): number | undefined {
  const t = value.trim()
  if (!t) return undefined
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(t)
  if (!m) return undefined
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return undefined
  }
  if (month < 1 || month > 12 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined
  }
  const d = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== hour ||
    d.getMinutes() !== minute
  ) {
    return undefined
  }
  const ms = d.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return undefined
  return ms
}

function onEventAtInput(e: Event) {
  const inputEvent = e as InputEvent
  const isDeleting = inputEvent.inputType?.startsWith('delete') ?? false
  const raw = taskForm.value.eventAtLocal.replace(/\D/g, '').slice(0, 12)

  let formatted = ''
  if (raw.length <= 2) {
    formatted = raw
    if (!isDeleting && raw.length === 2) formatted += '/'
  } else if (raw.length <= 4) {
    formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`
    if (!isDeleting && raw.length === 4) formatted += '/'
  } else if (raw.length <= 8) {
    formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`
    if (!isDeleting && raw.length === 8) formatted += ' '
  } else if (raw.length <= 10) {
    formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)} ${raw.slice(8)}`
    if (!isDeleting && raw.length === 10) formatted += ':'
  } else {
    formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)} ${raw.slice(8, 10)}:${raw.slice(10)}`
  }

  taskForm.value.eventAtLocal = formatted
}

function loadReminderFiredMap(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(TASK_REMINDER_FIRED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function saveReminderFiredMap(map: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TASK_REMINDER_FIRED_KEY, JSON.stringify(map))
  } catch {
    // ignore quota errors
  }
}

function markTaskReminderFired(taskId: string, eventAtMs: number) {
  const map = loadReminderFiredMap()
  map[taskId] = eventAtMs
  saveReminderFiredMap(map)
}

function isTaskReminderAlreadyFired(taskId: string, eventAtMs: number): boolean {
  const map = loadReminderFiredMap()
  return map[taskId] === eventAtMs
}

function clearTaskReminderIfEventChanged(taskId: string, eventAtMs: number | null) {
  const map = loadReminderFiredMap()
  if (eventAtMs && map[taskId] === eventAtMs) return
  if (taskId in map) {
    delete map[taskId]
    saveReminderFiredMap(map)
  }
}

async function playReminderSound() {
  if (typeof window === 'undefined') return
  if (!reminderAudioEl) {
    reminderAudioEl = new Audio(REMINDER_AUDIO_URL)
    reminderAudioEl.preload = 'auto'
  }
  try {
    reminderAudioEl.currentTime = 0
    await reminderAudioEl.play()
  } catch {
    // autoplay may be blocked by browser policy
  }
}

function fireTaskReminder(task: TaskItemDto, remindAtMs: number) {
  if (!task.eventAtMs) return
  const title = task.title || 'Событие'
  const body = `Событие по задаче начнется в ${task.reminderMinutesBefore} мин.`
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, { body, tag: `task-reminder:${task.id}` })
      notification.onclick = () => {
        window.focus()
      }
    } catch {
      // ignore Notification errors
    }
  }
  void playReminderSound()
  markTaskReminderFired(task.id, task.eventAtMs)
  log.info('Task reminder fired', { taskId: task.id, remindAtMs })
}

function runTaskReminderChecks() {
  const now = Date.now()
  for (const task of tree.value.tasks) {
    const eventAtMs = task.eventAtMs ?? null
    clearTaskReminderIfEventChanged(task.id, eventAtMs)
    if (!eventAtMs) continue
    if (isTaskArchived(task.status)) continue
    if (isTaskReminderAlreadyFired(task.id, eventAtMs)) continue
    const remindAtMs = eventAtMs - Math.max(0, task.reminderMinutesBefore) * 60_000
    if (now >= remindAtMs && now <= eventAtMs + 5 * 60_000) {
      fireTaskReminder(task, remindAtMs)
    }
  }
}

async function requestReminderPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    reminderPermission.value = 'unsupported'
    return
  }
  const p = await Notification.requestPermission()
  reminderPermission.value = p
}

function openTaskCreate() {
  if (!props.isAuthenticated || !selectedProjectId.value) return
  taskModal.value = 'create'
  taskForm.value = {
    title: '',
    details: '',
    priority: 2,
    status: 'todo',
    projectId: selectedProjectId.value,
    eventAtLocal: '',
    reminderMinutesBefore: 15
  }
  taskError.value = ''
}

function openTaskEdit(t: TaskItemDto) {
  taskModal.value = 'edit'
  taskEditId.value = t.id
  taskForm.value = {
    title: t.title,
    details: t.details ?? '',
    priority: t.priority,
    status: t.status,
    projectId: t.projectId,
    eventAtLocal: formatEventAtLocalInput(t.eventAtMs),
    reminderMinutesBefore: t.reminderMinutesBefore
  }
  taskError.value = ''
}

function closeTaskModal() {
  taskModal.value = null
  taskEditId.value = null
}

async function submitTaskModal() {
  taskSaving.value = true
  taskError.value = ''
  try {
    if (taskModal.value === 'create') {
      const eventAtMs = parseEventAtLocalInput(taskForm.value.eventAtLocal)
      const j = await postJson<{ success: boolean; task?: TaskItemDto; error?: string }>(
        props.taskItemCreateUrl,
        {
          projectId: taskForm.value.projectId,
          title: taskForm.value.title,
          details: taskForm.value.details,
          priority: taskForm.value.priority,
          status: taskForm.value.status,
          eventAtMs: eventAtMs ?? null,
          reminderMinutesBefore: taskForm.value.reminderMinutesBefore
        }
      )
      if (!j.success || !j.task) {
        taskError.value = j.error ?? 'Ошибка'
        return
      }
      tree.value.tasks.push(j.task)
      closeTaskModal()
    } else if (taskModal.value === 'edit' && taskEditId.value) {
      const eventAtMs = parseEventAtLocalInput(taskForm.value.eventAtLocal)
      const j = await postJson<{ success: boolean; task?: TaskItemDto; error?: string }>(
        props.taskItemUpdateUrl,
        {
          id: taskEditId.value,
          title: taskForm.value.title,
          details: taskForm.value.details,
          priority: taskForm.value.priority,
          status: taskForm.value.status,
          projectId: taskForm.value.projectId,
          eventAtMs: eventAtMs ?? null,
          reminderMinutesBefore: taskForm.value.reminderMinutesBefore
        }
      )
      if (!j.success || !j.task) {
        taskError.value = j.error ?? 'Ошибка'
        return
      }
      tree.value.tasks = tree.value.tasks.map((x) => (x.id === j.task!.id ? j.task! : x))
      closeTaskModal()
    }
  } catch (e) {
    taskError.value = String(e)
  } finally {
    taskSaving.value = false
  }
}

async function markTaskForDay(t: TaskItemDto) {
  if (!props.isAuthenticated) return
  const nextStatus: TaskItemDto['status'] = t.status === 'in_progress' ? 'todo' : 'in_progress'
  loading.value = true
  globalError.value = ''
  try {
    const j = await postJson<{ success: boolean; task?: TaskItemDto; error?: string }>(props.taskItemUpdateUrl, {
      id: t.id,
      status: nextStatus
    })
    if (!j.success || !j.task) {
      globalError.value = j.error ?? 'Не удалось обновить задачу'
      return
    }
    tree.value.tasks = tree.value.tasks.map((x) => (x.id === j.task!.id ? j.task! : x))
    log.info(nextStatus === 'in_progress' ? 'Task marked for day (in progress)' : 'Task back to todo', { id: t.id })
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
  }
}

async function assignTaskToPomodoro(t: TaskItemDto) {
  if (!props.isAuthenticated) return
  globalError.value = ''
  const statsDayKey = computePomodoroStatsDayKeyForUtcOffsetHours(Date.now(), props.timezoneOffsetHours)
  try {
    const j = await postJson<{
      success: boolean
      error?: string
      state?: { pomodoro?: { status: string } }
    }>(props.toolsControlUrl, {
      statsDayKey,
      command: { kind: 'assign-task', taskId: t.id },
    })
    if (!j.success) {
      globalError.value = j.error ?? 'Не удалось добавить задачу в помидор'
      return
    }
    const status = j.state?.pomodoro?.status
    let pomodoroSessionStartedFromTasksPage = false
    if (status && status !== 'running') {
      let action: 'start' | 'resume' | null = null
      if (status === 'stopped') action = 'start'
      else if (status === 'paused' || status === 'awaiting_continue') action = 'resume'
      if (action) {
        const cj = await postJson<{ success: boolean; error?: string }>(props.toolsControlUrl, {
          statsDayKey,
          command: { kind: 'pomodoro', action },
        })
        if (!cj.success) {
          globalError.value = cj.error ?? 'Не удалось запустить таймер pomodoro'
          return
        }
        pomodoroSessionStartedFromTasksPage = true
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('assistant:focus-task-selected', {
          detail: { taskId: t.id, pomodoroSessionStartedFromTasksPage },
        })
      )
    }
  } catch (e) {
    globalError.value = String(e)
  }
}

const statusMenuTaskId = ref<string | null>(null)

function toggleTaskStatusMenu(taskId: string) {
  if (!props.isAuthenticated) return
  statusMenuTaskId.value = statusMenuTaskId.value === taskId ? null : taskId
}

function closeTaskStatusMenu() {
  statusMenuTaskId.value = null
}

async function updateTaskStatus(t: TaskItemDto, status: TaskItemDto['status']) {
  if (!props.isAuthenticated) return
  if (t.status === status) {
    closeTaskStatusMenu()
    return
  }
  loading.value = true
  globalError.value = ''
  try {
    const j = await postJson<{ success: boolean; task?: TaskItemDto; error?: string }>(props.taskItemUpdateUrl, {
      id: t.id,
      status
    })
    if (!j.success || !j.task) {
      globalError.value = j.error ?? 'Не удалось обновить статус'
      return
    }
    tree.value.tasks = tree.value.tasks.map((x) => (x.id === j.task!.id ? j.task! : x))
    closeTaskStatusMenu()
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
  }
}

function updateTaskStatusByValue(t: TaskItemDto, status: string) {
  void updateTaskStatus(t, status as TaskItemDto['status'])
}

function onWindowPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement | null
  if (target?.closest('.tasks-status-cell')) return
  closeTaskStatusMenu()
}

function applyTasksUrlQuery() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const qp = params.get('project')
  const qc = params.get('client')
  if (qp) {
    const proj = tree.value.projects.find((p) => p.id === qp)
    if (proj) {
      selectedClientId.value = proj.clientId
      selectedProjectId.value = proj.id
      return
    }
  }
  if (qc) {
    const c = tree.value.clients.find((x) => x.id === qc)
    if (c) selectedClientId.value = qc
  }
}

async function moveTask(t: TaskItemDto, dir: -1 | 1) {
  const list = tasksForProject.value
  const idx = list.findIndex((x) => x.id === t.id)
  const j = idx + dir
  if (idx < 0 || j < 0 || j >= list.length) return
  const orderedIds = list.map((x) => x.id)
  const tmp = orderedIds[idx]
  orderedIds[idx] = orderedIds[j]
  orderedIds[j] = tmp
  const r = await postJson<{ success: boolean }>(props.taskItemReorderUrl, {
    projectId: t.projectId,
    orderedIds
  })
  if (!r.success) return
  let o = 0
  for (const id of orderedIds) {
    const row = tree.value.tasks.find((x) => x.id === id)
    if (row) row.sortOrder = o
    o++
  }
}

const startAfterBoot = () => {
  bootLoaderDone.value = true
  scheduleHideBootLoader()
}

let unsubBootStatic: (() => void) | null = null
let mqListener: (() => void) | null = null

onMounted(() => {
  log.info('TasksPage mounted')
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
  syncMobileLayout()
  mqListener = () => syncMobileLayout()
  window.matchMedia(TASKS_MOBILE_MQ).addEventListener('change', mqListener)
  unsubBootStatic = subscribeBootStaticReady(startAfterBoot)
  window.addEventListener('pointerdown', onWindowPointerDown)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    reminderPermission.value = Notification.permission
  }
  runTaskReminderChecks()
  reminderTimer = setInterval(runTaskReminderChecks, 15_000)
  void nextTick(() => {
    applyTasksUrlQuery()
    if (isMobileTasksLayout.value && selectedProjectId.value) {
      mobilePane.value = 'tasks'
    }
  })
})

watch(
  () => [tree.value.clients.length, tree.value.projects.length] as const,
  () => {
    applyTasksUrlQuery()
    if (isMobileTasksLayout.value && selectedProjectId.value) {
      mobilePane.value = 'tasks'
    }
  }
)

watch(
  () => tree.value.tasks,
  () => {
    runTaskReminderChecks()
  },
  { deep: true }
)

onUnmounted(() => {
  unsubBootStatic?.()
  if (mqListener) {
    window.matchMedia(TASKS_MOBILE_MQ).removeEventListener('change', mqListener)
    mqListener = null
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove(TASKS_HTML_MOBILE_CLASS)
  }
  window.removeEventListener('pointerdown', onWindowPointerDown)
  if (reminderTimer) {
    clearInterval(reminderTimer)
    reminderTimer = null
  }
})

const openChatiumLink = () => {
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

/** --- Drag-and-drop: порядок клиентов и проектов в сайдбаре --- */
type SidebarDragKind = 'client' | 'project' | null

const dragKind = ref<SidebarDragKind>(null)
const dragClientId = ref<string | null>(null)
const dragProjectId = ref<string | null>(null)
const dragProjectClientId = ref<string | null>(null)
/** Индекс линии вставки: 0 — перед первым клиентом, length — после последнего */
const clientInsertBefore = ref<number | null>(null)
/** Вставка в списке проектов клиента `clientId` перед индексом `idx` */
const projectInsertBefore = ref<{ clientId: string; beforeIdx: number } | null>(null)

function clearSidebarDragState() {
  dragKind.value = null
  dragClientId.value = null
  dragProjectId.value = null
  dragProjectClientId.value = null
  clientInsertBefore.value = null
  projectInsertBefore.value = null
}

function onClientDragStart(e: DragEvent, clientId: string) {
  if (!props.isAuthenticated || isMobileTasksLayout.value) return
  dragKind.value = 'client'
  dragClientId.value = clientId
  e.dataTransfer?.setData('text/plain', `client:${clientId}`)
  e.dataTransfer!.effectAllowed = 'move'
}

function onProjectDragStart(e: DragEvent, projectId: string, clientId: string) {
  if (!props.isAuthenticated || isMobileTasksLayout.value) return
  dragKind.value = 'project'
  dragProjectId.value = projectId
  dragProjectClientId.value = clientId
  e.dataTransfer?.setData('text/plain', `project:${projectId}:${clientId}`)
  e.dataTransfer!.effectAllowed = 'move'
}

function onClientDragOver(e: DragEvent, cIdx: number) {
  e.preventDefault()
  if (dragKind.value !== 'client' || !dragClientId.value) return
  e.dataTransfer!.dropEffect = 'move'
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const mid = r.top + r.height / 2
  const insertBefore = e.clientY < mid ? cIdx : cIdx + 1
  const originalIds = sortedClients.value.map((c) => c.id)
  const fromIdx = originalIds.indexOf(dragClientId.value)
  if (fromIdx < 0 || !reorderIdsWouldChange(originalIds, fromIdx, insertBefore)) {
    clientInsertBefore.value = null
    return
  }
  clientInsertBefore.value = insertBefore
}

function onClientDragLeave(e: DragEvent) {
  const rel = e.relatedTarget as Node | null
  const block = e.currentTarget as HTMLElement
  if (rel && block.contains(rel)) return
  const hier = block.closest('.tasks-hierarchy')
  if (rel && hier?.contains(rel)) return
  clientInsertBefore.value = null
}

function hierarchyEndZoneBottomPx(box: DOMRect): number {
  return Math.max(48, Math.min(120, box.height * 0.14))
}

function trySetClientInsertAtEnd() {
  if (dragKind.value !== 'client' || !dragClientId.value) return
  const originalIds = sortedClients.value.map((c) => c.id)
  const fromIdx = originalIds.indexOf(dragClientId.value)
  const insertBefore = sortedClients.value.length
  if (fromIdx < 0 || !reorderIdsWouldChange(originalIds, fromIdx, insertBefore)) {
    clientInsertBefore.value = null
    return
  }
  clientInsertBefore.value = insertBefore
}

function onHierarchyDragOver(e: DragEvent) {
  e.preventDefault()
  if (dragKind.value !== 'client' || !dragClientId.value) return
  e.dataTransfer!.dropEffect = 'move'
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientY >= box.bottom - hierarchyEndZoneBottomPx(box)) {
    trySetClientInsertAtEnd()
  }
}

function onHierarchyTailDragOver(e: DragEvent) {
  e.preventDefault()
  if (dragKind.value !== 'client' || !dragClientId.value) return
  e.dataTransfer!.dropEffect = 'move'
  trySetClientInsertAtEnd()
}

function onHierarchyTailDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (dragKind.value !== 'client' || !dragClientId.value) return
  const id = dragClientId.value
  clearSidebarDragState()
  if (!id) return
  void persistClientOrder(id, sortedClients.value.length)
}

function onClientDrop(e: DragEvent, cIdx: number) {
  e.preventDefault()
  e.stopPropagation()
  const id = dragClientId.value
  clearSidebarDragState()
  if (!id) return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const mid = r.top + r.height / 2
  const insertBefore = e.clientY < mid ? cIdx : cIdx + 1
  void persistClientOrder(id, insertBefore)
}

function onHierarchyDrop(e: DragEvent) {
  e.preventDefault()
  if (dragKind.value !== 'client' || !dragClientId.value) return
  const id = dragClientId.value
  const wantEnd = clientInsertBefore.value === sortedClients.value.length
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const inEndZone = e.clientY >= box.bottom - hierarchyEndZoneBottomPx(box)
  clearSidebarDragState()
  if (!id) return
  if (wantEnd || inEndZone) {
    void persistClientOrder(id, sortedClients.value.length)
  }
}

function onClientDragEnd() {
  clearSidebarDragState()
}

function isSameIdOrder(next: string[], prev: string[]): boolean {
  return next.length === prev.length && next.every((id, i) => id === prev[i])
}

/**
 * insertBefore — индекс в исходном массиве: «вставить перед элементом с этим индексом» (0…length).
 * Значение `length` — вставка в конец.
 */
function reorderIdsWithInsertBefore(originalIds: string[], fromIdx: number, insertBefore: number): string[] {
  const next = [...originalIds]
  const [removed] = next.splice(fromIdx, 1)
  let insertAt = insertBefore
  if (fromIdx < insertBefore) insertAt = insertBefore - 1
  next.splice(insertAt, 0, removed)
  return next
}

/** true, если после перемещения элемента с индекса `fromIdx` к позиции «перед insertBefore» порядок id изменится */
function reorderIdsWouldChange(originalIds: string[], fromIdx: number, insertBefore: number): boolean {
  if (fromIdx < 0 || insertBefore < 0 || insertBefore > originalIds.length) return false
  const next = reorderIdsWithInsertBefore(originalIds, fromIdx, insertBefore)
  return !isSameIdOrder(next, originalIds)
}

async function persistClientOrder(movedId: string, insertBefore: number) {
  const list = sortedClients.value
  const fromIdx = list.findIndex((c) => c.id === movedId)
  if (fromIdx < 0) return
  if (insertBefore < 0 || insertBefore > list.length) return
  const originalIds = list.map((c) => c.id)
  const orderedIds = reorderIdsWithInsertBefore(originalIds, fromIdx, insertBefore)
  if (isSameIdOrder(orderedIds, originalIds)) return
  const r = await postJson<{ success: boolean; error?: string }>(props.taskClientReorderUrl, { orderedIds })
  if (!r.success) {
    globalError.value = r.error ?? 'Не удалось сохранить порядок клиентов'
    await refreshTree()
    return
  }
  let o = 0
  for (const cid of orderedIds) {
    const row = tree.value.clients.find((x) => x.id === cid)
    if (row) row.sortOrder = o
    o++
  }
}

function projectItemDropRowRect(e: DragEvent): DOMRect {
  const li = (e.currentTarget as HTMLElement).closest('.tasks-project-item')
  return (li ?? (e.currentTarget as HTMLElement)).getBoundingClientRect()
}

function onProjectDragOver(e: DragEvent, clientId: string, pIdx: number) {
  e.preventDefault()
  if (dragKind.value !== 'project' || dragProjectClientId.value !== clientId || !dragProjectId.value) return
  e.dataTransfer!.dropEffect = 'move'
  const r = projectItemDropRowRect(e)
  const mid = r.top + r.height / 2
  const insertBefore = e.clientY < mid ? pIdx : pIdx + 1
  const originalIds = projectsForClientId(clientId).map((p) => p.id)
  const fromIdx = originalIds.indexOf(dragProjectId.value)
  if (fromIdx < 0 || !reorderIdsWouldChange(originalIds, fromIdx, insertBefore)) {
    projectInsertBefore.value = null
    return
  }
  projectInsertBefore.value = { clientId, beforeIdx: insertBefore }
}

function onProjectListDragLeave(e: DragEvent, clientId: string) {
  const rel = e.relatedTarget as Node | null
  const ul = e.currentTarget as HTMLElement
  if (rel && ul.contains(rel)) return
  const block = ul.closest('.tasks-client-block')
  if (rel && block?.contains(rel)) return
  if (projectInsertBefore.value?.clientId === clientId) projectInsertBefore.value = null
}

function projectListEndZoneBottomPx(el: HTMLElement): number {
  return Math.max(32, Math.min(96, el.getBoundingClientRect().height * 0.14))
}

function trySetProjectInsertAtEnd(clientId: string) {
  if (dragKind.value !== 'project' || dragProjectClientId.value !== clientId || !dragProjectId.value) return
  const listLen = projectsForClientId(clientId).length
  const originalIds = projectsForClientId(clientId).map((p) => p.id)
  const fromIdx = originalIds.indexOf(dragProjectId.value)
  if (fromIdx < 0 || !reorderIdsWouldChange(originalIds, fromIdx, listLen)) {
    projectInsertBefore.value = null
    return
  }
  projectInsertBefore.value = { clientId, beforeIdx: listLen }
}

function onProjectListDragOver(e: DragEvent, clientId: string) {
  e.preventDefault()
  if (dragKind.value !== 'project' || dragProjectClientId.value !== clientId || !dragProjectId.value) return
  e.dataTransfer!.dropEffect = 'move'
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  if (e.clientY >= r.bottom - projectListEndZoneBottomPx(el)) {
    trySetProjectInsertAtEnd(clientId)
  }
}

function onProjectDrop(e: DragEvent, clientId: string, pIdx: number) {
  e.preventDefault()
  e.stopPropagation()
  const id = dragProjectId.value
  const fromClient = dragProjectClientId.value
  clearSidebarDragState()
  if (!id || fromClient !== clientId) return
  const r = projectItemDropRowRect(e)
  const mid = r.top + r.height / 2
  const insertBefore = e.clientY < mid ? pIdx : pIdx + 1
  void persistProjectOrder(clientId, id, insertBefore)
}

function onProjectListDrop(e: DragEvent, clientId: string, listLen: number) {
  e.preventDefault()
  e.stopPropagation()
  const id = dragProjectId.value
  const fromClient = dragProjectClientId.value
  const wantEnd =
    projectInsertBefore.value?.clientId === clientId && projectInsertBefore.value.beforeIdx === listLen
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const inEndZone = e.clientY >= r.bottom - projectListEndZoneBottomPx(el)
  clearSidebarDragState()
  if (!id || fromClient !== clientId) return
  if (wantEnd || inEndZone) {
    void persistProjectOrder(clientId, id, listLen)
  }
}

function onProjectDragEnd() {
  clearSidebarDragState()
}

async function persistProjectOrder(clientId: string, movedId: string, insertBefore: number) {
  const list = projectsForClientId(clientId)
  const fromIdx = list.findIndex((p) => p.id === movedId)
  if (fromIdx < 0) return
  if (insertBefore < 0 || insertBefore > list.length) return
  const originalIds = list.map((p) => p.id)
  const orderedIds = reorderIdsWithInsertBefore(originalIds, fromIdx, insertBefore)
  if (isSameIdOrder(orderedIds, originalIds)) return
  const r = await postJson<{ success: boolean; error?: string }>(props.taskProjectReorderUrl, {
    clientId,
    orderedIds
  })
  if (!r.success) {
    globalError.value = r.error ?? 'Не удалось сохранить порядок проектов'
    await refreshTree()
    return
  }
  let o = 0
  for (const pid of orderedIds) {
    const row = tree.value.projects.find((x) => x.id === pid)
    if (row) row.sortOrder = o
    o++
  }
}

function showClientLineBefore(idx: number): boolean {
  return clientInsertBefore.value === idx
}

function showProjectLineBefore(clientId: string, idx: number): boolean {
  const p = projectInsertBefore.value
  return !!p && p.clientId === clientId && p.beforeIdx === idx
}
</script>

<template>
  <div class="app-layout tasks-page-app bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
      :timezoneOffsetHours="props.timezoneOffsetHours"
      :enableToolClockWidget="true"
      :toolsStateUrl="props.toolsStateUrl"
      :toolsControlUrl="props.toolsControlUrl"
      :encodedFocusToolsSocketId="props.encodedFocusToolsSocketId"
    />

    <main class="content-wrapper tasks-page-main flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner tasks-page-shell">
        <aside v-show="showTasksSidebar" class="tasks-sidebar" aria-label="Клиенты и проекты">
          <div class="tasks-sidebar-toolbar">
            <button
              type="button"
              class="tasks-sidebar-toolbar-btn tasks-sidebar-btn-subtle"
              :disabled="!props.isAuthenticated"
              title="Добавить клиента"
              @click="openClientCreate"
            >
              Новый клиент
            </button>
          </div>
          <div class="journal-nav-divider" aria-hidden="true" />
          <p v-if="!props.isAuthenticated" class="tasks-hint">Войдите, чтобы вести задачи.</p>
          <div
            v-else
            class="tasks-hierarchy"
            @dragover="onHierarchyDragOver"
            @drop="onHierarchyDrop"
          >
            <p v-if="!sortedClients.length" class="tasks-hint tasks-hint--muted">Пока нет клиентов — создайте первого.</p>
            <div
              v-for="(c, cIdx) in sortedClients"
              :key="c.id"
              class="tasks-client-block"
              :class="{ 'tasks-client-block--dragging': dragKind === 'client' && dragClientId === c.id }"
              @dragover="onClientDragOver($event, cIdx)"
              @dragleave="onClientDragLeave"
              @drop="onClientDrop($event, cIdx)"
            >
              <div
                v-if="showClientLineBefore(cIdx)"
                class="tasks-dnd-line"
                aria-hidden="true"
              />
              <div class="tasks-client-row">
                <span
                  v-if="props.isAuthenticated"
                  class="tasks-dnd-grip"
                  :draggable="!isMobileTasksLayout"
                  title="Перетащить клиента"
                  aria-label="Перетащить клиента"
                  @dragstart="onClientDragStart($event, c.id)"
                  @dragend="onClientDragEnd"
                >
                  <i class="fas fa-grip-vertical" aria-hidden="true" />
                </span>
                <div
                  class="tasks-client-select tasks-client-select--static"
                  :class="{ 'tasks-client-select--project-active': selectedProject?.clientId === c.id }"
                >
                  {{ c.name }}
                </div>
                <div v-if="props.isAuthenticated" class="tasks-item-actions">
                  <button
                    type="button"
                    class="tasks-icon-btn"
                    title="Новый проект у этого клиента"
                    @click="prepareClientForNewProject(c.id)"
                  >
                    <i class="fas fa-folder-plus" aria-hidden="true" />
                  </button>
                  <button type="button" class="tasks-icon-btn" title="Переименовать" @click="openClientEdit(c)">
                    <i class="fas fa-pen" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="tasks-icon-btn tasks-icon-btn--danger"
                    title="Удалить клиента и всё внутри"
                    @click="openDelete('client', c.id, c.name)"
                  >
                    <i class="fas fa-trash" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <ul
                class="tasks-project-list"
                role="list"
                @dragover.capture="onProjectListDragOver($event, c.id)"
                @dragleave="onProjectListDragLeave($event, c.id)"
                @drop="onProjectListDrop($event, c.id, projectsForClientId(c.id).length)"
              >
                <li
                  v-for="(p, pIdx) in projectsForClientId(c.id)"
                  :key="p.id"
                  class="tasks-project-item"
                  :class="{ 'tasks-project-item--dragging': dragKind === 'project' && dragProjectId === p.id }"
                >
                  <div
                    v-if="showProjectLineBefore(c.id, pIdx)"
                    class="tasks-dnd-line tasks-dnd-line--nested"
                    aria-hidden="true"
                  />
                  <div class="tasks-project-row">
                    <span
                      v-if="props.isAuthenticated"
                      class="tasks-dnd-grip tasks-dnd-grip--nested"
                      :draggable="!isMobileTasksLayout"
                      title="Перетащить проект"
                      aria-label="Перетащить проект"
                      @dragstart="onProjectDragStart($event, p.id, c.id)"
                      @dragend="onProjectDragEnd"
                      @dragover.prevent="onProjectDragOver($event, c.id, pIdx)"
                      @drop.prevent="onProjectDrop($event, c.id, pIdx)"
                    >
                      <i class="fas fa-grip-vertical" aria-hidden="true" />
                    </span>
                    <div
                      class="tasks-project-drop-target"
                      @dragover.prevent="onProjectDragOver($event, c.id, pIdx)"
                      @drop.prevent="onProjectDrop($event, c.id, pIdx)"
                    >
                      <button
                        type="button"
                        class="journal-nav-btn tasks-project-btn"
                        :class="{ 'journal-nav-btn--active': selectedProjectId === p.id }"
                        @click="selectProject(p.id)"
                      >
                        {{ p.name }}
                      </button>
                      <div v-if="props.isAuthenticated" class="tasks-item-actions">
                        <button type="button" class="tasks-icon-btn" title="Переименовать" @click="openProjectEdit(p)">
                          <i class="fas fa-pen" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          class="tasks-icon-btn tasks-icon-btn--danger"
                          title="Удалить проект"
                          @click="openDelete('project', p.id, p.name)"
                        >
                          <i class="fas fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
                <li
                  v-if="showProjectLineBefore(c.id, projectsForClientId(c.id).length)"
                  role="presentation"
                  class="tasks-dnd-line-slot"
                  aria-hidden="true"
                >
                  <div class="tasks-dnd-line tasks-dnd-line--nested" />
                </li>
              </ul>
              <p
                v-if="props.isAuthenticated && !projectsForClientId(c.id).length"
                class="tasks-project-empty"
              >
                Нет проектов
              </p>
            </div>
            <div
              v-if="sortedClients.length && showClientLineBefore(sortedClients.length)"
              class="tasks-dnd-line"
              aria-hidden="true"
            />
            <div
              v-if="sortedClients.length"
              class="tasks-hierarchy-tail"
              aria-hidden="true"
              @dragover="onHierarchyTailDragOver"
              @drop="onHierarchyTailDrop"
            />
          </div>
        </aside>

        <section
          v-show="showTasksPanel"
          class="journal-panel tasks-panel"
          :class="{ 'tasks-panel--mobile-fill': isMobileTasksLayout && mobilePane === 'tasks' }"
          aria-live="polite"
        >
          <div class="tasks-panel-head">
            <button
              v-if="isMobileTasksLayout"
              type="button"
              class="tasks-mobile-back"
              aria-label="Назад к списку проектов"
              @click="backToTasksTree"
            >
              <i class="fas fa-arrow-left" aria-hidden="true" />
              <span>Проекты</span>
            </button>
            <div class="tasks-panel-head-center">
              <h2 class="tasks-panel-title">
                <template v-if="selectedProject && selectedClient">
                  {{ selectedClient.name }} / {{ selectedProject.name }}
                </template>
                <template v-else>Задачи</template>
              </h2>
            </div>
            <div class="tasks-panel-head-actions">
              <button
                type="button"
                class="journal-nav-btn tasks-panel-toggle"
                :disabled="!selectedProjectId"
                :aria-pressed="showArchive"
                @click="showArchive = !showArchive"
              >
                {{ showArchive ? 'Активные' : 'Архив' }}
              </button>
              <button
                type="button"
                class="journal-nav-action tasks-panel-add"
                :disabled="!props.isAuthenticated || !selectedProjectId"
                @click="openTaskCreate"
              >
                Новая задача
              </button>
            </div>
          </div>
          <p v-if="globalError" class="tasks-global-err" role="alert">{{ globalError }}</p>
          <p v-if="loading" class="tasks-loading">Обновление…</p>

          <div v-if="!selectedProjectId" class="tasks-placeholder">Выберите проект, чтобы увидеть задачи.</div>

          <table v-else class="tasks-table">
            <thead>
              <tr>
                <th scope="col">Задача</th>
                <th scope="col">Приоритет</th>
                <th scope="col">Статус</th>
                <th scope="col">Порядок</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in visibleTasksForProject" :key="t.id">
                <td data-label="Задача">
                  <div class="tasks-title">{{ t.title }}</div>
                  <div v-if="t.details" class="tasks-desc">{{ t.details }}</div>
                  <div v-if="t.eventAtMs" class="tasks-event-meta">
                    <i class="fas fa-calendar-alt" aria-hidden="true" />
                    <span>
                      {{ new Date(t.eventAtMs).toLocaleString('ru-RU') }} · напомнить за
                      {{ t.reminderMinutesBefore }} мин
                    </span>
                  </div>
                </td>
                <td data-label="Приоритет">
                  <span class="tasks-badge" :class="`tasks-badge--p${t.priority}`">
                    {{ PRIORITY_LABELS[t.priority] ?? t.priority }}
                  </span>
                </td>
                <td class="tasks-status-cell" data-label="Статус">
                  <button
                    type="button"
                    class="tasks-status-trigger"
                    :disabled="!props.isAuthenticated"
                    @click.stop="toggleTaskStatusMenu(t.id)"
                  >
                    {{ STATUS_LABELS[t.status] ?? t.status }}
                    <i class="fas fa-chevron-down" aria-hidden="true" />
                  </button>
                  <div
                    v-if="statusMenuTaskId === t.id"
                    class="tasks-status-menu"
                    role="menu"
                    aria-label="Изменить статус задачи"
                    @click.stop
                  >
                    <button
                      v-for="option in statusSelectOptions"
                      :key="option.value"
                      type="button"
                      class="tasks-status-menu-item"
                      :class="{ 'tasks-status-menu-item--active': option.value === t.status }"
                      role="menuitemradio"
                      :aria-checked="option.value === t.status"
                      @click="updateTaskStatusByValue(t, option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </td>
                <td class="tasks-reorder" data-label="Порядок">
                  <button type="button" class="tasks-reorder-btn" title="Выше" @click="moveTask(t, -1)">
                    <i class="fas fa-chevron-up" aria-hidden="true" />
                  </button>
                  <button type="button" class="tasks-reorder-btn" title="Ниже" @click="moveTask(t, 1)">
                    <i class="fas fa-chevron-down" aria-hidden="true" />
                  </button>
                </td>
                <td class="tasks-row-actions" data-label="Действия">
                  <button
                    type="button"
                    class="tasks-icon-btn tasks-icon-btn--accent"
                    :class="{ 'tasks-icon-btn--in-progress': t.status === 'in_progress' }"
                    :title="
                      t.status === 'in_progress'
                        ? 'Вернуть в «К выполнению»'
                        : 'Отметить на день (статус «В работе»)'
                    "
                    :disabled="!props.isAuthenticated"
                    @click="markTaskForDay(t)"
                  >
                    <i class="fas fa-bookmark" aria-hidden="true" />
                  </button>
                  <button type="button" class="tasks-icon-btn" title="Изменить" @click="openTaskEdit(t)">
                    <i class="fas fa-pen" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="tasks-icon-btn"
                    title="Добавить в pomodoro"
                    :disabled="!props.isAuthenticated"
                    @click="assignTaskToPomodoro(t)"
                  >
                    <i class="fas fa-clock" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="tasks-icon-btn tasks-icon-btn--danger"
                    title="Удалить"
                    @click="openDelete('task', t.id, t.title)"
                  >
                    <i class="fas fa-trash" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-if="selectedProjectId && !visibleTasksForProject.length" class="tasks-placeholder">
            {{ showArchive ? 'В архиве пока нет задач.' : 'В этом проекте пока нет активных задач.' }}
          </p>
        </section>

        <aside
          v-if="showDesktopAiChat"
          class="tasks-ai-chat-sidebar"
          aria-label="Чат с AI"
        >
          <TasksAiChatPanel
            :projectId="selectedProjectId"
            :isAuthenticated="props.isAuthenticated"
            :ensureUrl="props.taskAiChatEnsureUrl"
            :resetUrl="props.taskAiChatResetUrl"
            @tasks-maybe-changed="onTasksChatMaybeChanged"
          />
        </aside>
      </div>

      <button
        v-if="isMobileTasksLayout && props.isAuthenticated"
        type="button"
        class="tasks-ai-chat-fab"
        aria-label="Открыть чат с AI"
        @click="mobileAiChatOpen = true"
      >
        <i class="fas fa-comments" aria-hidden="true" />
      </button>

      <Teleport to="body">
        <Transition name="jn-modal">
          <div
            v-if="isMobileTasksLayout && mobileAiChatOpen"
            class="jn-modal-overlay tasks-ai-chat-mobile-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Чат с AI"
            @click.self="mobileAiChatOpen = false"
          >
            <div class="tasks-ai-chat-mobile-sheet" @click.stop>
              <div class="tasks-ai-chat-mobile-head">
                <span class="tasks-ai-chat-mobile-title">Чат с AI</span>
                <button
                  type="button"
                  class="tasks-icon-btn"
                  aria-label="Закрыть"
                  @click="mobileAiChatOpen = false"
                >
                  <i class="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <TasksAiChatPanel
                :projectId="selectedProjectId"
                :isAuthenticated="props.isAuthenticated"
                :ensureUrl="props.taskAiChatEnsureUrl"
                :resetUrl="props.taskAiChatResetUrl"
                @tasks-maybe-changed="onTasksChatMaybeChanged"
              />
            </div>
          </div>
        </Transition>
      </Teleport>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />

    <Teleport to="body">
      <Transition name="jn-modal">
        <div
          v-if="clientModal"
          class="jn-modal-overlay"
          role="dialog"
          aria-modal="true"
          @click.self="closeClientModal"
        >
          <div class="jn-modal" @click.stop>
            <h2 class="jn-modal-heading">{{ clientModal === 'create' ? 'Новый клиент' : 'Клиент' }}</h2>
            <label class="jn-label" for="tc-name">Название</label>
            <input id="tc-name" v-model="clientFormName" type="text" class="jn-input" maxlength="200" />
            <p v-if="clientError" class="jn-modal-error" role="alert">{{ clientError }}</p>
            <div class="jn-modal-actions">
              <button type="button" class="journal-nav-btn" @click="closeClientModal">Отмена</button>
              <button type="button" class="journal-nav-action" :disabled="clientSaving" @click="submitClientModal">
                {{ clientSaving ? '…' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="jn-modal">
        <div
          v-if="projectModal"
          class="jn-modal-overlay"
          role="dialog"
          aria-modal="true"
          @click.self="closeProjectModal"
        >
          <div class="jn-modal" @click.stop>
            <h2 class="jn-modal-heading">{{ projectModal === 'create' ? 'Новый проект' : 'Проект' }}</h2>
            <label class="jn-label" for="tp-name">Название</label>
            <input id="tp-name" v-model="projectFormName" type="text" class="jn-input" maxlength="200" />
            <label class="jn-label" for="tp-details">Детали</label>
            <textarea id="tp-details" v-model="projectFormDetails" class="jn-textarea" rows="4" />
            <p v-if="projectError" class="jn-modal-error" role="alert">{{ projectError }}</p>
            <div class="jn-modal-actions">
              <button type="button" class="journal-nav-btn" @click="closeProjectModal">Отмена</button>
              <button type="button" class="journal-nav-action" :disabled="projectSaving" @click="submitProjectModal">
                {{ projectSaving ? '…' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="jn-modal">
        <div
          v-if="taskModal"
          class="jn-modal-overlay"
          role="dialog"
          aria-modal="true"
          @click.self="closeTaskModal"
        >
          <div class="jn-modal jn-modal--wide crt-form-panel" @click.stop>
            <h2 class="jn-modal-heading">{{ taskModal === 'create' ? 'Новая задача' : 'Задача' }}</h2>
            <label class="jn-label" for="tt-title">Заголовок</label>
            <input id="tt-title" v-model="taskForm.title" type="text" class="jn-input" maxlength="500" />
            <label class="jn-label" for="tt-desc">Детали</label>
            <textarea id="tt-desc" v-model="taskForm.details" class="jn-textarea" rows="5" />
            <label class="jn-label" for="tt-p">Приоритет</label>
            <JnCrtSelect id="tt-p" v-model="taskForm.priority" :options="prioritySelectOptions" />
            <label class="jn-label" for="tt-s">Статус</label>
            <JnCrtSelect id="tt-s" v-model="taskForm.status" :options="statusSelectOptions" />
            <label class="jn-label" for="tt-pr">Проект</label>
            <JnCrtSelect
              id="tt-pr"
              v-model="taskForm.projectId"
              :options="taskProjectSelectOptions"
              :disabled="!taskProjectSelectOptions.length"
            />
            <label class="jn-label" for="tt-event-at">Дата и время события</label>
            <input
              id="tt-event-at"
              v-model="taskForm.eventAtLocal"
              type="text"
              inputmode="numeric"
              placeholder="dd/mm/yyyy hh:mm"
              pattern="\\d{2}/\\d{2}/\\d{4}\\s\\d{2}:\\d{2}"
              class="jn-input"
              @input="onEventAtInput"
            />
            <label class="jn-label" for="tt-reminder-min">Напомнить за (минут)</label>
            <input
              id="tt-reminder-min"
              v-model.number="taskForm.reminderMinutesBefore"
              type="number"
              min="0"
              max="20160"
              step="1"
              class="jn-input"
            />
            <div class="tasks-reminder-permission-row">
              <span class="tasks-reminder-permission-status">
                {{
                  reminderPermission === 'granted'
                    ? 'Браузерные уведомления: разрешены'
                    : reminderPermission === 'denied'
                      ? 'Браузерные уведомления: запрещены'
                      : reminderPermission === 'default'
                        ? 'Браузерные уведомления: не запрошены'
                        : 'Браузерные уведомления не поддерживаются'
                }}
              </span>
              <button
                v-if="reminderPermission !== 'unsupported' && reminderPermission !== 'granted'"
                type="button"
                class="journal-nav-btn"
                @click="requestReminderPermission"
              >
                Разрешить уведомления
              </button>
            </div>
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

    <Teleport to="body">
      <Transition name="jn-modal">
        <div
          v-if="deleteTarget"
          class="jn-modal-overlay"
          role="dialog"
          aria-modal="true"
          @click.self="deleteTarget = null"
        >
          <div class="jn-modal jn-modal--compact" @click.stop>
            <h2 class="jn-modal-heading">Удалить «{{ deleteTarget.label }}»?</h2>
            <p v-if="deleteTarget.kind === 'client'" class="tasks-delete-warn">
              Будут удалены все проекты и задачи этого клиента.
            </p>
            <p v-else-if="deleteTarget.kind === 'project'" class="tasks-delete-warn">Будут удалены все задачи проекта.</p>
            <div class="jn-modal-actions">
              <button type="button" class="journal-nav-btn" @click="deleteTarget = null">Отмена</button>
              <button type="button" class="journal-nav-action" @click="confirmDelete">Удалить</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tasks-page-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.tasks-page-shell {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.75rem 1rem;
  max-width: min(1680px, 100%);
  width: 100%;
  margin: 0 auto;
  min-height: 0;
  flex: 1 1 auto;
}

.tasks-ai-chat-sidebar {
  flex: 0 0 min(320px, 26vw);
  min-width: 240px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tasks-ai-chat-fab {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem));
  z-index: 15000;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  background: rgba(211, 35, 75, 0.2);
  color: var(--color-accent-hover);
  font-size: 1.15rem;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}

.tasks-ai-chat-fab:hover {
  background: rgba(211, 35, 75, 0.35);
}

.tasks-ai-chat-mobile-overlay {
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

.tasks-ai-chat-mobile-sheet {
  width: 100%;
  max-height: min(88vh, 640px);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.5);
}

.tasks-ai-chat-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tasks-ai-chat-mobile-title {
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.tasks-ai-chat-mobile-sheet :deep(.tasks-ai-chat) {
  max-height: none;
  border: none;
  border-radius: 0;
  flex: 1;
  min-height: min(60vh, 420px);
}

.tasks-ai-chat-mobile-sheet :deep(.tasks-ai-chat-head) {
  display: none;
}

.tasks-sidebar {
  flex: 0 1 min(340px, 38vw);
  min-width: min(280px, 100%);
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.28);
  max-height: calc(100vh - 8rem);
  overflow-x: hidden;
  overflow-y: auto;
}

.tasks-sidebar-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tasks-sidebar-toolbar-btn {
  width: 100%;
}

.tasks-sidebar-btn-subtle {
  margin: 0;
  padding: 0.32rem 0.45rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.3;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tasks-sidebar-btn-subtle:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.tasks-sidebar-btn-subtle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tasks-hierarchy {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.tasks-hierarchy-tail {
  flex-shrink: 0;
  min-height: 2.25rem;
  margin-top: -0.15rem;
}

.tasks-client-block {
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--color-border);
  transition:
    transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.22s ease,
    opacity 0.22s ease;
}

.tasks-client-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.tasks-client-row {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

.tasks-dnd-grip {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  align-self: stretch;
  padding: 0.15rem 0.2rem 0 0;
  margin: 0;
  color: var(--color-text-tertiary);
  cursor: grab;
  user-select: none;
  transition: color 0.2s ease, transform 0.2s ease;
}

.tasks-dnd-grip:hover {
  color: var(--color-accent-hover);
}

.tasks-dnd-grip:active {
  cursor: grabbing;
}

.tasks-dnd-grip--nested {
  padding-top: 0.25rem;
}

.tasks-dnd-line {
  height: 4px;
  margin: 0.15rem 0 0.5rem;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(229, 57, 53, 0.55) 15%, #e53935 50%, rgba(229, 57, 53, 0.55) 85%, transparent 100%);
  box-shadow:
    0 0 12px rgba(229, 57, 53, 0.45),
    0 0 2px rgba(255, 255, 255, 0.25);
  animation: tasks-dnd-line-pulse 0.9s ease-in-out infinite;
  pointer-events: none;
}

.tasks-dnd-line--nested {
  margin: 0 0 0.5rem;
  height: 3px;
}

.tasks-dnd-line-slot {
  list-style: none;
  margin: 0;
  padding: 0;
  display: block;
  min-height: 0;
}

@keyframes tasks-dnd-line-pulse {
  0%,
  100% {
    opacity: 0.85;
    transform: scaleY(1);
  }
  50% {
    opacity: 1;
    transform: scaleY(1.15);
  }
}

.tasks-client-block--dragging {
  opacity: 0.72;
  transform: scale(0.985);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
  border-radius: 2px;
  outline: 1px dashed rgba(229, 57, 53, 0.55);
  outline-offset: 2px;
}

.tasks-project-item--dragging {
  opacity: 0.72;
  transform: scale(0.985);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  outline: 1px dashed rgba(229, 57, 53, 0.45);
  outline-offset: 1px;
}

.tasks-client-select {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 0.4rem 0.5rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  line-height: 1.35;
  color: var(--color-text);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.tasks-client-select:hover {
  border-color: var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.tasks-client-select--static {
  cursor: default;
}

.tasks-client-select--static:hover {
  border-color: var(--color-border);
  background: var(--color-bg-secondary);
}

.tasks-client-select--static.tasks-client-select--project-active:hover {
  border-color: rgba(229, 57, 53, 0.55);
  background: rgba(229, 57, 53, 0.14);
  box-shadow: inset 2px 0 0 0 #e53935, 0 0 10px rgba(229, 57, 53, 0.28);
}

.tasks-client-select--project-active {
  background: rgba(229, 57, 53, 0.12);
  box-shadow: inset 2px 0 0 0 #e53935, 0 0 10px rgba(229, 57, 53, 0.28);
  color: #ffcdd2;
}

.tasks-item-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  gap: 0.2rem;
  align-items: flex-start;
  padding-top: 0.1rem;
}

.tasks-item-actions .tasks-icon-btn {
  width: 1.6rem;
  height: 1.6rem;
  font-size: 0.82rem;
}

.tasks-project-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 0.65rem;
  border-left: 2px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.tasks-project-drop-target {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: stretch;
  gap: 0.3rem;
}

.tasks-project-item {
  margin: 0;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.tasks-project-row {
  display: flex;
  align-items: stretch;
  gap: 0.3rem;
}

.tasks-project-btn {
  flex: 1 1 auto;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.35;
  letter-spacing: 0.06em;
}

.tasks-project-empty {
  margin: 0.15rem 0 0 0.65rem;
  padding: 0;
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.tasks-hint {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.tasks-hint--muted {
  opacity: 0.85;
  padding: 0.25rem 0;
}

.tasks-icon-btn {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 1.75rem;
  height: 1.75rem;
  cursor: pointer;
  border-radius: 2px;
  transition: var(--transition, all 0.2s ease);
}

.tasks-icon-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
}

.tasks-icon-btn--accent {
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
}

.tasks-icon-btn--accent:hover:not(:disabled) {
  color: var(--color-accent-hover);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.tasks-icon-btn--in-progress {
  color: #e53935;
  border-color: rgba(229, 57, 53, 0.65);
  background: rgba(229, 57, 53, 0.12);
  cursor: pointer;
  opacity: 1;
}

.tasks-icon-btn--accent.tasks-icon-btn--in-progress:hover {
  color: #c62828;
  border-color: rgba(229, 57, 53, 0.85);
  background: rgba(229, 57, 53, 0.18);
}

.tasks-icon-btn--danger:hover {
  color: var(--color-accent-hover);
  border-color: var(--color-accent);
}

.tasks-panel {
  display: flex;
  flex-direction: column;
  min-height: 280px;
}

.tasks-panel--mobile-fill {
  flex: 1 1 auto;
  min-height: min(72vh, calc(100vh - 10rem));
  max-height: calc(100vh - 9rem);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.tasks-panel--mobile-fill .tasks-placeholder,
.tasks-panel--mobile-fill .tasks-global-err,
.tasks-panel--mobile-fill .tasks-loading {
  flex-shrink: 0;
}

.tasks-panel-head {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
}

.tasks-panel-head-center {
  flex: 1;
  min-width: 0;
}

.tasks-mobile-back {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  min-width: 3rem;
  padding: 0 0.85rem;
  margin: 0;
  font-family: inherit;
  font-size: 1.06rem;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  touch-action: manipulation;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.tasks-mobile-back:hover {
  border-color: var(--color-accent);
  color: var(--color-accent-hover);
}

.tasks-panel-title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.tasks-panel-add {
  width: auto;
  padding: 0.35rem 0.65rem;
}

.tasks-placeholder {
  padding: 1.5rem;
  font-size: 0.9rem;
  color: var(--color-text-tertiary);
  text-align: center;
}

.tasks-global-err {
  margin: 0.5rem 0.85rem;
  font-size: 0.86rem;
  color: var(--color-accent-hover);
}

.tasks-loading {
  margin: 0.35rem 0.85rem;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.tasks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.tasks-table th,
.tasks-table td {
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
}

.tasks-table th {
  color: var(--color-text-tertiary);
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.tasks-title {
  color: var(--color-text);
  font-weight: 500;
}

.tasks-desc {
  margin-top: 0.25rem;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  white-space: pre-wrap;
}

.tasks-event-meta {
  margin-top: 0.35rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  color: var(--color-text-tertiary);
}

.tasks-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
}

.tasks-badge--p1 {
  border-color: var(--color-accent);
  color: var(--color-accent-hover);
}
.tasks-badge--p2 {
  color: var(--color-text);
}
.tasks-badge--p3 {
  color: var(--color-text-secondary);
}
.tasks-badge--p4 {
  color: var(--color-text-tertiary);
}

.tasks-reorder {
  white-space: nowrap;
}

.tasks-status-cell {
  position: relative;
}

.tasks-status-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.tasks-status-trigger:hover:not(:disabled) {
  border-color: var(--color-border-light);
}

.tasks-status-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tasks-status-menu {
  position: absolute;
  top: calc(100% - 0.1rem);
  left: 0;
  z-index: 25;
  min-width: 10.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.25rem;
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  background: var(--color-bg-secondary);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}

.tasks-status-menu-item {
  width: 100%;
  margin: 0;
  padding: 0.35rem 0.45rem;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-secondary);
  text-align: left;
  font-family: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.tasks-status-menu-item:hover {
  border-color: var(--color-border);
  color: var(--color-text);
  background: var(--color-bg-tertiary);
}

.tasks-status-menu-item--active {
  color: var(--color-accent-hover);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.tasks-reorder-btn {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  margin-right: 0.2rem;
  border-radius: 2px;
}

.tasks-reorder-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.tasks-row-actions {
  white-space: nowrap;
}

@media (max-width: 639px) {
  .tasks-table thead {
    display: none;
  }

  .tasks-table tbody {
    display: block;
  }

  .tasks-table tr {
    display: block;
    margin-bottom: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 2px;
    padding: 0.5rem 0.65rem 0.65rem;
    background: rgba(0, 0, 0, 0.22);
  }

  .tasks-table td {
    display: block;
    border: none;
    padding: 0.4rem 0;
    text-align: left;
    vertical-align: top;
  }

  .tasks-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 0.88rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    margin-bottom: 0.35rem;
  }

  .tasks-table .tasks-row-actions {
    padding-top: 0.5rem;
    margin-top: 0.25rem;
    border-top: 1px solid var(--color-border);
    white-space: normal;
  }

  .tasks-reorder {
    white-space: normal;
  }

  .tasks-reorder-btn {
    min-width: 3rem;
    min-height: 3rem;
    padding: 0.45rem 0.65rem;
  }

  .tasks-table .tasks-icon-btn {
    width: 3rem;
    height: 3rem;
    font-size: 1.06rem;
  }

  .tasks-panel-head {
    flex-wrap: wrap;
    align-items: center;
  }

  .tasks-panel-head-center {
    flex: 1 1 12rem;
    min-width: 0;
  }

  .tasks-panel-add {
    width: auto;
    min-height: 2.75rem;
  }
}

.tasks-delete-warn {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem;
}

@media (max-width: 1023px) {
  .tasks-page-shell {
    flex-direction: column;
  }

  .tasks-sidebar {
    flex: 1 1 auto;
    max-width: none;
    width: 100%;
    max-height: none;
    min-height: min(65vh, calc(100vh - 11rem));
    padding: 0.65rem 0.85rem 0.85rem;
    border-width: 2px;
  }

  .tasks-dnd-grip {
    display: none;
  }

  .tasks-hint,
  .tasks-hint--muted {
    font-size: 1.02rem;
    line-height: 1.45;
  }

  .tasks-project-empty {
    font-size: 0.97rem;
  }

  .tasks-sidebar-btn-subtle {
    font-size: 1.06rem;
    padding: 0.75rem 1rem;
    min-height: 3rem;
    border-width: 2px;
    letter-spacing: 0.06em;
  }

  .tasks-client-select {
    font-size: 1.06rem;
    padding: 0.75rem 0.9rem;
    min-height: 3rem;
    border-width: 2px;
    letter-spacing: 0.05em;
  }

  .tasks-project-btn {
    font-size: 1.06rem !important;
    min-height: 3rem;
    padding: 0.65rem 0.85rem !important;
    letter-spacing: 0.05em !important;
    border-width: 2px !important;
  }

  .tasks-item-actions .tasks-icon-btn {
    width: 3rem;
    height: 3rem;
    font-size: 1rem;
    border-width: 2px;
  }

  .tasks-icon-btn {
    width: 3rem;
    height: 3rem;
    font-size: 1rem;
    border-width: 2px;
  }

  .tasks-panel-title {
    font-size: 1rem;
    line-height: 1.4;
    letter-spacing: 0.06em;
  }

  .tasks-panel-add {
    min-height: 3rem;
    padding: 0.55rem 1rem;
    font-size: 0.97rem;
    touch-action: manipulation;
  }

  .tasks-placeholder {
    font-size: 1.05rem;
    line-height: 1.5;
    padding: 1.5rem 1.15rem;
  }

  .tasks-table {
    font-size: 1.06rem;
  }

  .tasks-table th {
    font-size: 0.92rem;
    padding: 0.65rem 0.75rem;
  }

  .tasks-table td {
    padding: 0.65rem 0.75rem;
  }

  .tasks-title {
    font-size: 1.02rem;
    line-height: 1.4;
  }

  .tasks-desc {
    font-size: 1.02rem;
    line-height: 1.45;
  }

  .tasks-badge {
    font-size: 0.95rem;
    padding: 0.25rem 0.5rem;
  }

  .tasks-global-err,
  .tasks-loading {
    font-size: 1.02rem;
  }

  .tasks-page-main.content-wrapper {
    padding: 0.75rem 0 1rem;
  }

  .tasks-page-main .content-inner {
    padding-left: 0.65rem;
    padding-right: 0.65rem;
  }
}
</style>

<style>
/* Модалки — как в блокноте */
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

.jn-modal--compact {
  max-width: 380px;
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

.tasks-reminder-permission-row {
  margin: 0 0 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.tasks-reminder-permission-status {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.jn-modal-enter-active,
.jn-modal-leave-active {
  transition: opacity 0.2s ease;
}

.jn-modal-enter-from,
.jn-modal-leave-to {
  opacity: 0;
}

:root {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-border: #2a2a2a;
  --color-border-light: #3a3a3a;
  --color-accent: #d3234b;
  --color-accent-hover: #e6395f;
  --color-accent-light: rgba(211, 35, 75, 0.1);
  --color-accent-medium: rgba(211, 35, 75, 0.2);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  background: var(--color-bg);
  letter-spacing: 0.03em;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 100;
  padding: 2rem 0;
}

.content-inner {
  width: 100%;
  max-width: min(1680px, 100%);
  padding: 0 1.5rem;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}

.journal-nav-toolbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
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
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.25;
}

.journal-nav-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.journal-nav-btn--active {
  color: var(--color-text);
  border-color: var(--color-border-light);
  background: var(--color-accent-light);
  box-shadow: inset 2px 0 0 0 var(--color-accent), 0 0 12px var(--color-accent-medium);
}

.jn-modal-actions .journal-nav-btn,
.jn-modal-actions .journal-nav-action {
  width: auto;
}

.journal-panel {
  flex: 1;
  min-width: 0;
  position: relative;
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(20, 20, 20, 0.6) 100%);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

/*
 * Класс `tasks-page-html-mobile` вешается на documentElement при viewport ≤1023px
 * только на странице задач — крупнее базовый rem, модалки на всю ширину, поля ≥16px (iOS).
 */
html.tasks-page-html-mobile {
  font-size: 125%;
  -webkit-text-size-adjust: 100%;
}

html.tasks-page-html-mobile .jn-modal-overlay {
  align-items: center;
  justify-content: center;
  padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right))
    max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
  box-sizing: border-box;
}

html.tasks-page-html-mobile .jn-modal {
  width: min(100%, calc(100vw - 1.5rem));
  max-width: 26rem;
  padding: 1.5rem 1.35rem 1.65rem;
  border-radius: 0.65rem;
  border-width: 2px;
}

html.tasks-page-html-mobile .jn-modal--wide {
  max-width: min(34rem, calc(100vw - 1.5rem));
}

html.tasks-page-html-mobile .jn-modal--compact {
  max-width: min(24rem, calc(100vw - 1.5rem));
}

html.tasks-page-html-mobile .jn-modal-heading {
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  line-height: 1.35;
}

html.tasks-page-html-mobile .jn-label {
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  margin-bottom: 0.45rem;
}

html.tasks-page-html-mobile .jn-input,
html.tasks-page-html-mobile .jn-textarea {
  font-size: 16px;
  padding: 0.75rem 0.9rem;
  border-width: 2px;
  min-height: 3rem;
}

html.tasks-page-html-mobile .jn-textarea {
  min-height: 7.5rem;
}

html.tasks-page-html-mobile .jn-modal-error {
  font-size: 0.88rem;
}

html.tasks-page-html-mobile .jn-modal-actions {
  flex-direction: column-reverse;
  gap: 0.65rem;
  margin-top: 0.65rem;
}

html.tasks-page-html-mobile .jn-modal-actions .journal-nav-btn,
html.tasks-page-html-mobile .jn-modal-actions .journal-nav-action {
  width: 100%;
  min-height: 3rem;
  justify-content: center;
  font-size: 1.06rem;
  padding: 0.65rem 1rem;
}

html.tasks-page-html-mobile .jn-crt-select__trigger.jn-input {
  min-height: 3rem;
  font-size: 16px;
}

html.tasks-page-html-mobile .header-action-btn {
  width: 2.85rem;
  height: 2.85rem;
  font-size: 1.05rem;
}

html.tasks-page-html-mobile .header-title {
  font-size: 1.05rem;
}

html.tasks-page-html-mobile .header-clock {
  font-size: 0.88rem;
  padding: 0.35rem 0.65rem;
}

.tasks-panel-head-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.tasks-panel-head-actions .journal-nav-action {
  width: auto;
  padding: 0.5rem 0.85rem;
  font-size: 0.86rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}

.tasks-panel-toggle {
  width: auto;
  padding: 0.5rem 0.85rem;
}

@media (max-width: 640px) {
  .tasks-panel-head-actions {
    width: 100%;
  }
  
  .tasks-panel-head-actions .journal-nav-action {
    flex: 1;
    justify-content: center;
  }
}
</style>