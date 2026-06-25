// @shared
import type { Metric } from '../types/journal'
import type { WeekBar } from '../types/finance'

export const seedMetrics: Metric[] = [
  {
    l: 'Фокус',
    v: '4.2ч',
    dot: 'var(--ok)',
    trend: '↑ +0.8ч к среде',
    trendColor: 'var(--ok)',
    screen: 'tools'
  },
  {
    l: 'Задачи',
    v: '23',
    dot: 'var(--accent)',
    trend: '↑ +12% к прошлой нед',
    trendColor: 'var(--ok)',
    screen: 'tasks'
  },
  {
    l: 'Энергия',
    v: '7.4',
    dot: 'var(--warn)',
    trend: '↓ −0.3 к вчера',
    trendColor: 'var(--warn)',
    screen: 'journal',
    danger: false
  },
  {
    l: 'Flow-часы',
    v: '2.1ч',
    dot: 'var(--ok)',
    trend: '→ норма',
    trendColor: 'var(--fg3)',
    screen: 'tools'
  }
]

export const seedWeekBars: WeekBar[] = [
  { d: 'Пн', v: 60 },
  { d: 'Вт', v: 85 },
  { d: 'Ср', v: 45 },
  { d: 'Чт', v: 90 },
  { d: 'Пт', v: 70 },
  { d: 'Сб', v: 30 },
  { d: 'Вс', v: 20 }
]
