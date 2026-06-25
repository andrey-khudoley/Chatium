// @shared

export function rub(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(n)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function statusColor(s: string): string {
  const m: Record<string, string> = {
    inbox: 'var(--fg3)',
    todo: 'var(--fg2)',
    doing: 'var(--accent)',
    wait: 'var(--warn)',
    done: 'var(--ok)',
    in_progress: 'var(--accent)',
    blocked: 'var(--warn)',
    cancelled: 'var(--fg3)'
  }
  return m[s] || 'var(--fg3)'
}

export function statusLabel(s: string): string {
  const m: Record<string, string> = {
    inbox: 'Входящие',
    todo: 'Не начато',
    doing: 'В работе',
    wait: 'Ожидание',
    done: 'Готово',
    in_progress: 'В работе',
    blocked: 'Заблокировано',
    cancelled: 'Отменено'
  }
  return m[s] || s
}

export function prColor(p: string): string {
  const m: Record<string, string> = {
    high: 'var(--warn)',
    med: 'var(--accent)',
    medium: 'var(--accent)',
    low: 'var(--fg3)'
  }
  return m[p] || 'var(--fg3)'
}

export function prLabel(p: string): string {
  const m: Record<string, string> = {
    high: 'Высокий',
    med: 'Средний',
    medium: 'Средний',
    low: 'Низкий'
  }
  return m[p] || p
}

export function typeLabel(t: string): string {
  const m: Record<string, string> = {
    task: 'Задача',
    project: 'Проект',
    goal: 'Цель',
    habit: 'Привычка',
    article: 'Статья',
    book: 'Книга',
    note: 'Заметка',
    video: 'Видео'
  }
  return m[t] || t
}

export function libStatusColor(s: string): string {
  const m: Record<string, string> = {
    reading: 'var(--accent)',
    done: 'var(--ok)',
    queue: 'var(--fg3)'
  }
  return m[s] || 'var(--fg3)'
}

export function libStatusLabel(s: string): string {
  const m: Record<string, string> = {
    reading: 'Читаю',
    done: 'Прочитано',
    queue: 'В очереди'
  }
  return m[s] || s
}
