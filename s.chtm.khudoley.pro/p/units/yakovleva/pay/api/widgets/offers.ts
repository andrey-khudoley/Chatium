// @shared-route
/**
 * `GET /api/widgets/offers` — приватный эндпоинт для админ-панели.
 *
 * **Единственный источник списка офферов — GetCourse (`getOffers`).**
 * Виджеты (LifePay и Lava.Top) встраиваются на страницы GetCourse, где
 * `data-offer-id` на якоре содержит id GC-оффера. Фильтр whitelist/blacklist
 * для каждого метода оперирует одним и тем же набором GC-офферов — админ
 * выбирает разные подмножества для LifePay и Lava.Top.
 *
 * Проксирует к GC-гейтвею через `invokeByGateway(ctx, 'gc', 'getOffers', ...)`.
 * При выключенном `gc_enabled` или пустых GC-настройках — отдаёт
 * `GC_DISABLED` / `GC_NOT_CONFIGURED` (информативно для админ-карточки;
 * сохранённые id офферов не затронуты).
 *
 * Доступ — `guardInternalApi` (Admin или сотрудник с активным `panel_access`):
 * выбор офферов для виджет-фильтра — operational/бизнес-уровень. Помечен
 * `// @shared-route` для `.run()` из Vue.
 */

import * as loggerLib from '../../lib/logger.lib'
import * as settingsLib from '../../lib/settings.lib'
import { invokeByGateway } from '../../lib/gateway/invokeDispatcher'
import { guardInternalApi } from '../../lib/access/apiGuard'

const LOG_PATH = 'api/widgets/offers'

type OfferItem = {
  id: string
  name: string
  price?: number
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Извлекает массив GC-офферов из ответа гейтвея.
 *
 * Реальная структура от `invokeByGateway('gc', 'getOffers', ...)` —
 * **двойная обёртка**: gateway `v1SuccessResponse` оборачивает GC-ответ в
 * `{ ok: true, data: <gcJson> }`, где `<gcJson>` сам имеет формат GC API
 * `{ status: true, code, message, errors, data: [...] }`. Таким образом
 * массив офферов лежит в `responseBody.data.data`.
 *
 * Также терпим к нестандартным формам (items / offers / `data` как массив
 * напрямую) для устойчивости к изменениям контура.
 */
function extractGcOffers(responseBody: Record<string, unknown> | null): OfferItem[] {
  if (!responseBody) return []
  const candidates: unknown[] = []
  // Основной путь: `responseBody.data` — это GC JSON, его `data` — массив офферов.
  const dataField = responseBody.data
  if (isObject(dataField)) {
    if (Array.isArray((dataField as { data?: unknown }).data)) {
      candidates.push(...(dataField as { data: unknown[] }).data)
    }
    if (Array.isArray(dataField.items)) candidates.push(...dataField.items)
    if (Array.isArray((dataField as { offers?: unknown }).offers)) {
      candidates.push(...(dataField as { offers: unknown[] }).offers)
    }
  }
  // Прямые формы (на случай других контуров).
  if (Array.isArray(responseBody.data)) candidates.push(...(responseBody.data as unknown[]))
  if (Array.isArray(responseBody.items)) candidates.push(...responseBody.items)
  if (Array.isArray((responseBody as { offers?: unknown }).offers)) {
    candidates.push(...(responseBody as { offers: unknown[] }).offers)
  }
  if (candidates.length === 0 && Array.isArray(responseBody)) {
    candidates.push(...(responseBody as unknown[]))
  }

  const seen = new Set<string>()
  const result: OfferItem[] = []
  for (const raw of candidates) {
    if (!isObject(raw)) continue
    const idCandidate = raw.id ?? raw.offer_id ?? raw.offerId
    const id =
      typeof idCandidate === 'string'
        ? idCandidate
        : typeof idCandidate === 'number'
          ? String(idCandidate)
          : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    const nameCandidate = raw.title ?? raw.name
    const name = typeof nameCandidate === 'string' && nameCandidate.length > 0 ? nameCandidate : id
    const priceCandidate = (raw as { price?: unknown }).price
    const finalPriceCandidate = (raw as { final_price?: unknown }).final_price
    const price =
      typeof priceCandidate === 'number'
        ? priceCandidate
        : typeof finalPriceCandidate === 'number'
          ? finalPriceCandidate
          : undefined
    result.push({ id, name, price })
  }
  return result
}

export const widgetOffersRoute = app.get('/', async (ctx) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const gcEnabled = await settingsLib.getGcEnabled(ctx)
  if (!gcEnabled) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] gc_disabled`,
      payload: {}
    })
    return {
      success: false,
      error: 'GC_DISABLED',
      offers: [] as OfferItem[]
    }
  }

  const baseUrl = await settingsLib.getGcBaseUrl(ctx)
  const schoolApiKey = await settingsLib.getGcTestSchoolApiKey(ctx)
  const schoolHost = await settingsLib.getGcTestSchoolHost(ctx)
  if (!baseUrl || !schoolApiKey || !schoolHost) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] gc_not_configured`,
      payload: {
        hasBaseUrl: !!baseUrl,
        hasApiKey: !!schoolApiKey,
        hasHost: !!schoolHost
      }
    })
    return {
      success: false,
      error: 'GC_NOT_CONFIGURED',
      offers: [] as OfferItem[]
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  // GC-гейтвей требует явный httpMethod (см. invokeDispatcher).
  // getOffers — GET без дополнительных аргументов.
  const result = await invokeByGateway(ctx, 'gc', 'getOffers', {}, { httpMethod: 'GET' })
  if (!result.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] gateway_error`,
      payload: {
        httpStatus: result.httpStatus,
        proxyError: result.proxyError,
        requestId: result.requestId
      }
    })
    return {
      success: false,
      error: result.proxyError || 'GC_GATEWAY_ERROR',
      httpStatus: result.httpStatus,
      offers: [] as OfferItem[]
    }
  }

  const offers = extractGcOffers(result.responseBody)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] success`,
    payload: { offersCount: offers.length, requestId: result.requestId }
  })

  return { success: true, offers, requestId: result.requestId }
})

export default widgetOffersRoute
