/**
 * Сервис webhook-relay: приём вебхуков Lava.Top, дедупликация, маппинг на клиентский callback
 * и форвард (best-effort). Эталон логики — `lava_gc_integration/lib/lava-webhook.service.ts`,
 * расширен проксированием на клиентский адрес из `lavatopWebhookMapping`.
 *
 * Политика ответа эндпоинта (см. решение plan-reviewer):
 *   - неверный/отсутствующий секрет → 401 (Lava.Top повторит);
 *   - `lava_webhook_secret` не задан → 500 (конфигурация неполная), НЕ 401;
 *   - `contractId` не найден в маппинге → событие сохраняется (`contract_not_found`), ответ 2xx
 *     (НЕ 4xx — иначе Lava.Top зря крутит до 19 ретраев); повторный вебхук обрабатывается заново;
 *   - ошибка форварда (timeout/5xx клиента) → пишется в событие, ответ Lava.Top всё равно 2xx.
 *
 * Вся цепочка find→create→mapping→forward выполняется внутри одного `runWithExclusiveLock`
 * по `dedupe_key` — гонки параллельных вебхуков и двойной форвард закрыты.
 */

import { runWithExclusiveLock } from '@app/sync'
import { request } from '@app/request'
import * as loggerLib from '../logger.lib'
import * as settingsLib from '../settings.lib'
import * as webhookEventRepo from '../../repos/lavatopWebhookEvent.repo'
import * as webhookMappingRepo from '../../repos/lavatopWebhookMapping.repo'
import type { LavaWebhookPayload } from '../gateway/lavaTypes'
import { GW_FORWARD_TIMEOUT_MS } from '../gateway/constants'

const LOG_MODULE = 'lib/webhook/webhookRelay.service'

export type WebhookAuth = { apiKey: string; authorization: string }

export type ProcessWebhookResult =
  | { kind: 'ok'; duplicate?: boolean; forwarded?: boolean; contractNotFound?: boolean }
  | { kind: 'unauthorized'; statusCode: 401 }
  | { kind: 'config_error'; statusCode: 500 }

export function buildDedupeKey(payload: LavaWebhookPayload): string {
  return `${payload.eventType}:${payload.contractId}:${payload.status ?? 'na'}`
}

/** Ручное base64-декодирование (Buffer/atob недоступны — inner/docs/047-base64.md). ASCII-секреты. */
function decodeBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '')
  let output = ''
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = chars.indexOf(clean.charAt(i))
    const e2 = chars.indexOf(clean.charAt(i + 1))
    const e3 = clean.charAt(i + 2) === '' ? 64 : chars.indexOf(clean.charAt(i + 2))
    const e4 = clean.charAt(i + 3) === '' ? 64 : chars.indexOf(clean.charAt(i + 3))
    if (e1 < 0 || e2 < 0) break
    output += String.fromCharCode((e1 << 2) | (e2 >> 4))
    if (e3 !== 64 && e3 >= 0) output += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2))
    if (e4 !== 64 && e4 >= 0 && e3 >= 0) output += String.fromCharCode(((e3 & 3) << 6) | e4)
  }
  return output
}

/**
 * Проверка авторизации входящего вебхука по `lava_webhook_secret`:
 *   - `X-Api-Key: <secret>` (основной путь, как у lava_gc_integration);
 *   - `Authorization: Basic base64(...)` — секрет как user, pass или весь decoded (дополнительно).
 */
function checkWebhookAuth(auth: WebhookAuth, secret: string): boolean {
  if (auth.apiKey && auth.apiKey === secret) return true
  const m = /^Basic\s+(.+)$/i.exec((auth.authorization ?? '').trim())
  if (m && m[1]) {
    const decoded = decodeBase64(m[1])
    if (decoded === secret) return true
    const idx = decoded.indexOf(':')
    if (idx >= 0) {
      const user = decoded.slice(0, idx)
      const pass = decoded.slice(idx + 1)
      if (user === secret || pass === secret) return true
    }
  }
  return false
}

type ForwardResult = { statusCode: number; error: string }

/**
 * Форвард payload на клиентский callback (best-effort, без серверных ретраев).
 * URL передаётся целиком (с исходными query-параметрами клиента) — без `searchParams`.
 */
async function forwardToCallback(
  ctx: app.Ctx,
  callbackUrl: string,
  payload: LavaWebhookPayload
): Promise<ForwardResult> {
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: '[webhook] forwardToCallback call',
      payload: {
        callbackUrl: callbackUrl.split('?')[0],
        eventType: payload.eventType
      }
    })
    const response = await request({
      url: callbackUrl,
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      json: payload as unknown as Record<string, unknown>,
      responseType: 'text',
      throwHttpErrors: false,
      timeout: GW_FORWARD_TIMEOUT_MS
    })
    return { statusCode: response.statusCode ?? 0, error: '' }
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] forwardToCallback: исключение`,
      payload: { error: String(e) }
    })
    return { statusCode: 0, error: String(e).slice(0, 400) }
  }
}

/**
 * Обработка входящего вебхука Lava.Top: авторизация → дедупликация → маппинг → форвард.
 */
export async function processWebhook(
  ctx: app.Ctx,
  payload: LavaWebhookPayload,
  auth: WebhookAuth
): Promise<ProcessWebhookResult> {
  const secret = (await settingsLib.getLavaWebhookSecret(ctx)).trim()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: '[webhook] processWebhook start',
    payload: {
      eventType: payload.eventType,
      contractId: payload.contractId,
      hasEmail: typeof payload.buyer?.email === 'string',
      hasPhone: false
    }
  })
  if (!secret) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] processWebhook: lava_webhook_secret не задан (config_error)`,
      payload: {}
    })
    return { kind: 'config_error', statusCode: 500 }
  }

  if (!checkWebhookAuth(auth, secret)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] processWebhook: авторизация не пройдена`,
      payload: { hasApiKey: Boolean(auth.apiKey), hasAuthorization: Boolean(auth.authorization) }
    })
    return { kind: 'unauthorized', statusCode: 401 }
  }

  const dedupeKey = buildDedupeKey(payload)

  return runWithExclusiveLock(
    ctx,
    `lavatop_webhook:${dedupeKey}`,
    async (lockCtx: app.Ctx): Promise<ProcessWebhookResult> => {
      const existing = await webhookEventRepo.findByDedupeKey(lockCtx, dedupeKey)

      // Дубликат: уже обработан и это не «contract_not_found» (который допускает повторную обработку).
      if (existing && existing.processed && existing.processing_error !== 'contract_not_found') {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 6,
          message: `[${LOG_MODULE}] processWebhook: дубликат, пропуск`,
          payload: { dedupeKey }
        })
        return { kind: 'ok', duplicate: true }
      }

      const event =
        existing ??
        (await webhookEventRepo.create(lockCtx, {
          event_type: payload.eventType,
          lava_contract_id: payload.contractId,
          payload_json: JSON.stringify(payload),
          dedupe_key: dedupeKey,
          processed: false,
          processed_at: 0,
          processing_error: '',
          forward_url: '',
          forward_status_code: 0,
          forward_error: '',
          created_at: Date.now()
        }))

      // Поиск маппинга: по contractId, для рекуррентных — fallback по parentContractId.
      let mapping = await webhookMappingRepo.findByContractId(lockCtx, payload.contractId)
      if (!mapping && payload.parentContractId) {
        mapping = await webhookMappingRepo.findByContractId(lockCtx, payload.parentContractId)
      }

      if (!mapping) {
        // contractId не найден: сохраняем событие, отвечаем 2xx (не плодим ретраи Lava.Top).
        await loggerLib.writeServerLog(lockCtx, {
          severity: 4,
          message: `[${LOG_MODULE}] processWebhook: маппинг не найден (contract_not_found)`,
          payload: { contractId: payload.contractId, dedupeKey }
        })
        await webhookEventRepo.markProcessed(lockCtx, event.id, 'contract_not_found')
        return { kind: 'ok', contractNotFound: true }
      }

      // Форвард payload на клиентский callback (best-effort).
      const forward = await forwardToCallback(lockCtx, mapping.callback_url, payload)
      await webhookEventRepo.updateForwardResult(
        lockCtx,
        event.id,
        mapping.callback_url,
        forward.statusCode,
        forward.error
      )
      const forwardOk = !forward.error && forward.statusCode >= 200 && forward.statusCode <= 299
      await webhookEventRepo.markProcessed(
        lockCtx,
        event.id,
        forwardOk
          ? ''
          : `forward_failed:${forward.statusCode}${forward.error ? `:${forward.error}` : ''}`
      )

      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] processWebhook: форвард завершён`,
        payload: {
          dedupeKey,
          contractId: payload.contractId,
          forwardStatus: forward.statusCode,
          forwardOk
        }
      })
      return { kind: 'ok', forwarded: true }
    }
  )
}

export type ReforwardResult = {
  success: boolean
  statusCode?: number
  error?: string
}

/**
 * Повторный форвард одного события по `id` (кнопка «Переслать повторно» в панели).
 * Берёт маппинг по `lava_contract_id` события, форвардит сохранённый payload, обновляет результат.
 */
export async function reforwardEvent(ctx: app.Ctx, eventId: string): Promise<ReforwardResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: '[webhook] reforwardEvent start',
    payload: { eventId }
  })
  // Лок по eventId: два одновременных «Переслать повторно» по одной записи не дадут двойной форвард.
  return runWithExclusiveLock(
    ctx,
    `lavatop_webhook_reforward:${eventId}`,
    async (lockCtx: app.Ctx): Promise<ReforwardResult> => {
      const event = await webhookEventRepo.findById(lockCtx, eventId)
      if (!event) {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 4,
          message: '[webhook] reforwardEvent warn: event_not_found',
          payload: { eventId }
        })
        return { success: false, error: 'event_not_found' }
      }
      const mapping = await webhookMappingRepo.findByContractId(lockCtx, event.lava_contract_id)
      if (!mapping) {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 4,
          message: '[webhook] reforwardEvent warn: mapping_not_found',
          payload: { eventId }
        })
        return { success: false, error: 'mapping_not_found' }
      }

      let payload: LavaWebhookPayload
      try {
        payload = JSON.parse(event.payload_json) as LavaWebhookPayload
      } catch (e) {
        try {
          await loggerLib.writeServerLog(lockCtx, {
            severity: 3,
            message: '[webhook] reforwardEvent error: payload_parse_error',
            payload: { eventId, error: String(e) }
          })
        } catch {
          // глотаем
        }
        return { success: false, error: 'payload_parse_error' }
      }

      const forward = await forwardToCallback(lockCtx, mapping.callback_url, payload)
      await webhookEventRepo.updateForwardResult(
        lockCtx,
        eventId,
        mapping.callback_url,
        forward.statusCode,
        forward.error
      )
      const ok = !forward.error && forward.statusCode >= 200 && forward.statusCode <= 299
      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] reforwardEvent`,
        payload: { eventId, forwardStatus: forward.statusCode, ok }
      })
      return { success: ok, statusCode: forward.statusCode, error: forward.error || undefined }
    }
  )
}
