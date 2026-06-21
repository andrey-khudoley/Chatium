// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'

const MAX_ENTRIES = 80
const MAX_MESSAGE_LEN = 12000

type IncomingEntry = {
  severity?: unknown
  message?: unknown
  timestamp?: unknown
  channel?: unknown
  method?: unknown
}

function parseEntry(raw: unknown): {
  severity: number
  message: string
  timestamp: number
  channel: string
  method?: string
} | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as IncomingEntry
  const sevRaw = o.severity
  const severity =
    typeof sevRaw === 'number' && Number.isFinite(sevRaw)
      ? Math.max(0, Math.min(7, Math.floor(sevRaw)))
      : null
  if (severity === null) return null
  const msg = typeof o.message === 'string' ? o.message : String(o.message ?? '')
  if (!msg.trim()) return null
  const message = msg.length > MAX_MESSAGE_LEN ? `${msg.slice(0, MAX_MESSAGE_LEN)}…` : msg
  const tsRaw = o.timestamp
  const timestamp =
    typeof tsRaw === 'number' && Number.isFinite(tsRaw) ? Math.floor(tsRaw) : Date.now()
  const ch = typeof o.channel === 'string' && o.channel ? o.channel : 'console'
  const method = typeof o.method === 'string' && o.method ? o.method : undefined
  return { severity, message, timestamp, channel: ch, method }
}

/**
 * POST /api/logger/browser — пакетная запись браузерных логов (консоль, sink приложения, ошибки window).
 * Body: { clrtUid?: string | null, entries: Array<{ severity: 0–7, message, timestamp?, channel?, method? }> }.
 * Только для авторизованных пользователей. Записи попадают в Heap и WebSocket админки наравне с серверными логами.
 */
export const postBrowserLogsRoute = app.post('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const body = req.body as { clrtUid?: unknown; entries?: unknown }
  const clrtUidRaw = body?.clrtUid
  const clrtUid =
    clrtUidRaw === null || clrtUidRaw === undefined
      ? null
      : typeof clrtUidRaw === 'string'
        ? clrtUidRaw
        : String(clrtUidRaw)

  const rawList = body?.entries
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return { success: false, error: 'Поле entries должно быть непустым массивом' }
  }
  if (rawList.length > MAX_ENTRIES) {
    return { success: false, error: `Не более ${MAX_ENTRIES} записей за запрос` }
  }

  let written = 0
  for (const raw of rawList) {
    const parsed = parseEntry(raw)
    if (!parsed) continue
    const payload = {
      source: 'browser' as const,
      clrtUid,
      channel: parsed.channel,
      method: parsed.method,
      clientTimestamp: parsed.timestamp
    }
    const methodSuffix = parsed.method ? `:${parsed.method}` : ''
    await loggerLib.writeServerLog(ctx, {
      severity: parsed.severity,
      message: `[browser:${parsed.channel}${methodSuffix}] ${parsed.message}`,
      payload
    })
    written += 1
  }

  return { success: true, written }
})
