// @shared
import type { Screen } from './ui'

export interface JournalEntry {
  id: string
  src: string
  txt: string
  time: string
}

export interface Metric {
  l: string
  v: string
  dot: string
  trend: string
  trendColor: string
  screen?: Screen
  danger?: boolean
}
