// @shared
import type { LogEntry } from './logger'

const DEFAULT_FLUSH_MS = 2500
const DEFAULT_MAX_BATCH = 50
const DEFAULT_MAX_BUFFER = 400
const MAX_MSG = 11000

export type BrowserRemotePostPayload = {
  clrtUid?: string | null
  entries: Array<{
    severity: number
    message: string
    timestamp: number
    channel: 'console' | 'sink'
    method?: string
  }>
}

function getClrtUid(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const id = (window as Window & { clrtUid?: string }).clrtUid
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
    .join(' ')
}

function truncate(s: string): string {
  if (s.length <= MAX_MSG) return s
  return `${s.slice(0, MAX_MSG)}…`
}

function severityForConsoleMethodName(method: string): number {
  switch (method) {
    case 'error':
      return 3
    case 'warn':
      return 4
    case 'debug':
      return 7
    case 'log':
    case 'info':
    default:
      return 6
  }
}

export function createBrowserRemoteLogger(options: {
  post: (payload: BrowserRemotePostPayload) => Promise<unknown>
  flushIntervalMs?: number
  maxBatch?: number
  maxBuffer?: number
}): {
  pushSinkEntry: (entry: LogEntry) => void
  installConsoleAndGlobalHandlers: () => void
  flush: () => Promise<void>
  teardown: () => void
} {
  const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_MS
  const maxBatch = options.maxBatch ?? DEFAULT_MAX_BATCH
  const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER

  const queue: BrowserRemotePostPayload['entries'] = []
  let timer: ReturnType<typeof setInterval> | null = null
  let flushing = false

  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  }

  let prevOnError: OnErrorEventHandler | null = null
  let unhandledRejectionListener: ((ev: PromiseRejectionEvent) => void) | null = null

  const flush = async (): Promise<void> => {
    if (flushing || queue.length === 0) return
    flushing = true
    const batch = queue.splice(0, maxBatch)
    try {
      await options.post({ clrtUid: getClrtUid() ?? null, entries: batch })
    } catch {
      /* сеть/сессия — не ломаем страницу */
    } finally {
      flushing = false
    }
  }

  const enqueue = (entry: BrowserRemotePostPayload['entries'][0]): void => {
    queue.push(entry)
    if (queue.length > maxBuffer) {
      queue.splice(0, queue.length - maxBuffer)
    }
    if (queue.length >= maxBatch) {
      void flush()
    }
  }

  const patchConsole = (method: keyof typeof orig): void => {
    const name = method as string
    ;(console as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      ;(orig[method] as (...a: unknown[]) => void)(...args)
      const message = truncate(stringifyArgs(args))
      enqueue({
        severity: severityForConsoleMethodName(name),
        message,
        timestamp: Date.now(),
        channel: 'console',
        method: name
      })
    }
  }

  const onWindowError: typeof window.onerror = (message, source, lineno, colno, error) => {
    if (typeof prevOnError === 'function') {
      prevOnError(message, source, lineno, colno, error)
    }
    const msgStr = typeof message === 'string' ? message : String(message ?? '')
    const bits: string[] = [msgStr]
    if (source) bits.push(String(source))
    if (lineno != null) bits.push(String(lineno))
    if (colno != null) bits.push(String(colno))
    const parts = bits.join(' ')
    const errMsg = error instanceof Error ? `${parts} ${error.message}`.trim() : parts
    enqueue({
      severity: 3,
      message: truncate(errMsg || 'window.onerror'),
      timestamp: Date.now(),
      channel: 'console',
      method: 'window.onerror'
    })
  }

  const onUnhandledRejection = (ev: PromiseRejectionEvent): void => {
    const r = ev.reason
    const text =
      r instanceof Error
        ? r.stack || r.message
        : typeof r === 'object' && r !== null
          ? JSON.stringify(r)
          : String(r)
    enqueue({
      severity: 3,
      message: truncate(`unhandledrejection: ${text}`),
      timestamp: Date.now(),
      channel: 'console',
      method: 'unhandledrejection'
    })
  }

  const pushSinkEntry = (entry: LogEntry): void => {
    enqueue({
      severity: entry.severity,
      message: truncate(stringifyArgs(entry.args)),
      timestamp: entry.timestamp,
      channel: 'sink',
      method: entry.level
    })
  }

  const installConsoleAndGlobalHandlers = (): void => {
    patchConsole('log')
    patchConsole('info')
    patchConsole('warn')
    patchConsole('error')
    patchConsole('debug')
    prevOnError = window.onerror
    window.onerror = onWindowError
    unhandledRejectionListener = onUnhandledRejection
    window.addEventListener('unhandledrejection', unhandledRejectionListener)
    timer = setInterval(() => {
      void flush()
    }, flushIntervalMs)
    window.addEventListener('pagehide', () => {
      void flush()
    })
  }

  const teardown = (): void => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    ;(console as { log?: unknown }).log = orig.log
    ;(console as { info?: unknown }).info = orig.info
    ;(console as { warn?: unknown }).warn = orig.warn
    ;(console as { error?: unknown }).error = orig.error
    ;(console as { debug?: unknown }).debug = orig.debug
    window.onerror = prevOnError
    if (unhandledRejectionListener) {
      window.removeEventListener('unhandledrejection', unhandledRejectionListener)
      unhandledRejectionListener = null
    }
    void flush()
  }

  return { pushSinkEntry, installConsoleAndGlobalHandlers, flush, teardown }
}
