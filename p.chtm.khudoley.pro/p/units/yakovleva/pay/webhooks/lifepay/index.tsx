/**
 * POST /webhooks/lifepay?token=... — приёмник webhook LifePay
 * (implementation-plan §1.8.3; контракт — knowledge/lifepay/webhooks §1).
 *
 * Анонимный роут (LifePay не аутентифицируется ролью Chatium). Аутентификация —
 * только токен в query (точное равенство строк со значением `lp_webhook_token`
 * в Heap). MD5-подпись webhook **не** проверяется: LifePay её не публикует.
 *
 * Поведение:
 *   - токен не настроен → 503 без тела, без записи в webhook_log;
 *   - токен отсутствует в query → 401 без тела, без записи;
 *   - токен не совпадает → 403 без тела, без записи (значение токена в логи не попадает);
 *   - токен валиден, но нет связки с нашим createBill → 200 OK без записи
 *     (legacy-strict guard, см. §1a ниже): отклоняем вебхуки без `correlationId`
 *     в query либо без записи `createBill` в request_log по этому `correlationId`.
 *     Так обрабатываются только заказы, созданные через нашу панель;
 *   - токен валиден + связка найдена → чтение тела, запись в webhook_log +
 *     дедупликация по `number` через webhook_idempotency, возврат 200 OK.
 *
 * Формат тела LifePay (подтверждён живым webhook 2026-05-20):
 * `multipart/form-data` с единственным текстовым полем `data` — JSON-строка
 * транзакции (`number`, `type`, `status`, `method`, `amount`, `order.number`, …).
 *
 * Чтение тела — канонический `req.formData()` (Chatium native multipart с патча
 * 18-05-2026, см. knowledge/chatium/multipart-form-data). Порядок источников:
 *   1. `req.formData()` → поле `data` (основной путь LifePay-multipart);
 *   2. `req.body` → `unwrapWebhookBody` (если прислан `application/json` /
 *      `x-www-form-urlencoded`, в т.ч. `{data:"<json>"}`);
 *   3. сырое тело строкой (`req.rawBody`/`req.rawHttpBody`) →
 *      `extractDataFromRawMultipart` (защитный фоллбэк, если `formData()` недоступен).
 * Выбранный источник и стратегия пишутся в лог `webhook_payload_parsed`.
 *
 * Ретраи LifePay: при не-200 ответе LifePay повторяет webhook (1/3/5/10 мин, далее
 * раз в час, всего ≤ 10 попыток). Поэтому при любой внутренней ошибке отвечаем
 * 200 OK — дедупликация по `number` защищает от двойного учёта.
 *
 * Бизнес-действие (обновление заказа в GetCourse) — только при `type='payment'`
 * + `status='success'` (см. `isSuccessfulPayment`). Downstream-вызов `createDeal`
 * реализован: при успешной оплате помечает заказ GC настроенным статусом и
 * управляемым `deal_is_paid`. Ответ на webhook не зависит от результата downstream-вызова.
 */

import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'
import * as requestLogRepo from '../../repos/requestLog.repo'
import * as webhookLogRepo from '../../repos/webhookLog.repo'
import * as webhookIdempRepo from '../../repos/webhookIdempotency.repo'
import {
  checkWebhookToken,
  parseWebhookBody,
  unwrapWebhookBody,
  readWebhookDataField,
  extractDataFromRawMultipart,
  isSuccessfulPayment,
  type FormDataLike
} from '../../lib/webhook/processWebhook'
import { updateGcDealOnPayment } from '../../lib/webhook/gcDealUpdate'
import { resolveGcDeal } from '../../lib/gateway/gcDealResolver'
import { lookupDealResolve } from '../../lib/gateway/dealResolveCache'
import { prepareRawLog } from '../../shared/prepareRawLog'
import { extractCorrelationId } from '../../shared/correlation'
import { paymentSocketChannel } from '../../shared/paymentSocket'
import { sendDataToSocket } from '@app/socket'

const LOG_PATH = 'webhooks/lifepay'

function emptyResponse(statusCode: number) {
  return { statusCode, rawHttpBody: '', headers: { 'Content-Type': 'text/plain' } }
}

function tryJsonParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}

export const webhookRoute = app.post('/', async (ctx, req) => {
  // Зафиксировать факт вызова без значения токена и тела (минимизация утечки).
  const queryRaw = (req as unknown as { query?: unknown }).query
  const queryObj =
    typeof queryRaw === 'object' && queryRaw !== null ? (queryRaw as Record<string, unknown>) : {}
  const tokenFromQuery = typeof queryObj.token === 'string' ? queryObj.token : null
  // correlationId из query callbackUrl — ключ связки с request_log (см. shared/correlation).
  // Пусто, если счёт создан не через нашу панель или это старый callbackUrl.
  const correlationId = extractCorrelationId(queryObj)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] webhook_init`,
    payload: { hasToken: !!tokenFromQuery, tokenLength: tokenFromQuery ? tokenFromQuery.length : 0 }
  })

  // --- 1. Аутентификация токеном из query (до чтения тела) ---
  const tokenFromSettings = await settingsLib.getLpWebhookToken(ctx)
  const tokenCheck = checkWebhookToken(tokenFromQuery, tokenFromSettings)

  if (tokenCheck !== 'valid') {
    const statusByCheck = { not_configured: 503, missing: 401, mismatch: 403 } as const
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] token_${tokenCheck}`,
      payload: { tokenLength: tokenFromQuery ? tokenFromQuery.length : 0 }
    })
    return emptyResponse(statusByCheck[tokenCheck])
  }

  // --- 1a. Guard correlationId: отклонять вебхуки без связки с createBill (legacy-strict) ---
  if (!correlationId) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] webhook_rejected`,
      payload: { reason: 'correlationId_missing' }
    })
    return { statusCode: 200, rawHttpBody: 'OK', headers: { 'Content-Type': 'text/plain' } }
  }

  let createBillCount = 0
  try {
    createBillCount = await requestLogRepo.countCreateBillByCorrelationId(ctx, correlationId)
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      // severity 2: сбой lookup при строгой политике = терминальная потеря
      // легитимного вебхука (LifePay не ретраит вечно) — нужен алертинг.
      severity: 2,
      message: `[${LOG_PATH}] createbill_lookup_failed`,
      payload: { correlationId, error: String(e) }
    })
    // При сбое БД трактуем как отказ (строгая политика guard'а: лучше потерять
    // легитимный вебхук, чем принять мошеннический при недоступной проверке).
    createBillCount = 0
  }

  if (createBillCount === 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] webhook_rejected`,
      payload: { reason: 'correlationId_not_found', correlationId }
    })
    return { statusCode: 200, rawHttpBody: 'OK', headers: { 'Content-Type': 'text/plain' } }
  }

  // --- 2. Чтение тела: formData() → body → сырое multipart ---
  const reqAny = req as unknown as {
    body?: unknown
    headers?: Record<string, unknown> | unknown
    rawBody?: unknown
    rawHttpBody?: unknown
    formData?: () => Promise<unknown>
  }
  const headersRaw = reqAny.headers
  const headers =
    typeof headersRaw === 'object' && headersRaw !== null
      ? (headersRaw as Record<string, unknown>)
      : {}
  const contentTypeRaw = headers['content-type'] ?? headers['Content-Type']
  const contentType = typeof contentTypeRaw === 'string' ? contentTypeRaw.toLowerCase() : ''

  let payload: unknown = null
  let source = 'none'
  let strategy = 'empty'

  // 2.1. Канонический путь — req.formData(), поле `data` (JSON-строка транзакции).
  let dataStr: string | null = null
  if (typeof reqAny.formData === 'function') {
    try {
      const form = (await reqAny.formData()) as FormDataLike
      dataStr = await readWebhookDataField(form, 'data')
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] formdata_unavailable`,
        payload: { error: String(e) }
      })
    }
  }

  if (dataStr !== null) {
    source = 'formData'
    const inner = tryJsonParse(dataStr)
    if (inner && typeof inner === 'object') {
      payload = inner
      strategy = 'formdata_data_json'
    } else {
      const u = unwrapWebhookBody(dataStr, contentType)
      payload = u.payload
      strategy = `formdata_${u.strategy}`
    }
  } else {
    // 2.2. Фоллбэк — req.body (application/json или x-www-form-urlencoded, в т.ч. {data:"<json>"}).
    const body = reqAny.body
    const bodyIsEmptyObject =
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      Object.keys(body as Record<string, unknown>).length === 0
    if (body !== undefined && body !== null && typeof body !== 'function' && !bodyIsEmptyObject) {
      const u = unwrapWebhookBody(body, contentType)
      payload = u.payload
      source = 'body'
      strategy = `body_${u.strategy}`
    } else {
      // 2.3. Последний рубеж — сырое multipart-тело строкой.
      const rawText =
        typeof reqAny.rawBody === 'string'
          ? reqAny.rawBody
          : typeof reqAny.rawHttpBody === 'string'
            ? reqAny.rawHttpBody
            : null
      if (rawText) {
        const fromRaw = extractDataFromRawMultipart(rawText, 'data')
        if (fromRaw) {
          const inner = tryJsonParse(fromRaw)
          payload =
            inner && typeof inner === 'object'
              ? inner
              : unwrapWebhookBody(fromRaw, contentType).payload
          source = 'raw_multipart'
          strategy = 'raw_multipart_data'
        } else {
          const u = unwrapWebhookBody(rawText, contentType)
          payload = u.payload
          source = 'raw'
          strategy = `raw_${u.strategy}`
        }
      }
    }
  }

  const parsed = parseWebhookBody(payload)

  // rawBody для журнала: развёрнутый payload (JSON-объект) либо marker для не-JSON.
  const rawBodyForLog =
    payload && typeof payload === 'object'
      ? prepareRawLog(payload)
      : { __noJsonPayload: true, __contentType: contentType, __source: source }
  const rawQueryForLog = prepareRawLog(queryObj)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] webhook_payload_parsed`,
    payload: {
      source,
      strategy,
      contentType,
      number: parsed.number,
      type: parsed.type,
      status: parsed.status,
      method: parsed.method,
      orderNumber: parsed.orderNumber,
      correlationId: correlationId || null
    }
  })

  // --- 3. Дедупликация по number (если есть) ---
  let dedupeResult: 'first' | 'duplicate' | 'no_number' = 'no_number'
  if (parsed.number) {
    try {
      dedupeResult = await webhookIdempRepo.tryRegister(ctx, parsed.number, Date.now())
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] idempotency_lookup_failed`,
        payload: { number: parsed.number, error: String(e) }
      })
      dedupeResult = 'no_number'
    }
  }

  // --- 4. Запись в журнал (не валит ответ — LifePay должен получить 200) ---
  try {
    await webhookLogRepo.create(ctx, {
      number: parsed.number,
      gatewayId: 'lifepay',
      type: parsed.type,
      status: parsed.status,
      method: parsed.method,
      amount: parsed.amount,
      orderNumber: parsed.orderNumber,
      correlationId,
      tokenValid: true,
      duplicate: dedupeResult === 'duplicate',
      processedAt: Date.now(),
      email: parsed.email,
      rawBody: rawBodyForLog,
      rawQuery: rawQueryForLog
    })
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] webhook_log_create_failed`,
      payload: { number: parsed.number, error: String(e) }
    })
  }

  // --- 5. Бизнес-исход (downstream-обновление заказа — MVP §2.8; здесь только журнал) ---
  const successfulPayment = isSuccessfulPayment(parsed)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] webhook_done`,
    payload: {
      number: parsed.number,
      dedupeResult,
      successfulPayment,
      // помечаем заказы, готовые к обновлению в GetCourse (для будущего §2.8)
      eligibleForOrderUpdate:
        successfulPayment && dedupeResult !== 'duplicate' && !!parsed.orderNumber
    }
  })

  // --- 5a. Downstream-вызов GC createDeal (только при первом успешном платеже) ---
  // Весь блок обёрнут в try/catch (как шаги 3/4/6): downstream и его внутреннее
  // логирование не должны сорвать путь к socket-публикации (шаг 6) и финальному 200.
  // updateGcDealOnPayment сама не бросает, но writeServerLog делает Heap/socket-await,
  // который теоретически может бросить — инвариант «webhook всегда 200» держим явно.
  try {
    if (!successfulPayment) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] gc_deal_update_skipped`,
        payload: {
          reason: 'not_successful_payment',
          dedupeResult,
          hasEmail: !!parsed.email,
          orderNumber: parsed.orderNumber
        }
      })
    } else if (dedupeResult !== 'first') {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] gc_deal_update_skipped`,
        payload: { reason: 'not_first', dedupeResult, number: parsed.number }
      })
    } else if (!correlationId) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] gc_deal_update_skipped`,
        payload: { reason: 'correlationId_missing' }
      })
    } else {
      // Получаем dealNumber / email / amount: сначала из персистентного кэша (request_log),
      // fallback — через resolveGcDeal (только при числовом correlationId).
      let dealNumber = ''
      let email = ''
      let amount = ''

      const persisted = await lookupDealResolve(ctx, correlationId)
      if (persisted.ok) {
        dealNumber = persisted.dealNumber
        email = persisted.email
        amount = persisted.amount
        await loggerLib.writeServerLog(ctx, {
          severity: 6,
          message: `[${LOG_PATH}] gc_deal_update_persist_hit`,
          payload: { correlationId, dealNumber }
        })
      } else if (!/^\d+$/.test(correlationId)) {
        // correlationId нечисловой — resolveGcDeal не принимает, персиста нет → skip
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] gc_deal_update_skipped`,
          payload: { reason: 'non_numeric_correlationId_no_persist', correlationId }
        })
      } else {
        // Fallback: вызов resolveGcDeal
        const resolved = await resolveGcDeal(ctx, correlationId, correlationId)
        if (!resolved.ok) {
          const alreadyPaid = resolved.code === 'WIDGET_GC_ALREADY_PAID'
          await loggerLib.writeServerLog(ctx, {
            severity: alreadyPaid ? 6 : 4,
            message: `[${LOG_PATH}] gc_deal_update_skipped`,
            payload: {
              reason: alreadyPaid ? 'already_paid' : 'gc_resolve_failed',
              code: resolved.code,
              correlationId
            }
          })
        } else {
          dealNumber = resolved.dealNumber
          email = resolved.email
          amount = String(resolved.amount)
          await loggerLib.writeServerLog(ctx, {
            severity: 6,
            message: `[${LOG_PATH}] gc_deal_update_persist_miss_fallback`,
            payload: { correlationId, dealNumber }
          })
        }
      }

      // Fail-closed: не вызываем createDeal без dealNumber или email.
      // severity 3 (не 4): мы внутри ветки успешной первой оплаты — отсутствие
      // данных здесь означает тихое расхождение «оплата прошла, GC-сделка НЕ
      // помечена оплаченной», которое должно попадать в алертинг.
      if (!dealNumber) {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_PATH}] gc_deal_update_skipped`,
          payload: { reason: 'deal_number_missing', correlationId }
        })
      } else if (!email) {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_PATH}] gc_deal_update_skipped`,
          payload: { reason: 'email_missing', correlationId }
        })
      } else {
        const gcCreatePayment = await settingsLib.getGcCreatePayment(ctx)
        const gcDealStatus = await settingsLib.getGcDealStatus(ctx)
        await loggerLib.writeServerLog(ctx, {
          severity: 6,
          message: `[${LOG_PATH}] gc_deal_update_start`,
          payload: {
            correlationId,
            dealNumber,
            createPayment: gcCreatePayment,
            dealStatus: gcDealStatus
          }
        })
        await updateGcDealOnPayment(ctx, {
          orderNumber: correlationId,
          dealNumber,
          email,
          amount,
          correlationId,
          createPayment: gcCreatePayment,
          dealStatus: gcDealStatus
        })
      }
    }
  } catch (e) {
    // Последний рубеж: не валим 200-ответ из-за сбоя downstream/логирования.
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] gc_deal_update_block_failed`,
        payload: { number: parsed.number, error: String(e) }
      })
    } catch {
      // если и логирование недоступно — глушим, ответ 200 важнее
    }
  }

  // --- 6. Публикация в socket-канал уведомлений об оплате (если есть correlationId) ---
  // Магазинный JS подписывается на канал `payment-<correlationId>` через
  // `POST /api/gateways/payment-socket` и обновляет страницу / делает редирект на «спасибо».
  // Публикуем только при `dedupeResult === 'first'` — при `'duplicate'` событие уже
  // отправлено, при `'no_number'` (нет number в payload или сбой idempotency-lookup —
  // см. catch выше) LifePay будет ретраить webhook до 10 раз; публикация в каждом из
  // этих случаев приведёт к многократному обновлению страницы у клиента.
  const channel = paymentSocketChannel(correlationId)
  if (channel && dedupeResult === 'first') {
    try {
      await sendDataToSocket(ctx, channel, {
        type: 'payment',
        data: {
          gatewayId: 'lifepay',
          correlationId,
          status: parsed.status || '',
          eventType: parsed.type || '',
          externalId: parsed.number || '',
          orderNumber: parsed.orderNumber || '',
          amount: parsed.amount || '',
          timestamp: Date.now()
        }
      })
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] socket_publish_failed`,
        payload: { channel, error: String(e) }
      })
    }
  }

  return { statusCode: 200, rawHttpBody: 'OK', headers: { 'Content-Type': 'text/plain' } }
})

export default webhookRoute
