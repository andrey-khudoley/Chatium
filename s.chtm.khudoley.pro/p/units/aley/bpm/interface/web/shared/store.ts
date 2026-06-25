// @shared
import { reactive } from 'vue'
import type { Screen } from './types/ui'
import type { Task, Project, Ref, TodayTask, Habit } from './types/task'
import type { LibraryItem } from './types/library'
import type { Service, Thread, Message } from './types/social'

export interface AppStore {
  screen: Screen
  stubName: string
  navOpen: boolean
  density: 'comfy' | 'compact'
  accent: string
  taskView: 'board' | 'table' | 'timeline' | 'gtd'
  tableFilter: string
  tableSortKey: string
  tableSortDir: 'asc' | 'desc'
  tableGroup: string
  activeThread: string | null
  messages: Message[]
  composer: string
  detailType: string | null
  detailId: string | null
  editMode: boolean
  detailFrom: Screen | null
  tasks: Task[]
  lib: LibraryItem[]
  projs: Project[]
  refs: Ref[]
  todayTasks: TodayTask[]
  habits: Habit[]
  services: Service[]
  threads: Thread[]
  libFilter: string
  pomoSec: number
  pomoRunning: boolean
}

export const store = reactive<AppStore>({
  screen: 'home',
  stubName: '',
  navOpen: false,
  density: 'comfy',
  accent: '#F74E53',
  taskView: 'board',
  tableFilter: '',
  tableSortKey: 'title',
  tableSortDir: 'asc',
  tableGroup: 'status',
  activeThread: null,
  messages: [],
  composer: '',
  detailType: null,
  detailId: null,
  editMode: false,
  detailFrom: null,
  tasks: [],
  lib: [],
  projs: [],
  refs: [],
  todayTasks: [],
  habits: [],
  services: [],
  threads: [],
  libFilter: '',
  pomoSec: 0,
  pomoRunning: false
})

export function go(screen: Screen, stubName = ''): void {
  store.screen = screen
  store.stubName = stubName
  store.navOpen = false
}

export function openDetail(type: string, id: string): void {
  store.detailType = type
  store.detailId = id
  store.detailFrom = store.screen
  store.screen = 'detail'
}

export function closeDetail(): void {
  store.screen = store.detailFrom || 'home'
  store.detailType = null
  store.detailId = null
  store.detailFrom = null
}

export function ensureStores(
  seedTasks: Task[],
  seedLib: LibraryItem[],
  seedProjs: Project[],
  seedRefs: Ref[],
  seedTodayTasks: TodayTask[],
  seedHabits: Habit[],
  seedServices: Service[],
  seedThreads: Thread[]
): void {
  if (!store.tasks.length) store.tasks = [...seedTasks]
  if (!store.lib.length) store.lib = [...seedLib]
  if (!store.projs.length) store.projs = [...seedProjs]
  if (!store.refs.length) store.refs = [...seedRefs]
  if (!store.todayTasks.length) store.todayTasks = [...seedTodayTasks]
  if (!store.habits.length) store.habits = [...seedHabits]
  if (!store.services.length) store.services = [...seedServices]
  if (!store.threads.length) store.threads = [...seedThreads]
}
