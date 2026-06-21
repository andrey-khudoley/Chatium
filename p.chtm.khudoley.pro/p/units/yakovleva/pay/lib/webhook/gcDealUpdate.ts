/**
 * Downstream-вызов GC `createDeal` при успешной оплате LifePay.
 *
 * Два экспорта:
 *   - buildCreateDealArgs — чистая функция маппинга из webhook-данных в аргументы GC;
 *   - updateGcDealOnPayment — async-обёртка: вызывает invokeByGateway и логирует результат.
 *
 * Не содержит Heap-операций и импортов tables/repos. Предназначен только для
 * серверного вызова из webhooks/lifepay/index.tsx.
 */

import { invokeByGateway } from '../gateway/invokeDispatcher'
import { recordRequestLog } from '../gateway/recordRequestLog'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/webhook/gcDealUpdate'

/**
 * Строит аргументы `createDeal` из данных webhook-платежа.
 *
 * Замечания:
 *   - `deal_number` = GC поле `number` (номер заказа для привязки сделки), НЕ id/correlationId.
 *     Значение берётся из `input.dealNumber`, который должен содержать GC `number` из getDealFields.
 *   - `deal_is_paid` — `'1'` если `createPayment=true`, `'0'` если `false` (настройка «Создавать платёж»).
 *   - `deal_status` берётся из настройки GetCourse; при отсутствии настройки
 *     сохраняется историческое значение `payed`.
 *   - `deal_cost` включается ТОЛЬКО если `amount` парсится в конечное число > 0.
 *     `amount === '0'`, `'0.00'` или нечисловые значения → `deal_cost` намеренно
 *     не передаётся (нулевая / неизвестная сумма неинформативна для GC).
 */
export function buildCreateDealArgs(input: {
  dealNumber: string
  email: string
  amount?: string
  createPayment: boolean
  dealStatus?: string
}): {
  params: {
    user: { email: string }
    deal: {
      deal_number: string
      deal_status: string
      deal_is_paid: string
      deal_cost?: number
    }
  }
} {
  const deal: {
    deal_number: string
    deal_status: string
    deal_is_paid: string
    deal_cost?: number
  } = {
    deal_number: input.dealNumber,
    deal_status: input.dealStatus?.trim() || 'payed',
    deal_is_paid: input.createPayment ? '1' : '0'
  }

  if (input.amount !== undefined) {
    const n = parseFloat(input.amount)
    if (Number.isFinite(n) && n > 0) {
      deal.deal_cost = n
    }
  }

  return {
    params: {
      user: { email: input.email },
      deal
    }
  }
}

/**
 * Вызывает GC `createDeal` для пометки заказа как оплаченного.
 *
 * Не бросает исключений — все ошибки (сетевые и gateway) логируются и
 * возвращаются как `{ ok: false }`, чтобы не блокировать HTTP 200 webhook-ответа.
 */
export async function updateGcDealOnPayment(
  ctx: app.Ctx,
  input: {
    orderNumber: string
    dealNumber: string
    email: string
    amount?: string
    correlationId: string
    createPayment: boolean
    dealStatus?: string
  }
): Promise<{ ok: boolean }> {
  const { orderNumber, dealNumber, email, amount, correlationId, createPayment, dealStatus } = input
  try {
    const createDealArgs = buildCreateDealArgs({
      dealNumber,
      email,
      amount,
      createPayment,
      dealStatus
    })
    const res = await invokeByGateway(ctx, 'gc', 'createDeal', createDealArgs, {
      httpMethod: 'POST'
    })

    try {
      await recordRequestLog(ctx, {
        gatewayId: 'gc',
        op: 'createDeal',
        args: createDealArgs,
        invoke: res,
        correlationId
      })
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] record_log_failed`,
        payload: { op: 'createDeal', correlationId, error: String(e) }
      })
    }

    if (res.ok === true) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_MODULE}] gc_deal_update_success`,
        payload: {
          orderNumber,
          correlationId,
          requestId: res.requestId,
          httpStatus: res.httpStatus
        }
      })
      return { ok: true }
    } else {
      const resErrorObj =
        res.responseBody !== null &&
        typeof res.responseBody.error === 'object' &&
        res.responseBody.error !== null
          ? (res.responseBody.error as Record<string, unknown>)
          : null
      const resErrorCode = typeof resErrorObj?.code === 'string' ? resErrorObj.code : undefined

      if (resErrorCode === 'INVOKE_GC_LIMIT_ERROR') {
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_MODULE}] gc_deal_update_limit_error`,
          payload: {
            orderNumber,
            dealNumber,
            correlationId,
            httpStatus: res.httpStatus,
            requestId: res.requestId,
            errorCode: resErrorCode
          }
        })
      } else {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_MODULE}] gc_deal_update_gateway_error`,
          payload: {
            orderNumber,
            dealNumber,
            correlationId,
            httpStatus: res.httpStatus,
            proxyError: res.proxyError,
            requestId: res.requestId
          }
        })
      }
      return { ok: false }
    }
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] gc_deal_update_exception`,
      payload: {
        orderNumber,
        correlationId,
        error: String(e)
      }
    })
    return { ok: false }
  }
}
