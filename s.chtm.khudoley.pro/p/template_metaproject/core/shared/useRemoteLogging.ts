// @shared
/**
 * Composable клиентского логирования: устанавливает browserRemoteLogger
 * (перехват console и глобальных ошибок, отправка логов на сервер) и регистрирует
 * единый log-sink. Дублируется на всех страницах (Home/Profile/Admin/Tests).
 *
 * - `enabled` — поднимать ли пайплайн (Tests включает только при наличии сокета);
 * - `onLocalEntry` — колбэк на каждую локальную запись (передаётся в монитор логов
 *   и/или счётчики дашборда).
 */
import { onMounted, onUnmounted } from 'vue'
import { setLogSink, type LogEntry } from './logger'
import { createBrowserRemoteLogger } from './browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'

declare const ctx: app.Ctx

export interface UseRemoteLoggingOptions {
  /** Поднимать ли пайплайн логирования (по умолчанию true). */
  enabled?: boolean
  /** Колбэк на каждую локальную запись из sink (монитор логов, счётчики). */
  onLocalEntry?: (entry: LogEntry) => void
}

export function useRemoteLogging(options: UseRemoteLoggingOptions = {}) {
  const enabled = options.enabled ?? true
  let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

  onMounted(() => {
    if (!enabled) return
    browserRemoteLogger = createBrowserRemoteLogger({
      post: (payload) => postBrowserLogsRoute.run(ctx, payload)
    })
    browserRemoteLogger.installConsoleAndGlobalHandlers()
    setLogSink((entry: LogEntry) => {
      options.onLocalEntry?.(entry)
      browserRemoteLogger!.pushSinkEntry(entry)
    })
  })

  onUnmounted(() => {
    if (!enabled) return
    setLogSink(null)
    if (browserRemoteLogger) {
      browserRemoteLogger.teardown()
      browserRemoteLogger = null
    }
  })
}
