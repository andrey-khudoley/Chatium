// @shared
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const RECONNECT_DELAY = 3000 // 3 секунды между попытками
const MAX_RECONNECT_ATTEMPTS = 10
const HEARTBEAT_INTERVAL = 30000 // 30 секунд heartbeat

interface SocketState {
  isConnected: boolean
  isReconnecting: boolean
  reconnectAttempts: number
  lastError: string | null
  lastMessageAt: Date | null
}

export function useChatSocket(userSocketId: string | null | undefined) {
  const socketData = ref<any>(null)
  const state = ref<SocketState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null,
    lastMessageAt: null,
  })
  
  let subscription: any = null
  let unsubscribe: (() => void) | null = null
  let reconnectTimer: any = null
  let heartbeatTimer: any = null
  let socketClient: any = null
  let isDestroyed = false

  // Подключение к WebSocket
  async function connect() {
    if (!userSocketId || isDestroyed) return
    
    try {
      // console.log('[Socket] Connecting...', { userSocketId, attempt: state.value.reconnectAttempts })
      
      socketClient = await getOrCreateBrowserSocketClient()
      subscription = socketClient.subscribeToData(userSocketId)
      
      state.value.isConnected = true
      state.value.isReconnecting = false
      state.value.reconnectAttempts = 0
      state.value.lastError = null
      
      // console.log('[Socket] Connected successfully')
      
      // Начинаем слушать события
      unsubscribe = subscription.listen((data: any) => {
        state.value.lastMessageAt = new Date()
        socketData.value = data
      })
      
      // Запускаем heartbeat
      startHeartbeat()
      
    } catch (error: any) {
      console.error('[Socket] Connection error:', error)
      state.value.isConnected = false
      state.value.lastError = error?.message || 'Unknown error'
      scheduleReconnect()
    }
  }

  // Отключение
  function disconnect() {
    // console.log('[Socket] Disconnecting...')
    
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch (e) {
        console.warn('[Socket] Error during unsubscribe:', e)
      }
      unsubscribe = null
    }
    
    subscription = null
    state.value.isConnected = false
  }

  // Планирование переподключения
  function scheduleReconnect() {
    if (isDestroyed) return
    if (state.value.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[Socket] Max reconnect attempts reached')
      state.value.lastError = 'Превышено количество попыток переподключения'
      return
    }
    
    state.value.isReconnecting = true
    state.value.reconnectAttempts++
    
    const delay = Math.min(RECONNECT_DELAY * state.value.reconnectAttempts, 30000)
    // console.log(`[Socket] Reconnecting in ${delay}ms (attempt ${state.value.reconnectAttempts})`)
    
    reconnectTimer = setTimeout(() => {
      if (!isDestroyed) {
        connect()
      }
    }, delay)
  }

  // Heartbeat для поддержания соединения
  function startHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
    }
    
    heartbeatTimer = setInterval(() => {
      if (!state.value.isConnected || isDestroyed) return
      
      // Проверяем, когда последний раз получали сообщение
      const now = new Date()
      const lastMessage = state.value.lastMessageAt
      
      // Если давно не было сообщений — проверяем соединение
      if (lastMessage && now.getTime() - lastMessage.getTime() > HEARTBEAT_INTERVAL * 2) {
        // console.log('[Socket] No messages for a while, checking connection...')
        // Переподключаемся если давно не было активности
        disconnect()
        scheduleReconnect()
      }
    }, HEARTBEAT_INTERVAL)
  }

  // Обработка изменения видимости страницы
  function handleVisibilityChange() {
    if (isDestroyed) return
    
    if (document.visibilityState === 'visible') {
      // console.log('[Socket] Page became visible, checking connection...')
      
      // Если не подключены или давно не было сообщений — переподключаемся
      const now = new Date()
      const lastMessage = state.value.lastMessageAt
      const needsReconnect = !state.value.isConnected || 
        (lastMessage && now.getTime() - lastMessage.getTime() > 60000) // > 1 минуты
      
      if (needsReconnect) {
        // console.log('[Socket] Reconnecting after visibility change')
        disconnect()
        // Сбрасываем счетчик попыток при ручном переподключении
        state.value.reconnectAttempts = 0
        connect()
      }
    }
  }

  // Обработка online/offline
  function handleOnline() {
    // console.log('[Socket] Browser went online, reconnecting...')
    if (!isDestroyed) {
      disconnect()
      state.value.reconnectAttempts = 0
      connect()
    }
  }

  function handleOffline() {
    // console.log('[Socket] Browser went offline')
    state.value.isConnected = false
    state.value.lastError = 'Нет подключения к интернету'
  }

  onMounted(() => {
    // console.log('[Socket] Component mounted, initializing...')
    
    // Начинаем подключение
    connect()
    
    // Слушаем события видимости и сети
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    // console.log('[Socket] Component unmounting, cleaning up...')
    isDestroyed = true
    
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    
    disconnect()
  })

  // Ручное переподключение
  function reconnect() {
    // console.log('[Socket] Manual reconnect triggered')
    disconnect()
    state.value.reconnectAttempts = 0
    connect()
  }

  return {
    socketData,
    isConnected: computed(() => state.value.isConnected),
    isReconnecting: computed(() => state.value.isReconnecting),
    reconnectAttempts: computed(() => state.value.reconnectAttempts),
    lastError: computed(() => state.value.lastError),
    reconnect,
  }
}
