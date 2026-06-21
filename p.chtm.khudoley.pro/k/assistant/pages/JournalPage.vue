<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import JournalNotebookPane from '../components/journal/JournalNotebookPane.vue'
import JournalInboxPane from '../components/journal/JournalInboxPane.vue'
import JournalMonthPane from '../components/journal/JournalMonthPane.vue'
import JournalWeekPane from '../components/journal/JournalWeekPane.vue'
import JournalDayPane from '../components/journal/JournalDayPane.vue'
import JournalHabitsPane from '../components/journal/JournalHabitsPane.vue'
import JournalDayInDevelopmentPane from '../components/journal/JournalDayInDevelopmentPane.vue'
import type { TasksTreeDto } from '../lib/tasks-types'
import type { JournalHabitsWeekDto } from '../lib/journal-habits-time'
import JournalNav from '../components/journal/JournalNav.vue'
import { subscribeBootStaticReady, scheduleHideBootLoader } from '../shared/bootUi'
import { createComponentLogger } from '../shared/logger'
import { DEFAULT_USER_TIMEZONE_OFFSET_HOURS } from '../shared/user-settings-defaults'

/** Отдельный alias — union внутри `interface JournalPageProps` даёт parse error в части пайплайнов Vue. */
type JournalHabitsInitialProp = JournalHabitsWeekDto | null

const log = createComponentLogger('JournalPage')

declare global {
  interface Window {
    hideAppLoader?: () => void
  }
}

type JournalTabId = 'notebook' | 'month' | 'week' | 'tasks' | 'day' | 'habits' | 'inbox'

/** Явная карта компонентов вкладок (без Record с угловыми скобками в типе — см. комментарий к defineProps ниже). */
type JournalTabComponentMap = {
  notebook: object
  inbox: object
  month: object
  week: object
  tasks: object
  day: object
  habits: object
}

const TAB_QUERY_KEY = 'tab'

const JOURNAL_TAB_IDS: JournalTabId[] = ['inbox', 'notebook', 'tasks', 'day', 'week', 'month', 'habits']

function parseTabFromSearch(search: string): JournalTabId | null {
  const q = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(q)
  const raw = params.get(TAB_QUERY_KEY)
  if (!raw) return null
  return JOURNAL_TAB_IDS.includes(raw as JournalTabId) ? (raw as JournalTabId) : null
}

function applyTabToUrl(tab: JournalTabId) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (tab === 'inbox') {
    url.searchParams.delete(TAB_QUERY_KEY)
  } else {
    url.searchParams.set(TAB_QUERY_KEY, tab)
  }
  const next = url.pathname + url.search + url.hash
  const cur = window.location.pathname + window.location.search + window.location.hash
  if (next !== cur) {
    history.replaceState(null, '', next)
  }
}

type JournalNoteSummary = {
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

type NotebookFolderDto = { id: string; name: string; color: string; sortOrder: number; isArchived: boolean }
type NotebookCategoryDto = { id: string; name: string; color: string; sortOrder: number }

/** Сводка инбокса с сервера (отдельная Heap-таблица `inbox-notes`) */
type InboxNoteSummaryDto = {
  id: string
  title: string
  isArchived: boolean
  sortOrder: number
}

function mapInboxToJournalSummary(n: InboxNoteSummaryDto): JournalNoteSummary {
  return {
    id: n.id,
    title: n.title,
    folderId: null,
    categoryIds: [],
    linkedTaskId: null,
    linkedProjectId: null,
    linkedClientId: null,
    noteDate: null,
    isArchived: n.isArchived,
    sortOrder: n.sortOrder
  }
}

interface JournalPageProps {
  projectTitle: string
  indexUrl: string
  profileUrl: string
  testsUrl?: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  journalNotesInitial?: JournalNoteSummary[]
  notebookFoldersInitial?: NotebookFolderDto[]
  notebookCategoriesInitial?: NotebookCategoryDto[]
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
  journalDayGetUrl?: string
  journalDaySaveUrl?: string
  journalDayEntryInitial?: unknown
  journalWeekGetUrl?: string
  journalWeekSaveUrl?: string
  journalWeekSaveSummaryUrl?: string
  journalWeekEntryInitial?: unknown
  tasksTreeInitial?: TasksTreeDto
  tasksTreeGetUrl?: string
  taskItemReorderDayUrl?: string
  taskReleaseDayUrl?: string
  taskItemUpdateUrl?: string
  tasksPageUrl?: string
  toolsControlUrl?: string
  toolsStateUrl?: string
  encodedFocusToolsSocketId?: string
  journalMonthDataUrl?: string
  journalTabInitial?: JournalTabId
  inboxNotesInitial?: InboxNoteSummaryDto[]
  inboxNotesCreateUrl?: string
  inboxNotesGetUrl?: string
  inboxNotesUpdateUrl?: string
  inboxNotesArchiveUrl?: string
  inboxNotesDeleteUrl?: string
  inboxNotesListUrl?: string
  journalHabitsGetUrl?: string
  journalHabitsSaveUrl?: string
  journalHabitsInitial?: JournalHabitsInitialProp
  timezoneOffsetHours?: number
}

/* Не использовать defineProps с дженериком и ref с дженериком: при ts+jsx символ «меньше» в коде читается как JSX. */
const props = defineProps({
  projectTitle: { type: String, required: true },
  indexUrl: { type: String, required: true },
  profileUrl: { type: String, required: true },
  testsUrl: String,
  loginUrl: { type: String, required: true },
  isAuthenticated: { type: Boolean, required: true },
  isAdmin: Boolean,
  adminUrl: String,
  journalNotesInitial: Array,
  notebookFoldersInitial: Array,
  notebookCategoriesInitial: Array,
  journalNotesCreateUrl: String,
  journalNotesGetUrl: String,
  journalNotesUpdateUrl: String,
  journalNotesDeleteUrl: String,
  journalNotesListUrl: String,
  journalNotesReorderUrl: String,
  journalNotesArchiveUrl: String,
  journalNotesMoveUrl: String,
  journalNotesBulkUrl: String,
  notebookFoldersCreateUrl: String,
  notebookFoldersUpdateUrl: String,
  notebookFoldersDeleteUrl: String,
  notebookFoldersReorderUrl: String,
  notebookFoldersArchiveUrl: String,
  notebookCategoriesListUrl: String,
  notebookCategoriesCreateUrl: String,
  notebookCategoriesUpdateUrl: String,
  notebookCategoriesDeleteUrl: String,
  journalDayGetUrl: String,
  journalDaySaveUrl: String,
  journalDayEntryInitial: Object,
  journalWeekGetUrl: String,
  journalWeekSaveUrl: String,
  journalWeekSaveSummaryUrl: String,
  journalWeekEntryInitial: Object,
  tasksTreeInitial: Object,
  tasksTreeGetUrl: String,
  taskItemReorderDayUrl: String,
  taskReleaseDayUrl: String,
  taskItemUpdateUrl: String,
  tasksPageUrl: String,
  toolsControlUrl: String,
  toolsStateUrl: String,
  encodedFocusToolsSocketId: String,
  journalMonthDataUrl: String,
  journalTabInitial: String,
  inboxNotesInitial: Array,
  inboxNotesCreateUrl: String,
  inboxNotesGetUrl: String,
  inboxNotesUpdateUrl: String,
  inboxNotesArchiveUrl: String,
  inboxNotesDeleteUrl: String,
  inboxNotesListUrl: String,
  journalHabitsGetUrl: String,
  journalHabitsSaveUrl: String,
  journalHabitsInitial: Object,
  timezoneOffsetHours: { type: Number, default: DEFAULT_USER_TIMEZONE_OFFSET_HOURS },
}) as unknown as JournalPageProps

const bootLoaderDone = ref(false)

const tabComponents: JournalTabComponentMap = {
  notebook: JournalNotebookPane,
  inbox: JournalInboxPane,
  month: JournalMonthPane,
  week: JournalWeekPane,
  tasks: JournalDayPane,
  day: JournalDayInDevelopmentPane,
  habits: JournalHabitsPane,
}

const tabs: { id: JournalTabId; label: string }[] = [
  { id: 'inbox', label: 'Инбокс' },
  { id: 'notebook', label: 'Блокнот' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'habits', label: 'Привычки' },
]

function resolveInitialTab(): JournalTabId {
  if (typeof window !== 'undefined') {
    const fromUrl = parseTabFromSearch(window.location.search)
    if (fromUrl) return fromUrl
  }
  return props.journalTabInitial != null ? props.journalTabInitial : 'inbox'
}

const activeTab = ref(resolveInitialTab())

const journalNotes = ref([...(props.journalNotesInitial != null ? props.journalNotesInitial : [])])
const inboxNotes = ref(
  (props.inboxNotesInitial != null ? props.inboxNotesInitial : []).map(mapInboxToJournalSummary),
)
const notebookFolders = ref([...(props.notebookFoldersInitial != null ? props.notebookFoldersInitial : [])])
const notebookCategories = ref([
  ...(props.notebookCategoriesInitial != null ? props.notebookCategoriesInitial : []),
])

watch(
  () => props.journalNotesInitial,
  (next) => { journalNotes.value = [...(next != null ? next : [])] }
)

watch(
  () => props.inboxNotesInitial,
  (next) => { inboxNotes.value = (next != null ? next : []).map(mapInboxToJournalSummary) }
)

watch(
  () => props.notebookFoldersInitial,
  (next) => { notebookFolders.value = [...(next != null ? next : [])] }
)

watch(
  () => props.notebookCategoriesInitial,
  (next) => { notebookCategories.value = [...(next != null ? next : [])] }
)

const showTasksNavToolbar = computed(() => {
  return (
    activeTab.value === 'tasks' &&
    Boolean(props.tasksPageUrl != null && props.tasksPageUrl.trim() !== '')
  )
})

function onNotebookNoteCreated() {
  if (activeTab.value === 'inbox') void reloadInboxData()
  else void reloadNotebookData()
}

function onNotebookNoteUpdated() {
  if (activeTab.value === 'inbox') void reloadInboxData()
  else void reloadNotebookData()
}

function onNotebookNoteDeleted(id: string) {
  if (activeTab.value === 'inbox') {
    inboxNotes.value = inboxNotes.value.filter((x) => x.id !== id)
  } else {
    journalNotes.value = journalNotes.value.filter((x) => x.id !== id)
  }
}

function onFoldersChanged() {
  reloadNotebookData()
}

function onCategoriesChanged() {
  reloadNotebookData()
}

async function reloadNotebookData() {
  if (!props.journalNotesListUrl) return
  try {
    const url = `${props.journalNotesListUrl}?includeArchived=true`
    const res = await fetch(url, { method: 'GET', credentials: 'include' })
    const data = await res.json() as {
      success?: boolean
      notes?: JournalNoteSummary[]
      folders?: NotebookFolderDto[]
      categories?: NotebookCategoryDto[]
    }
    if (data.success) {
      if (data.notes) journalNotes.value = data.notes
      if (data.folders) notebookFolders.value = data.folders
      if (data.categories) notebookCategories.value = data.categories
    }
  } catch (e) {
    log.error('Обновление данных блокнота', { error: String(e) })
  }
}

async function reloadInboxData() {
  if (!props.inboxNotesListUrl) return
  try {
    const url = `${props.inboxNotesListUrl}?includeArchived=true`
    const res = await fetch(url, { method: 'GET', credentials: 'include' })
    const data = await res.json() as {
      success?: boolean
      notes?: InboxNoteSummaryDto[]
    }
    if (data.success && data.notes) {
      inboxNotes.value = data.notes.map(mapInboxToJournalSummary)
    }
  } catch (e) {
    log.error('Обновление данных инбокса', { error: String(e) })
  }
}

const currentPane = computed(() => tabComponents[activeTab.value])

const tasksTree = computed(() =>
  props.tasksTreeInitial != null ? props.tasksTreeInitial : { clients: [], projects: [], tasks: [] },
)

const notebookPaneProps = computed(() => ({
  notes: journalNotes.value,
  folders: notebookFolders.value,
  categories: notebookCategories.value,
  isAuthenticated: props.isAuthenticated,
  taskClients: tasksTree.value.clients.map((c) => ({ id: c.id, name: c.name })),
  taskProjects: tasksTree.value.projects.map((p) => ({ id: p.id, clientId: p.clientId, name: p.name })),
  taskItems: tasksTree.value.tasks.map((t) => ({ id: t.id, projectId: t.projectId, title: t.title })),
  journalNotesCreateUrl: props.journalNotesCreateUrl,
  journalNotesGetUrl: props.journalNotesGetUrl,
  journalNotesUpdateUrl: props.journalNotesUpdateUrl,
  journalNotesDeleteUrl: props.journalNotesDeleteUrl,
  journalNotesListUrl: props.journalNotesListUrl,
  journalNotesReorderUrl: props.journalNotesReorderUrl,
  journalNotesArchiveUrl: props.journalNotesArchiveUrl,
  journalNotesMoveUrl: props.journalNotesMoveUrl,
  journalNotesBulkUrl: props.journalNotesBulkUrl,
  notebookFoldersCreateUrl: props.notebookFoldersCreateUrl,
  notebookFoldersUpdateUrl: props.notebookFoldersUpdateUrl,
  notebookFoldersDeleteUrl: props.notebookFoldersDeleteUrl,
  notebookFoldersReorderUrl: props.notebookFoldersReorderUrl,
  notebookFoldersArchiveUrl: props.notebookFoldersArchiveUrl,
  notebookCategoriesListUrl: props.notebookCategoriesListUrl,
  notebookCategoriesCreateUrl: props.notebookCategoriesCreateUrl,
  notebookCategoriesUpdateUrl: props.notebookCategoriesUpdateUrl,
  notebookCategoriesDeleteUrl: props.notebookCategoriesDeleteUrl,
}))

const inboxPaneProps = computed(() => ({
  notes: inboxNotes.value,
  isAuthenticated: props.isAuthenticated,
  inboxNotesCreateUrl: props.inboxNotesCreateUrl,
  inboxNotesGetUrl: props.inboxNotesGetUrl,
  inboxNotesUpdateUrl: props.inboxNotesUpdateUrl,
  inboxNotesArchiveUrl: props.inboxNotesArchiveUrl,
  inboxNotesDeleteUrl: props.inboxNotesDeleteUrl,
}))

const tasksPaneProps = computed(() => ({
  isAuthenticated: props.isAuthenticated,
  tasksTreeInitial:
    props.tasksTreeInitial != null ? props.tasksTreeInitial : { clients: [], projects: [], tasks: [] },
  tasksTreeGetUrl: props.tasksTreeGetUrl != null ? props.tasksTreeGetUrl : '',
  taskItemReorderDayUrl: props.taskItemReorderDayUrl != null ? props.taskItemReorderDayUrl : '',
  taskReleaseDayUrl: props.taskReleaseDayUrl != null ? props.taskReleaseDayUrl : '',
  taskItemUpdateUrl: props.taskItemUpdateUrl != null ? props.taskItemUpdateUrl : '',
  tasksPageUrl: props.tasksPageUrl != null ? props.tasksPageUrl : '',
  toolsControlUrl: props.toolsControlUrl != null ? props.toolsControlUrl : '',
  timezoneOffsetHours: props.timezoneOffsetHours,
}))

const dayInDevelopmentPaneProps = computed(() => ({
  isAuthenticated: props.isAuthenticated,
  journalDayGetUrl: props.journalDayGetUrl != null ? props.journalDayGetUrl : '',
  journalDaySaveUrl: props.journalDaySaveUrl != null ? props.journalDaySaveUrl : '',
  journalDayEntryInitial: props.journalDayEntryInitial != null ? props.journalDayEntryInitial : null,
}))

const panePropsForTab = computed(() => {
  if (activeTab.value === 'notebook') return notebookPaneProps.value
  if (activeTab.value === 'inbox') return inboxPaneProps.value
  if (activeTab.value === 'tasks') return tasksPaneProps.value
  if (activeTab.value === 'day') return dayInDevelopmentPaneProps.value
  if (activeTab.value === 'week') {
    return {
      isAuthenticated: props.isAuthenticated,
      journalWeekGetUrl: props.journalWeekGetUrl != null ? props.journalWeekGetUrl : '',
      journalWeekSaveUrl: props.journalWeekSaveUrl != null ? props.journalWeekSaveUrl : '',
      journalWeekSaveSummaryUrl:
        props.journalWeekSaveSummaryUrl != null ? props.journalWeekSaveSummaryUrl : '',
      journalWeekEntryInitial: props.journalWeekEntryInitial != null ? props.journalWeekEntryInitial : null,
    }
  }
  if (activeTab.value === 'month') {
    return {
      isAuthenticated: props.isAuthenticated,
      journalMonthDataUrl: props.journalMonthDataUrl != null ? props.journalMonthDataUrl : '',
      journalDayGetUrl: props.journalDayGetUrl != null ? props.journalDayGetUrl : '',
      journalDaySaveUrl: props.journalDaySaveUrl != null ? props.journalDaySaveUrl : '',
      journalWeekGetUrl: props.journalWeekGetUrl != null ? props.journalWeekGetUrl : '',
      journalWeekSaveUrl: props.journalWeekSaveUrl != null ? props.journalWeekSaveUrl : '',
    }
  }
  if (activeTab.value === 'habits') {
    return {
      isAuthenticated: props.isAuthenticated,
      journalHabitsGetUrl: props.journalHabitsGetUrl != null ? props.journalHabitsGetUrl : '',
      journalHabitsSaveUrl: props.journalHabitsSaveUrl != null ? props.journalHabitsSaveUrl : '',
      journalHabitsInitial: props.journalHabitsInitial != null ? props.journalHabitsInitial : null,
    }
  }
  return {}
})

const selectTab = (id: JournalTabId) => {
  if (activeTab.value === id) return
  log.info('Journal tab changed', { from: activeTab.value, to: id })
  activeTab.value = id
  applyTabToUrl(id)
}

function onSelectNavTab(tabId: string) {
  if (!JOURNAL_TAB_IDS.includes(tabId as JournalTabId)) return
  selectTab(tabId as JournalTabId)
}

function onOpenAllTasks() {
  const targetUrl = props.tasksPageUrl != null ? props.tasksPageUrl.trim() : ''
  if (!targetUrl) return
  window.location.assign(targetUrl)
}

function syncActiveTabFromLocation() {
  const fromUrl = parseTabFromSearch(window.location.search)
  const next = fromUrl != null ? fromUrl : 'inbox'
  if (activeTab.value !== next) {
    activeTab.value = next
  }
}

const startAfterBoot = () => {
  log.info('Boot loader complete, showing journal page')
  bootLoaderDone.value = true
  scheduleHideBootLoader()
}

let unsubBootStatic: (() => void) | null = null

onMounted(() => {
  log.info('Component mounted')
  syncActiveTabFromLocation()
  window.addEventListener('popstate', syncActiveTabFromLocation)
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }
  unsubBootStatic = subscribeBootStaticReady(startAfterBoot)
})

onUnmounted(() => {
  log.info('Component unmounted')
  if (unsubBootStatic != null) unsubBootStatic()
  window.removeEventListener('popstate', syncActiveTabFromLocation)
})

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
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

    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner journal-shell">
        <JournalNav
          :tabs="tabs"
          :activeTab="activeTab"
          :showNotebookToolbar="false"
          :showTasksToolbar="showTasksNavToolbar"
          :isAuthenticated="props.isAuthenticated"
          notebookCreateTitle=""
          notebookCreateError=""
          @select-tab="onSelectNavTab"
          @create-note="() => {}"
          @open-all-tasks="onOpenAllTasks"
        />

        <section class="journal-panel" aria-live="polite">
          <Transition name="journal-view" mode="out-in">
            <KeepAlive :max="8">
              <component
                :is="currentPane"
                :key="activeTab"
                v-bind="panePropsForTab"
                @note-created="onNotebookNoteCreated"
                @note-updated="onNotebookNoteUpdated"
                @note-deleted="onNotebookNoteDeleted"
                @folders-changed="onFoldersChanged"
                @categories-changed="onCategoriesChanged"
              />
            </KeepAlive>
          </Transition>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>

<style scoped>
.journal-shell {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.75rem 1rem;
  max-width: 1200px;
  min-height: 40vh;
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

.journal-view-enter-active,
.journal-view-leave-active {
  transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.journal-view-enter-from,
.journal-view-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .journal-shell {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

<style>
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
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
  max-width: 1200px;
  padding: 0 1.5rem;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}
</style>
