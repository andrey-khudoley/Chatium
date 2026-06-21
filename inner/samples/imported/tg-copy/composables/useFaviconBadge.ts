// @shared
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const originalFavicon = 'https://fs.chatium.ru/get/image_msk_AaplkedAT7'
let canvas: HTMLCanvasElement | null = null
let context: CanvasRenderingContext2D | null = null
let linkElement: HTMLLinkElement | null = null
let blinkInterval: ReturnType<typeof setInterval> | null = null
let isBlinking = false
let blinkState = false

export function useFaviconBadge() {
  const unreadCount = ref(0)
  const documentTitle = ref('')
  
  const hasUnread = computed(() => unreadCount.value > 0)
  
  // Инициализация canvas для рисования favicon
  function initCanvas() {
    if (typeof document === 'undefined') return
    
    canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    context = canvas.getContext('2d')
    
    // Находим или создаем link элемент favicon
    linkElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (!linkElement) {
      linkElement = document.createElement('link')
      linkElement.rel = 'icon'
      document.head.appendChild(linkElement)
    }
    
    // Сохраняем оригинальный title
    documentTitle.value = document.title
  }
  
  // Рисуем favicon с бейджем
  function drawFaviconWithBadge(count: number) {
    if (!canvas || !context || !linkElement) return
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      if (!context || !canvas) return
      
      // Очищаем canvas
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      // Рисуем исходную иконку
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      if (count > 0) {
        // Размер и позиция бейджа
        const badgeRadius = count > 9 ? 14 : 12
        const badgeX = canvas.width - badgeRadius - 2
        const badgeY = badgeRadius + 2
        
        // Рисуем красный круг бейджа
        context.beginPath()
        context.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2)
        context.fillStyle = '#ef4444'
        context.fill()
        
        // Белая обводка бейджа
        context.strokeStyle = '#ffffff'
        context.lineWidth = 2
        context.stroke()
        
        // Текст с числом
        context.fillStyle = '#ffffff'
        context.font = `bold ${count > 99 ? 11 : 13}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        
        // Форматируем число (99+ если больше 99)
        const displayCount = count > 99 ? '99+' : count.toString()
        context.fillText(displayCount, badgeX, badgeY)
      }
      
      // Обновляем favicon
      linkElement!.href = canvas.toDataURL('image/png')
    }
    
    img.onerror = () => {
      // При ошибке загрузки используем оригинальный favicon
      if (linkElement) {
        linkElement.href = originalFavicon
      }
    }
    
    img.src = originalFavicon
  }
  
  // Обновляем title с бейджем
  function updateTitle(count: number) {
    if (typeof document === 'undefined') return
    
    const baseTitle = documentTitle.value.replace(/^\(\d+\)\s*/, '')
    
    if (count > 0) {
      document.title = `(${count > 99 ? '99+' : count}) ${baseTitle}`
    } else {
      document.title = baseTitle
    }
  }
  
  // Устанавливаем количество непрочитанных
  function setUnreadCount(count: number) {
    unreadCount.value = count
  }
  
  // Обновляем favicon при изменении количества
  watch(unreadCount, (newCount) => {
    drawFaviconWithBadge(newCount)
    updateTitle(newCount)
  })
  
  onMounted(() => {
    initCanvas()
    // Небольшая задержка чтобы title успел установиться
    setTimeout(() => {
      documentTitle.value = document.title
      drawFaviconWithBadge(unreadCount.value)
      updateTitle(unreadCount.value)
    }, 100)
  })
  
  onUnmounted(() => {
    // Останавливаем мигание
    stopBlinking()
    // Восстанавливаем оригинальный favicon и title
    if (linkElement) {
      linkElement.href = originalFavicon
    }
    if (documentTitle.value && typeof document !== 'undefined') {
      document.title = documentTitle.value.replace(/^\(\d+\)\s*/, '')
    }
  })

  // Мигание favicon
  function startBlinking() {
    if (blinkInterval) return
    isBlinking = true
    blinkState = false
    
    blinkInterval = setInterval(() => {
      blinkState = !blinkState
      if (blinkState && unreadCount.value > 0) {
        // Рисуем "пустой" favicon (или с меньшей непрозрачностью)
        drawBlinkFavicon()
      } else {
        // Рисуем нормальный favicon с бейджем
        drawFaviconWithBadge(unreadCount.value)
      }
    }, 800) // Мигаем каждые 800ms
  }

  function stopBlinking() {
    if (blinkInterval) {
      clearInterval(blinkInterval)
      blinkInterval = null
    }
    isBlinking = false
    // Восстанавливаем нормальный favicon
    drawFaviconWithBadge(unreadCount.value)
  }

  // Рисуем "приглушенный" favicon для эффекта мигания
  function drawBlinkFavicon() {
    if (!canvas || !context || !linkElement) return
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      if (!context || !canvas) return
      
      // Очищаем canvas
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      // Рисуем исходную иконку с пониженной непрозрачностью
      context.globalAlpha = 0.4
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
      context.globalAlpha = 1.0
      
      // Обновляем favicon
      linkElement!.href = canvas.toDataURL('image/png')
    }
    
    img.onerror = () => {
      if (linkElement) {
        linkElement.href = originalFavicon
      }
    }
    
    img.src = originalFavicon
  }
  
  return {
    unreadCount,
    hasUnread,
    setUnreadCount,
    startBlinking,
    stopBlinking,
    isBlinking: computed(() => isBlinking),
  }
}
