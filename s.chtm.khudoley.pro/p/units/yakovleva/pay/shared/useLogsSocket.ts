// @shared
// Композэйбл для подписки на поток логов через WebSocket.
// Инкапсулирует жизненный цикл сокета (подключение/отключение/переподключение по online/visibility),
// эмитит входящие LogEntry в коллбэк и публикует реактивные флаги для индикатора в UI.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { createComponentLogger, type LogEntry } from './logger'

const log = createComponentLogger('useLogsSocket')

export interface UseLogsSocketOptions {
  /** Идентификатор канала логов; если пустой — WebSocket не поднимается. */
  encodedLogsSocketId?: string
  /** Колбэк на каждое новое сообщение `new-log`. */
  onEntry: (entry: LogEntry) => void
}

/**
 * Подписка на события жизненного цикла сокета (если платформа их отдаёт).
 * Без колбэков показываем OFFLINE только по offline/ошибке подключения и при ручном переподключении.
 */
function attachLifecycle(
  socketClient: unknown,
  subscription: unknown,
  onDisconnect: () => void
): (() => void) | null {
  const cleanups: Array<() => void> = []
  try {
    const sc = socketClient as Record<string, unknown>
    if (typeof sc.addConnectionListener === 'function') {
      const unsub = (sc.addConnectionListener as (fn: (connected: boolean) => void) => () => void)(
        (connected) => {
          if (!connected) onDisconnect()
        }
      )
      if (typeof unsub === 'function') cleanups.push(unsub)
    }
    const sub = subscription as Record<string, unknown>
    if (typeof sub.on === 'function') {
      const subOn = sub.on as (ev: string, fn: () => void) => void
      const handler = () => onDisconnect()
      for (const ev of ['disconnect', 'close'] as const) {
        try {
          subOn(ev, handler)
          if (typeof sub.off === 'function') {
            const subOff = sub.off as (ev: string, fn: () => void) => void
            cleanups.push(() => {
              try {
                subOff(ev, handler)
              } catch {
                /* ignore */
              }
            })
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  if (!cleanups.length) return null
  return () => {
    cleanups.forEach((fn) => {
      try {
        fn()
      } catch {
        /* ignore */
      }
    })
  }
}

export function useLogsSocket(opts: UseLogsSocketOptions) {
  /** Поток логов по WebSocket: подключён / нет канала / офлайн. */
  const connected = ref(false)
  /** Первая попытка подписки завершилась — до этого не показываем OFFLINE, чтобы не мигать. */
  const initialized = ref(false)

  let unsubscribe: (() => void) | null = null
  let lifecycleCleanup: (() => void) | null = null

  function detachLifecycle() {
    if (lifecycleCleanup) {
      try {
        lifecycleCleanup()
      } catch {
        /* ignore */
      }
      lifecycleCleanup = null
    }
  }

  async function setup() {
    log.info('setupLogsWebSocket entry')
    if (!opts.encodedLogsSocketId) {
      connected.value = false
      initialized.value = true
      return
    }
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch {
        /* ignore */
      }
      unsubscribe = null
    }
    detachLifecycle()
    try {
      const socketClient = await getOrCreateBrowserSocketClient()
      const subscription = socketClient.subscribeToData(opts.encodedLogsSocketId)
      lifecycleCleanup = attachLifecycle(socketClient, subscription, () => {
        connected.value = false
      })
      unsubscribe = subscription.listen((data: { type?: string; data?: LogEntry }) => {
        if (data?.type === 'new-log' && data.data) {
          opts.onEntry(data.data as LogEntry)
        }
      })
      connected.value = true
    } catch (err) {
      connected.value = false
      log.error('Не удалось подписаться на логи по WebSocket', err)
    } finally {
      initialized.value = true
    }
  }

  function onBrowserOffline() {
    log.info('onBrowserOffline: WebSocket marked disconnected')
    connected.value = false
  }

  function onBrowserOnline() {
    log.info('onBrowserOnline: reconnecting WebSocket')
    void setup()
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible' || !opts.encodedLogsSocketId) return
    if (!connected.value) {
      log.info('onVisibilityForLogsSocket: tab visible, reconnecting')
      void setup()
    }
  }

  onMounted(() => {
    void setup()
    window.addEventListener('offline', onBrowserOffline)
    window.addEventListener('online', onBrowserOnline)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('offline', onBrowserOffline)
    window.removeEventListener('online', onBrowserOnline)
    document.removeEventListener('visibilitychange', onVisibility)
    detachLifecycle()
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })

  return { connected, initialized, setup }
}
