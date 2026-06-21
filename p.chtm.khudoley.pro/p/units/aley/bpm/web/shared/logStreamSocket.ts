// @shared
/**
 * Подписка на события жизненного цикла сокета логов (если платформа их отдаёт).
 * Без колбэков OFFLINE показывается только по offline/ошибке подключения и при
 * ручном переподключении. Возвращает функцию очистки слушателей или null.
 */
export function attachLogsSocketLifecycle(
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
