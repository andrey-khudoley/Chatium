/**
 * `POST /api/widgets/config` — публичный эндпоинт конфигурации виджетов.
 *
 * ВНИМАНИЕ: эндпоинт сознательно публичный.
 * Принимает тело text/plain с JSON { dealId, positions }. Возвращает
 * `WidgetAvailabilityConfig` с полем `enabled` для каждого метода.
 * Оффер-фильтр применяется по `positions` из тела. Сумма берётся из GC
 * при заданных min/max настройках (кэш 60с). Стратегия — fail-closed:
 * если GC недоступен, метод с ценовым ограничением отключается.
 *
 * CORS-стратегия: simple-request, без OPTIONS-preflight (Content-Type: text/plain).
 * Проверка Origin/домена отключена: виджеты должны работать с любого сайта.
 *
 * `requireRealUser`/`requireInternalAccess` НЕ применяются сознательно —
 * userscript исполняется в браузере покупателя.
 */

import * as loggerLib from '../../lib/logger.lib'
import { getWidgetSettings } from '../../lib/widget/widgetSettings.lib'
import {
  areAllOffersAllowed,
  type WidgetAvailabilityConfig
} from '../../shared/widgetSettingsTypes'
import { resolveGcDealAmount } from '../../lib/gateway/gcDealResolver'
import { getCachedGcDealAmount, setCachedGcDealAmount } from '../../lib/gateway/gcDealCache'

const LOG_PATH = 'api/widgets/config'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseBody(req: app.Req): Record<string, unknown> | null {
  const raw = (req as unknown as { body?: unknown }).body
  if (isObject(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return isObject(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

function buildCorsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  }
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string>
) {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: extraHeaders
  }
}

export const widgetConfigRoute = app.post('/', async (ctx, req) => {
  let settings: Awaited<ReturnType<typeof getWidgetSettings>>
  try {
    settings = await getWidgetSettings(ctx)
  } catch (err) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] settings_error`,
      payload: { error: err instanceof Error ? err.message : String(err) }
    })
    return jsonResponse(500, { ok: false, error: 'WIDGET_CONFIG_ERROR' }, buildCorsHeaders())
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {
      lifepayEnabled: settings.lifepayEnabled,
      lavatopEnabled: settings.lavatopEnabled
    }
  })

  const body = parseBody(req)
  if (!body) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] body_invalid`,
      payload: { reason: 'parse_failed' }
    })
    return jsonResponse(400, { ok: false, error: 'WIDGET_BODY_INVALID' }, buildCorsHeaders())
  }

  // Разбор positions из тела запроса (сверка офферов — только по id)
  const positionsRaw = body.positions
  const positions: { id: string }[] = []
  if (Array.isArray(positionsRaw)) {
    for (const el of positionsRaw) {
      if (isObject(el)) {
        const id = typeof el.id === 'string' ? el.id : ''
        positions.push({ id })
      }
    }
  }

  // Пишется на КАЖДЫЙ запрос намеренно: сырьё запроса нужно видеть и когда
  // anyNeedsAmount=false (тогда виджет чаще всего скрывает именно оффер-фильтр).
  // severity 7 — при LogLevel=Info запись отсекается до Heap, шума в норме нет.
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] positions_parsed`,
    payload: { positionsCount: positions.length, positionIds: positions.map((p) => p.id) }
  })

  const dealIdRaw = body.dealId

  // Определяем, нужна ли сумма хотя бы для одного метода
  const lifepayNeedsAmount = settings.lifepayMin > 0 || settings.lifepayMax > 0
  const lavatopNeedsAmount = settings.lavatopMin > 0 || settings.lavatopMax > 0
  const anyNeedsAmount = lifepayNeedsAmount || lavatopNeedsAmount

  let resolvedAmount: number | null = null
  let gcFailed = false
  let cachedHit = false
  let dealIdNormalized: string | undefined

  if (anyNeedsAmount) {
    // Валидация dealId
    if (
      (typeof dealIdRaw !== 'string' && typeof dealIdRaw !== 'number') ||
      String(dealIdRaw).trim() === ''
    ) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] body_invalid`,
        payload: { reason: 'deal_id_type', dealIdRaw }
      })
      return jsonResponse(400, { ok: false, error: 'WIDGET_BODY_INVALID' }, buildCorsHeaders())
    }

    const dealIdNum = Number(String(dealIdRaw).trim())
    if (!Number.isInteger(dealIdNum) || dealIdNum <= 0) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] body_invalid`,
        payload: { reason: 'deal_id_not_integer', dealIdRaw }
      })
      return jsonResponse(400, { ok: false, error: 'WIDGET_BODY_INVALID' }, buildCorsHeaders())
    }

    dealIdNormalized = String(dealIdNum)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] amount_resolve_start`,
      payload: { dealId: dealIdNormalized, lifepayNeedsAmount, lavatopNeedsAmount }
    })

    const cached = await getCachedGcDealAmount(ctx, dealIdNormalized)
    if (cached !== null) {
      resolvedAmount = cached
      cachedHit = true
    } else {
      const res = await resolveGcDealAmount(ctx, dealIdNum)
      if (res.ok) {
        resolvedAmount = res.amountRub
        await setCachedGcDealAmount(ctx, dealIdNormalized, res.amountRub)
      } else {
        gcFailed = true
      }
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] amount_resolved`,
      payload: { dealId: dealIdNormalized, resolvedAmount, cachedHit, gcFailed }
    })
  }

  // Вычисление enabled для LifePay
  const lifepayOfferOk = areAllOffersAllowed(
    positions,
    settings.lifepayOffers,
    settings.lifepayOfferListType
  )
  let lifepayAmountOk: boolean
  if (!lifepayNeedsAmount) {
    lifepayAmountOk = true
  } else if (resolvedAmount === null) {
    // fail-closed: GC упал или не запрошен
    lifepayAmountOk = false
  } else {
    lifepayAmountOk =
      !(settings.lifepayMin > 0 && resolvedAmount < settings.lifepayMin) &&
      !(settings.lifepayMax > 0 && resolvedAmount > settings.lifepayMax)
  }
  const lifepayEnabled = settings.lifepayEnabled && lifepayOfferOk && lifepayAmountOk

  // Вычисление enabled для Lava.Top
  const lavatopOfferOk = areAllOffersAllowed(
    positions,
    settings.lavatopOffers,
    settings.lavatopOfferListType
  )
  let lavatopAmountOk: boolean
  if (!lavatopNeedsAmount) {
    lavatopAmountOk = true
  } else if (resolvedAmount === null) {
    lavatopAmountOk = false
  } else {
    lavatopAmountOk =
      !(settings.lavatopMin > 0 && resolvedAmount < settings.lavatopMin) &&
      !(settings.lavatopMax > 0 && resolvedAmount > settings.lavatopMax)
  }
  const lavatopEnabled = settings.lavatopEnabled && lavatopOfferOk && lavatopAmountOk

  // Процесс принятия решения по обоим методам — входы и результат. Пишется
  // всегда (в т.ч. anyNeedsAmount=false: dealId/resolvedAmount тогда пустые —
  // это штатно и показывает, что решение принято без обращения к GC).
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] decision`,
    payload: {
      dealId: dealIdNormalized,
      resolvedAmount,
      lifepay: {
        enabledSetting: settings.lifepayEnabled,
        needsAmount: lifepayNeedsAmount,
        min: settings.lifepayMin,
        max: settings.lifepayMax,
        offerListType: settings.lifepayOfferListType,
        offersCount: settings.lifepayOffers.length,
        offerOk: lifepayOfferOk,
        amountOk: lifepayAmountOk,
        enabled: lifepayEnabled
      },
      lavatop: {
        enabledSetting: settings.lavatopEnabled,
        needsAmount: lavatopNeedsAmount,
        min: settings.lavatopMin,
        max: settings.lavatopMax,
        offerListType: settings.lavatopOfferListType,
        offersCount: settings.lavatopOffers.length,
        offerOk: lavatopOfferOk,
        amountOk: lavatopAmountOk,
        enabled: lavatopEnabled
      }
    }
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] success`,
    payload: {
      anyNeedsAmount,
      cachedHit,
      gcFailed,
      dealId: dealIdNormalized,
      lifepayEnabled,
      lavatopEnabled,
      positionsCount: positions.length,
      lifepayOfferOk,
      lifepayAmountOk,
      lavatopOfferOk,
      lavatopAmountOk
    }
  })

  const config: WidgetAvailabilityConfig = {
    lifepay: { enabled: lifepayEnabled },
    lavatop: { enabled: lavatopEnabled }
  }

  return jsonResponse(200, { ok: true, config }, buildCorsHeaders())
})

export default widgetConfigRoute
