<template>
  <button
    class="theme-toggle"
    @click="handleToggle"
    :title="currentTheme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'"
    :aria-label="currentTheme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'"
  >
    <i v-if="currentTheme === 'light'" class="fas fa-moon"></i>
    <i v-else class="fas fa-sun"></i>
    <span class="theme-toggle-text">{{ currentTheme === 'light' ? 'Тёмная' : 'Светлая' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'knowledge-app-theme'
const currentTheme = ref<Theme>('light')

function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return 'light'
}

function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  document.documentElement.setAttribute('data-theme', theme)

  if (document.body) {
    document.body.classList.remove('theme-light', 'theme-dark')
    document.body.classList.add(`theme-${theme}`)
  }
}

function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function toggleTheme(): Theme {
  const current = getCurrentTheme()
  const newTheme: Theme = current === 'light' ? 'dark' : 'light'

  saveTheme(newTheme)
  applyTheme(newTheme)

  return newTheme
}

function handleToggle() {
  currentTheme.value = toggleTheme()
}

onMounted(() => {
  currentTheme.value = getCurrentTheme()
})
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-secondary);
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.theme-toggle:hover {
  background-color: var(--bg-tertiary);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.theme-toggle:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.theme-toggle i {
  font-size: 1rem;
  transition: transform 0.3s ease;
}

.theme-toggle:hover i {
  transform: rotate(15deg);
}

.theme-toggle-text {
  display: inline-block;
}

@media (max-width: 640px) {
  .theme-toggle-text {
    display: none;
  }

  .theme-toggle {
    padding: 0.5rem;
    width: 2.5rem;
    height: 2.5rem;
    justify-content: center;
  }
}
</style>
