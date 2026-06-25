// @shared

export type Screen =
  | 'home'
  | 'journal'
  | 'tasks'
  | 'dialogs'
  | 'finances'
  | 'para'
  | 'tools'
  | 'services'
  | 'library'
  | 'detail'
  | 'components'
  | 'stub'

export interface NavItem {
  id: string
  label: string
  icon: string
  screen: Screen
  count?: number
  dot?: boolean
}

export type DetailType = 'task' | 'library' | 'project' | 'ref'
