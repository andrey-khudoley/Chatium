// @shared
export type BpmTone = 'info' | 'success' | 'warning' | 'danger'

export interface BpmMetric {
  id: string
  label: string
  value: string
  delta: string
  tone: BpmTone
}

export type BpmRiskTone = 'warning' | 'danger' | 'info' | 'success' | 'neutral'

export interface BpmInstanceRow {
  id: string
  process: string
  stage: string
  status: string
  sla: string
  owner: string
  risk: BpmRiskTone
}

export interface BpmTimelinePoint {
  time: string
  label: string
}

export interface BpmKanbanCard {
  id: string
  title: string
  owner: string
  sla: string
}

export interface BpmKanbanColumn {
  id: string
  title: string
  tone: 'backlog' | 'active' | 'review' | 'done'
  cards: BpmKanbanCard[]
}

export interface BpmExecutionEvent {
  time: string
  type: BpmTone
  text: string
}

export interface BpmRule {
  name: string
  action: string
  state: 'active' | 'critical'
}

export interface BpmAutomationJob {
  id: string
  title: string
  state: 'running' | 'queued' | 'done'
}

export interface BpmChartBar {
  label: string
  value: number
}

export interface BpmChartMode {
  id: 'throughput' | 'sla' | 'bottlenecks'
  label: string
}

export interface BpmBottleneck {
  title: string
  value: string
  status: string
  tone: 'warning' | 'danger' | 'info' | 'success'
}

export interface BpmEditorMode {
  id: 'markdown' | 'wysiwyg' | 'split'
  label: string
}

export interface BpmMenuBadge {
  value: string | number
}
