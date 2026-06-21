// @shared
/** Типы пропсов/данных BPM Vue-компонентов; вынесены из SFC для корректного `tsc` с vue-shim. */

export interface NavChildItem {
  id: string
  label: string
  icon?: string
  badge?: string | number
  href?: string
}

export interface NavItem {
  id: string
  icon: string
  label: string
  badge?: string | number
  href?: string
  children?: NavChildItem[]
}

export interface CapacityRow {
  team: string
  load: number
  capacity: number
  focus: string
}

export interface ClientThreadFilter {
  id: string
  label: string
  count?: number
}

export interface CommandAction {
  id: string
  title: string
  description: string
  tone: 'neutral' | 'info' | 'warning' | 'danger' | 'success'
}

export interface DecisionNode {
  id: string
  condition: string
  action: string
  owner: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface MilestoneItem {
  id: string
  title: string
  date: string
  owner: string
  state: 'done' | 'active' | 'next' | 'risk'
}

export interface RoleStackItem {
  id: string
  name: string
  role: string
  state: 'online' | 'busy' | 'offline'
}

export interface SwimlaneItem {
  id: string
  title: string
  owner: string
  tag: string
  eta: string
}

export interface SwimlaneLane {
  id: string
  title: string
  tone: 'neutral' | 'info' | 'warning' | 'danger' | 'success'
  items: SwimlaneItem[]
}
