// @shared

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  status: 'inbox' | 'todo' | 'doing' | 'wait' | 'done'
  project: string
  client: string
  context: string
  pr: 'high' | 'med' | 'low'
  due: string
  start?: string
  end?: string
  desc: string
  checklist: ChecklistItem[]
  tags?: string[]
}

export interface Project {
  id: string
  name: string
  para: 'project' | 'area' | 'resource' | 'archive'
  area?: string
  client?: string
  deadline?: string
  desc?: string
  taskFilter?: string
}

export interface Ref {
  id: string
  name: string
  kind: 'area' | 'resource' | 'archive'
  desc?: string
  tags?: string[]
  items?: string[]
}

export interface TodayTask {
  id: string
  title: string
  proj: string
  done: boolean
  pr: 'high' | 'med' | 'low'
  time: string
}

export interface Habit {
  id: string
  name: string
  done: boolean
}
