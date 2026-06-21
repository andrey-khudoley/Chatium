// @shared
// Система управления темами приложения

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'knowledge-app-theme'
export const DEFAULT_THEME: Theme = 'light'

/**
 * Получить текущую тему из localStorage
 */
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  
  return DEFAULT_THEME
}

/**
 * Сохранить тему в localStorage
 */
export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

/**
 * Применить тему к документу
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  
  document.documentElement.setAttribute('data-theme', theme)
  document.body.classList.remove('theme-light', 'theme-dark')
  document.body.classList.add(`theme-${theme}`)
}

/**
 * Переключить тему
 */
export function toggleTheme(): Theme {
  const current = getCurrentTheme()
  const newTheme: Theme = current === 'light' ? 'dark' : 'light'
  
  saveTheme(newTheme)
  applyTheme(newTheme)
  
  return newTheme
}

/**
 * Инициализировать тему при загрузке страницы
 */
export function initTheme(defaultTheme?: Theme): void {
  if (typeof window === 'undefined') return
  
  let theme = getCurrentTheme()
  
  // Если тема не установлена, используем переданную по умолчанию или DEFAULT_THEME
  if (!localStorage.getItem(THEME_STORAGE_KEY) && defaultTheme) {
    theme = defaultTheme
    saveTheme(theme)
  }
  
  applyTheme(theme)
}

