// @shared
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue'

interface SyncState {
  lastSyncAt: Date | null
  isSyncing: boolean
  missedMessages: any[]
}

interface Message {
  id: string
  createdAt: string | Date
  [key: string]: any
}

interface LoadMessagesOptions {
  afterId?: string
  limit?: number
}

/**
 * Composable для синхронизации сообщений при восстановлении соединения.
 * Решает проблему пропущенных сообщений на мобильных при выключении экрана.
 */
export function useMessageSync(
  feedIdRef: Ref<string | null | undefined>,
  getCurrentMessages: () => Message[],
  loadMessagesFn: (options?: LoadMessagesOptions) => Promise<Message[]>,
  onNewMessages?: (messages: Message[]) => void
) {
  const state = ref<SyncState>({
    lastSyncAt: null,
    isSyncing: false,
    missedMessages: [],
  })

  let syncTimer: any = null
  const isPageVisible = ref(true)
  let lastMessageIdBeforeSleep: string | null = null

  /**
   * Сохраняем ID последнего сообщения перед "засыпанием"
   */
  function saveLastMessageState() {
    const messages = getCurrentMessages()
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      lastMessageIdBeforeSleep = lastMsg.id
      // console.log('[MessageSync] Saved last message ID before sleep:', lastMessageIdBeforeSleep)
    }
  }

  /**
   * Получаем ID последнего сообщения из текущих
   */
  function getLastMessageId(): string | null {
    const messages = getCurrentMessages()
    if (messages.length > 0) {
      return messages[messages.length - 1].id
    }
    return null
  }

  /**
   * Выполняем синхронизацию - загружаем сообщения после определённого ID
   */
  async function performSync(afterId?: string) {
    const feedId = feedIdRef.value
    if (!feedId || state.value.isSyncing) return

    // Получаем ID для синхронизации, проверяем что он не пустой
    const syncAfterId = afterId || lastMessageIdBeforeSleep || getLastMessageId()
    if (!syncAfterId) {
      // console.log('[MessageSync] No afterId available, skipping sync')
      return
    }

    state.value.isSyncing = true
    // console.log('[MessageSync] Starting sync, afterId:', syncAfterId)

    try {
      const messages = await loadMessagesFn({
        afterId: syncAfterId,
        limit: 20,
      })

      // Фильтруем только новые сообщения (которых ещё нет в текущих)
      const currentMessages = getCurrentMessages()
      const existingIds = new Set(currentMessages.map(m => m.id))
      const newMessages = messages.filter(m => !existingIds.has(m.id))

      if (newMessages.length > 0) {
        // console.log('[MessageSync] Found', newMessages.length, 'new messages')
        
        // Вызываем callback для добавления сообщений с компенсацией высоты
        if (onNewMessages) {
          onNewMessages(newMessages, 'sync')
        }
      } else {
        // console.log('[MessageSync] No new messages found')
      }

      state.value.lastSyncAt = new Date()
    } catch (error) {
      console.error('[MessageSync] Sync failed:', error)
    } finally {
      state.value.isSyncing = false
    }
  }

  /**
   * Принудительная синхронизация (можно вызывать при восстановлении соединения)
   */
  function forceSync() {
    // console.log('[MessageSync] Force sync triggered')
    return performSync()
  }

  /**
   * Обработчик изменения видимости страницы
   */
  function handleVisibilityChange() {
    const isVisible = document.visibilityState === 'visible'
    isPageVisible.value = isVisible

    if (isVisible) {
      // Страница стала видимой - выполняем синхронизацию
      // console.log('[MessageSync] Page became visible, triggering sync')
      
      // Небольшая задержка, чтобы дать WebSocket время на переподключение
      setTimeout(() => {
        performSync()
      }, 500)
    } else {
      // Страница скрыта - сохраняем состояние
      saveLastMessageState()
    }
  }

  /**
   * Обработчик восстановления онлайн-состояния
   */
  function handleOnline() {
    // console.log('[MessageSync] Browser went online, triggering sync')
    setTimeout(() => {
      performSync()
    }, 500)
  }

  /**
   * Периодическая проверка (backup на случай если visibilitychange не сработал)
   */
  function startPeriodicCheck() {
    if (syncTimer) clearInterval(syncTimer)
    
    syncTimer = setInterval(() => {
      if (isPageVisible.value && document.visibilityState === 'visible') {
        // Проверяем, нужна ли синхронизация
        // (например, если давно не было обновлений)
        const lastSync = state.value.lastSyncAt
        if (!lastSync || Date.now() - lastSync.getTime() > 30000) {
          performSync()
        }
      }
    }, 30000) // Каждые 30 секунд
  }

  function stopPeriodicCheck() {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    startPeriodicCheck()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    stopPeriodicCheck()
  })

  return {
    syncState: state,
    forceSync,
    isPageVisible: computed(() => isPageVisible.value),
  }
}
