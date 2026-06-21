import * as loggerLib from '../../../../lib/logger.lib'
import * as settingsLib from '../../../../lib/settings.lib'
import * as webhookService from '../../../../lib/lava-webhook.service'
import type { LavaWebhookPayload } from '../../../../lib/lava-types'
import { normalizeStringRecord } from '../../../../lib/normalize-string-record.lib'

const LOG_PATH = 'api/integrations/lava/webhook'

/** Валюта тела webhook (согласовано с `lib/lava-types`). */
enum LavaCurrencyEnum {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR'
}

/** Значения `eventType` из контракта Lava. */
enum LavaWebhookEventTypeEnum {
  PaymentSuccess = 'payment.success',
  PaymentFailed = 'payment.failed',
  SubRecurringSuccess = 'subscription.recurring.payment.success',
  SubRecurringFailed = 'subscription.recurring.payment.failed',
  SubCancelled = 'subscription.cancelled'
}

/** Значения `status` контракта в webhook Lava. */
enum LavaContractStatusEnum {
  New = 'new',
  InProgress = 'in-progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  SubActive = 'subscription-active',
  SubExpired = 'subscription-expired',
  SubCancelled = 'subscription-cancelled',
  SubFailed = 'subscription-failed'
}

function extractApiKey(req: app.Req): string {
  const headers = req.headers as Record<string, string | string[] | undefined>
  const raw = headers['x-api-key'] ?? headers['X-Api-Key']
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * GET …/api/integrations/lava/webhook — проверка доступности (браузер, curl): эндпоинт развёрнут и ожидает POST от Lava.
 * Секрет в ответе не передаётся; только флаг, задан ли `lava_webhook_secret` в Heap.
 */
export const lavaWebhookInfoRoute = app.get('/', async (ctx, _req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] GET: проверка доступности`,
    payload: {}
  })
  const secretTrimmed = (await settingsLib.getLavaWebhookSecret(ctx)).trim()
  return {
    ok: true,
    status: 'ready',
    message:
      'Эндпоинт активен. Рабочие уведомления от Lava — только POST с JSON-телом (PurchaseWebhookLog) и заголовком X-Api-Key, совпадающим с настройкой lava_webhook_secret в Heap.',
    expectedMethod: 'POST',
    webhookSecretConfigured: secretTrimmed.length > 0
  }
})

/**
 * POST …/api/integrations/lava/webhook — приём webhook от Lava (PurchaseWebhookLog).
 * Auth: заголовок `X-Api-Key` = настройка `lava_webhook_secret`.
 */
export const lavaWebhookRoute = app
  .body((s) => ({
    eventType: s.enum(LavaWebhookEventTypeEnum),
    product: s.optional(s.object({ id: s.string(), title: s.string() })),
    contractId: s.string(),
    parentContractId: s.optional(s.string()),
    buyer: s.optional(s.object({ email: s.string() })),
    amount: s.number(),
    currency: s.enum(LavaCurrencyEnum),
    status: s.enum(LavaContractStatusEnum),
    timestamp: s.string(),
    /** Не `s.record(…)` — в UGC падает restrictModifiers; нормализация в `normalizeStringRecord`. */
    clientUtm: s.optional(s.unknown()),
    errorMessage: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Вход`,
      payload: {
        eventType: req.body.eventType,
        contractId: req.body.contractId,
        status: req.body.status
      }
    })

    const apiKey = extractApiKey(req)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Заголовок X-Api-Key`,
      payload: { hasApiKey: Boolean(apiKey) }
    })

    const payload: LavaWebhookPayload = {
      ...(req.body as LavaWebhookPayload),
      clientUtm: normalizeStringRecord(req.body.clientUtm)
    }

    const result = await webhookService.processWebhook(ctx, payload, apiKey)

    if ('statusCode' in result) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] Отказ: неверный или отсутствующий X-Api-Key`,
        payload: {}
      })
      return ctx.resp.json({ success: false }, result.statusCode)
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Обработано`,
      payload: { duplicate: result.duplicate === true }
    })
    return { success: true }
  })
