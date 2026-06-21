/**
 * POST /v1/createInvoice (контур invoices_v1) → `POST /api/v3/invoice` Lava.Top.
 *
 * Обязательный заголовок: `X-Lava-Apikey` (проксируется как `X-Api-Key`). Тело — args операции.
 * Опциональный `callbackUrl` НЕ уходит в Lava.Top: после успешного создания счёта gateway
 * сохраняет маппинг `contractId → callbackUrl` (`lavatopWebhookMapping`) для проксирования вебхуков.
 *
 * Один входящий → один исходящий вызов к Lava.Top; серверные ретраи запрещены.
 */

import * as loggerLib from '../../lib/logger.lib'
import * as settingsLib from '../../lib/settings.lib'
import { handleV1Op } from '../../lib/gateway/handleV1Op'
import {
  buildCreateInvoiceBody,
  redactCreateInvoiceBodyForLog,
  isSafeForwardUrl
} from '../../lib/gateway/buildCreateInvoiceBody'
import type { CreateInvoiceArgs } from '../../lib/gateway/buildCreateInvoiceBody'
import { lavaTopPostJson } from '../../lib/gateway/lavaTopClient'
import {
  classifyCreateInvoiceResponse,
  extractCreateInvoiceSuccess
} from '../../lib/gateway/invoicesV1Semantic'
import * as webhookMappingRepo from '../../repos/lavatopWebhookMapping.repo'

const LOG_PATH = 'api/v1/createInvoice'

export const createInvoiceRoute = app.post('/', async (ctx, req) => {
  return handleV1Op<CreateInvoiceArgs>(
    ctx,
    req,
    'createInvoice',
    async (handlerCtx, { requestId, credentials, args }) => {
      // SSRF-защита: если передан callbackUrl, он должен указывать на публичный http(s)-хост.
      // Проверяем ДО создания счёта, чтобы не плодить контракты с нерабочим/опасным callback.
      const callbackUrlRaw = typeof args.callbackUrl === 'string' ? args.callbackUrl.trim() : ''
      if (callbackUrlRaw && !isSafeForwardUrl(callbackUrlRaw)) {
        await loggerLib.writeServerLog(handlerCtx, {
          severity: 4,
          message: `[${LOG_PATH}] unsafe_callback_url`,
          payload: { requestId }
        })
        return {
          kind: 'gateway_error',
          code: 'INVOKE_ARGS_SCHEMA_VIOLATION',
          details: {
            errors: [
              {
                path: 'callbackUrl',
                message:
                  'callbackUrl должен быть публичным http(s)-URL (localhost, приватные и link-local адреса запрещены)'
              }
            ]
          }
        }
      }

      const baseUrl = await settingsLib.getLavaBaseUrl(handlerCtx)
      const ltBody = buildCreateInvoiceBody(args)

      await loggerLib.writeServerLog(handlerCtx, {
        severity: 6,
        message: `[${LOG_PATH}] lp_outbound_body`,
        payload: { requestId, body: redactCreateInvoiceBodyForLog(ltBody) }
      })

      const lp = await lavaTopPostJson(`${baseUrl}/api/v3/invoice`, credentials.apikey, ltBody)

      if (lp.kind !== 'json_ok') {
        return { kind: 'lp_result', lp }
      }

      const semantic = classifyCreateInvoiceResponse(lp.lpJson)
      if (semantic) {
        return { kind: 'lp_result', lp, semantic }
      }

      const success = extractCreateInvoiceSuccess(lp.lpJson)
      if (!success) {
        return {
          kind: 'lp_result',
          lp,
          semantic: { rule: 'invoices_v1_missing_payment_url' }
        }
      }

      // webhook-relay: сохранить маппинг contractId → клиентский callback (best-effort).
      // callbackUrlRaw уже прошёл SSRF-проверку выше.
      if (callbackUrlRaw) {
        try {
          await webhookMappingRepo.upsertByContractId(handlerCtx, {
            contract_id: success.contractId,
            callback_url: callbackUrlRaw,
            client_order_id:
              typeof args.clientOrderId === 'string' && args.clientOrderId.trim()
                ? args.clientOrderId.trim()
                : undefined
          })
          await loggerLib.writeServerLog(handlerCtx, {
            severity: 6,
            message: `[${LOG_PATH}] webhook_mapping_saved`,
            payload: { requestId, contractId: success.contractId }
          })
        } catch (e) {
          // Ошибка сохранения маппинга не делает ответ клиенту ошибочным — счёт уже создан.
          await loggerLib.writeServerLog(handlerCtx, {
            severity: 3,
            message: `[${LOG_PATH}] webhook_mapping_save_failed`,
            payload: { requestId, contractId: success.contractId, error: String(e) }
          })
        }
      }

      return { kind: 'lp_result', lp, semantic: null, successData: success }
    }
  )
})

export default createInvoiceRoute
