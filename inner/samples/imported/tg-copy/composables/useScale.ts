// @shared

import { ref, computed } from 'vue'

const STORAGE_KEY = 'chat-ui-scale'
const SIDEBAR_WIDTH_KEY = 'chat-sidebar-width'

// Диапазон масштаба
const MIN_SCALE = 50
const MAX_SCALE = 300
const SCALE_STEP = 25

// Функция для немедленной инициализации масштаба (вызывается при импорте)
function initScale(): number {
  if (typeof localStorage === 'undefined') return 100
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return 100
  const parsed = parseInt(saved, 10)
  if (isNaN(parsed) || parsed < MIN_SCALE || parsed > MAX_SCALE) return 100
  return parsed
}

// Функция для немедленной инициализации ширины сайдбара
function initSidebarWidth(): number {
  if (typeof localStorage === 'undefined') return 360
  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY)
  if (!saved) return 360
  const parsed = parseInt(saved, 10)
  if (isNaN(parsed) || parsed < 280 || parsed > 600) return 360
  return parsed
}

// Немедленно применяем масштаб к документу (вызывается при загрузке модуля)
const initialScale = initScale()
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--ui-scale', String(initialScale / 100))
}

// Глобальное состояние масштаба (singleton)
const currentScale = ref<number>(initialScale)
const sidebarWidth = ref<number>(initSidebarWidth())

export function useScale() {
  // Установка масштаба
  function setScale(newScale: number) {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    currentScale.value = clamped
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(clamped))
    }
    // Применяем масштаб сразу
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ui-scale', String(clamped / 100))
    }
    // Перезагружаем страницу для применения масштаба ко всем элементам
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  // Увеличение масштаба
  function increaseScale() {
    const newScale = Math.min(MAX_SCALE, currentScale.value + SCALE_STEP)
    setScale(newScale)
  }

  // Уменьшение масштаба
  function decreaseScale() {
    const newScale = Math.max(MIN_SCALE, currentScale.value - SCALE_STEP)
    setScale(newScale)
  }

  // Сброс масштаба
  function resetScale() {
    setScale(100)
  }

  // Установка ширины сайдбара
  function setSidebarWidth(width: number) {
    const clamped = Math.max(280, Math.min(600, width))
    sidebarWidth.value = clamped
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped))
    }
  }

  // Форматированное отображение масштаба
  const scaleDisplay = computed(() => `${currentScale.value}%`)

  // Значения для слайдера
  const scaleValues = computed(() => {
    const values: number[] = []
    for (let i = MIN_SCALE; i <= MAX_SCALE; i += SCALE_STEP) {
      values.push(i)
    }
    return values
  })

  return {
    scale: currentScale,
    scaleDisplay,
    sidebarWidth,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    scaleStep: SCALE_STEP,
    scaleValues,
    setScale,
    increaseScale,
    decreaseScale,
    resetScale,
    setSidebarWidth,
  }
}
