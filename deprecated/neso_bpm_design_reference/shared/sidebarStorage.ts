// @shared
/**
 * Сохранение и чтение состояния свёрнутости сайдбара BPM в localStorage.
 */

const STORAGE_KEY = 'bpm-sidebar-collapsed'

export function getStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return false
    return raw === 'true'
  } catch {
    return false
  }
}

export function setStoredSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed))
  } catch {
    // ignore
  }
}
