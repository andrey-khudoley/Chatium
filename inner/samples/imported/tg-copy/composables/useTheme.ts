// @shared

import { ref, watch, onMounted, computed } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'chat-theme'

// Глобальное состояние темы (singleton)
const currentTheme = ref<Theme>('light')

export function useTheme() {
  // Загрузка темы из localStorage при инициализации
  onMounted(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) as Theme | null : null
    if (saved && (saved === 'light' || saved === 'dark')) {
      currentTheme.value = saved
    }
    applyTheme(currentTheme.value)
  })

  // Применение темы к документу
  function applyTheme(theme: Theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  // Переключение темы
  function toggleTheme() {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    applyTheme(currentTheme.value)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, currentTheme.value)
    }
  }

  // Установка конкретной темы
  function setTheme(theme: Theme) {
    currentTheme.value = theme
    applyTheme(theme)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  // Следим за изменениями темы
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  })

  return {
    theme: currentTheme,
    toggleTheme,
    setTheme,
    isDark: computed(() => currentTheme.value === 'dark'),
  }
}
