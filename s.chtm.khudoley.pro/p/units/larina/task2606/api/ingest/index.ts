import * as settingsLib from '../../lib/settings.lib'
import * as diagnosticsRepo from '../../repos/diagnostics.repo'
import { writeServerLog } from '../../lib/logger.lib'

const LOG_PATH = 'api/ingest/index'

/**
 * POST / — публичный кросс-доменный ingest-эндпоинт.
 * Принимает снимок страницы с GetCourse и записывает в Heap.
 * БЕЗ requireAnyUser/requireRealUser — публичный.
 *
 * CORS-стратегия: скрипт шлёт Content-Type: text/plain → запрос «простой»,
 * preflight OPTIONS не отправляется. Тело читаем как строку и парсим JSON.
 */
export const postIngestRoute = app.post('/', async (ctx, req) => {
  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`
  })

  // Проверяем включён ли приём диагностики
  const enabled = await settingsLib.isDiagnosticsEnabled(ctx)
  if (!enabled) {
    await writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] diagnostics disabled — skip`
    })
    return { success: false, message: 'Диагностика отключена' }
  }

  // Парсим тело: может прийти строкой (Content-Type: text/plain) или уже объектом
  let payload: Record<string, unknown>
  try {
    const raw = req.body
    if (typeof raw === 'string') {
      payload = JSON.parse(raw)
    } else if (raw && typeof raw === 'object') {
      payload = raw as Record<string, unknown>
    } else {
      payload = {}
    }
  } catch (e) {
    await writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] JSON parse error`,
      payload: { error: String(e) }
    })
    return { success: false, message: 'Невалидный JSON в теле запроса' }
  }

  // Нормализация полей
  const visitorId = payload.visitorId != null ? String(payload.visitorId) : undefined
  const ip = payload.ip != null ? String(payload.ip) : undefined

  // url — отрезаем query если просочился
  let url: string | undefined
  if (payload.url != null) {
    const rawUrl = String(payload.url)
    const qIdx = rawUrl.indexOf('?')
    url = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl
  }

  const params = payload.params != null ? String(payload.params) : undefined
  const dom = payload.dom != null ? String(payload.dom) : undefined
  const info =
    payload.info != null && typeof payload.info === 'object' && !Array.isArray(payload.info)
      ? (payload.info as Record<string, unknown>)
      : undefined

  // Guard: если все ключевые поля пустые — не создаём запись
  if (!visitorId && !ip && !url) {
    await writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] warn: empty_payload — запись не создана`,
      payload: { reason: 'empty_payload' }
    })
    return { success: false }
  }

  await diagnosticsRepo.create(ctx, { visitorId, ip, url, params, dom, info })

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit success`,
    payload: {
      visitorId,
      urlLen: url?.length,
      domLen: dom?.length,
      paramsLen: params?.length
    }
  })

  return { success: true }
})

export default postIngestRoute
