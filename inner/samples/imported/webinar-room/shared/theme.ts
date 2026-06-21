// @shared

import { ref, watch } from 'vue'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'webinar-room-theme'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function getSystemTheme(): ThemeMode {
  try {
    if (
      isBrowser() &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    )
      return 'light'
  } catch {}
  return 'dark'
}

function getThemeFromDom(): ThemeMode | null {
  try {
    if (isBrowser() && document.documentElement.classList.contains('theme-light')) return 'light'
    if (isBrowser() && document.documentElement.classList.contains('theme-dark')) return 'dark'
  } catch {}
  return null
}

function getInitialTheme(): ThemeMode {
  // On client: first check what the inline <head> script already set on <html>
  const domTheme = getThemeFromDom()
  if (domTheme) return domTheme

  // Fallback: read localStorage, then system preference
  if (isBrowser()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {}
    return getSystemTheme()
  }

  // Server-side: return dark as default (doesn't matter, will be overridden on client)
  return 'dark'
}

export const currentTheme = ref<ThemeMode>(getInitialTheme())

let userManuallyChanged = false

export function toggleTheme() {
  userManuallyChanged = true
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
}

function applyTheme(theme: ThemeMode, saveToStorage: boolean) {
  if (!isBrowser()) return
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('theme-light')
    root.classList.remove('theme-dark')
  } else {
    root.classList.add('theme-dark')
    root.classList.remove('theme-light')
  }
  if (saveToStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }
}

export function initThemeWatcher() {
  if (isBrowser()) {
    // Re-read actual theme from DOM (set by inline script) to sync the ref
    const domTheme = getThemeFromDom()
    if (domTheme && domTheme !== currentTheme.value) {
      currentTheme.value = domTheme
    }
  }
  applyTheme(currentTheme.value, false)
  watch(currentTheme, (val) => {
    applyTheme(val, userManuallyChanged)
  })
}
