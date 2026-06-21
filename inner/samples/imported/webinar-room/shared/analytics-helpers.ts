// @shared
// Общие хелперы для аналитики

// Метки событий плеера
export const EVENT_LABELS: Record<string, string> = {
  play: 'Play',
  playing: 'Playing',
  pause: 'Пауза',
  progress: 'Прогресс',
  ended: 'Завершено',
  seek: 'Перемотка',
  loaded: 'Загрузка',
  quality_changed: 'Качество',
  volume_change: 'Громкость',
  fullscreen_change: 'Полный экран',
  error: 'Ошибка',
  cta_click: 'CTA клик'
}

// Цвета событий плеера
export const EVENT_COLORS: Record<string, string> = {
  play: '#4ade80',
  playing: '#22c55e',
  pause: '#facc15',
  progress: '#60a5fa',
  ended: '#f8005b',
  seek: '#a78bfa',
  loaded: '#06b6d4',
  quality_changed: '#f59e0b',
  volume_change: '#8b5cf6',
  fullscreen_change: '#14b8a6',
  error: '#ef4444',
  cta_click: '#ec4899'
}

// Метки событий форм (CTA)
export const CTA_EVENT_LABELS: Record<string, string> = {
  shown: 'Показано',
  opened: 'Открыто',
  closed: 'Закрыто',
  field_focused: 'Фокус',
  submitted: 'Отправлено',
  payment_page_opened: 'Переход на оплату',
  payment_completed: 'Оплачено'
}

// Цвета событий форм (CTA)
export const CTA_EVENT_COLORS: Record<string, string> = {
  shown: '#06b6d4',
  opened: '#60a5fa',
  closed: '#9ca3af',
  field_focused: '#a78bfa',
  submitted: '#4ade80',
  payment_page_opened: '#facc15',
  payment_completed: '#f8005b'
}

// Функции для получения меток и цветов
export function eventLabel(type: string): string {
  return EVENT_LABELS[type] || type
}

export function eventColor(type: string): string {
  return EVENT_COLORS[type] || '#9ca3af'
}

export function ctaEventLabel(type: string): string {
  return CTA_EVENT_LABELS[type] || type
}

export function ctaEventColor(type: string): string {
  return CTA_EVENT_COLORS[type] || '#9ca3af'
}

// Цвет прогресса в зависимости от процента
export function percentColor(p: number): string {
  if (p >= 80) return '#4ade80'
  if (p >= 50) return '#facc15'
  if (p >= 20) return '#f59e0b'
  return '#ef4444'
}

// Проверка на событие оплаты
export function isPaymentEvent(type: string): boolean {
  return type === 'payment_page_opened' || type === 'payment_completed'
}

// Форматирование даты
export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Форматирование времени (секунды в HH:MM:SS)
export function formatTime(seconds: number | null): string {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Форматирование просмотренного времени
export function formatWatchedTime(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Форматирование таймкода пика онлайна
export function formatPeakTimecode(seconds: number | null): string {
  if (seconds == null) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

// Форматирование денег
export function formatMoney(amount: number, currency: string = 'RUB'): string {
  if (!amount || amount === 0) return '—'
  const formatted = amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
  const currencySymbol =
    currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  return `${formatted} ${currencySymbol}`
}

// Генерация пагинации
export function makePagination(total: number, current: number): Array<number | string> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | string> = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
