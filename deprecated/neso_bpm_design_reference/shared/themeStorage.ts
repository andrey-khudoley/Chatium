// @shared
/**
 * Сохранение и чтение выбранной темы BPM (light/dark) в localStorage.
 */

import type { ThemeMode } from './themeCatalog'

const STORAGE_KEY = 'bpm-theme'

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
    return null
  } catch {
    return null
  }
}

export function setStoredTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}
