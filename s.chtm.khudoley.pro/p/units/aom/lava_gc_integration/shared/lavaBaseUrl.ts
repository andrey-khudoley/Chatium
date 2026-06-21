// @shared
/**
 * Базовый URL API Lava для форм ввода и запросов.
 * Пустое значение → https://gate.lava.top; «gate.lava.top» → https://gate.lava.top
 */
export function normalizeLavaBaseUrlInput(raw: string): string {
  const t = raw.trim()
  if (!t) return 'https://gate.lava.top'
  if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, '')
  return `https://${t.replace(/^\/+/, '')}`.replace(/\/+$/, '')
}
