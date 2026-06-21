// @shared
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable для отслеживания высоты виртуальной клавиатуры на мобиле.
 * Использует visualViewport API для определения смещения.
 * Возвращает offset в px, на который нужно поднять fixed-элемент.
 */
export function useKeyboardOffset() {
  const keyboardOffset = ref(0)

  let onResize: (() => void) | null = null
  let onScroll: (() => void) | null = null

  function update() {
    if (!window.visualViewport) {
      keyboardOffset.value = 0
      return
    }

    const vv = window.visualViewport
    // Разница между полной высотой окна и видимой областью viewport
    // Когда клавиатура открыта, visualViewport.height уменьшается
    const offset = window.innerHeight - vv.height
    keyboardOffset.value = Math.max(0, Math.round(offset))
  }

  onMounted(() => {
    if (window.visualViewport) {
      onResize = update
      onScroll = update
      window.visualViewport.addEventListener('resize', onResize)
      window.visualViewport.addEventListener('scroll', onScroll)
      update()
    }
  })

  onUnmounted(() => {
    if (window.visualViewport) {
      if (onResize) window.visualViewport.removeEventListener('resize', onResize)
      if (onScroll) window.visualViewport.removeEventListener('scroll', onScroll)
    }
  })

  return { keyboardOffset }
}
