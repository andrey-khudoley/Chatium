/**
 * Создание заказа в GetCourse через гейтвей + идемпотентность + broker.
 */

// @ts-ignore
import { accountNanoid } from '@app/nanoid'
// @ts-ignore
import { runWithExclusiveLock } from '@app/sync'

import * as ordersRepo from '../../repos/orders.repo'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import { callCreateDeal, classifyGatewayError } from '../gateway/gcGatewayClient.lib'
import { parseGcDealsResponse } from '../gateway/parseGcDeals.lib'
import { toMoney } from './money.lib'
import { publishCoreBrokerEvent } from '../broker/coreBrokerClient.lib'

const LOG_MODULE = 'lib/orders/orders.lib'

export type CreateOrderInput = {
  idempotencyKey: string
  email: string
  amount: number
  currency: string
  offerId?: string
  firstName?: string
  lastName?: string
  phone?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  /** Идентификатор корреляции для broker-события; фича 4: broker-подписка на web.checkout.submitted */
  correlationId?: string
}

export type CreateOrderResult =
  | { success: true; paymentUrl: string; dealNumber: string; orderKey: string }
  | { success: false; errorMessage: string }

export async function createOrder(
  ctx: app.Ctx,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  // Валидация входа (до лока — быстрый выход без захвата ресурса)
  if (
    !input.idempotencyKey ||
    !input.email ||
    typeof input.amount !== 'number' ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    !input.currency
  ) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] createOrder: некорректный вход`,
      payload: {
        hasIdempotencyKey: !!input.idempotencyKey,
        hasEmail: !!input.email,
        hasAmount:
          typeof input.amount === 'number' && Number.isFinite(input.amount) && input.amount > 0,
        hasCurrency: !!input.currency
      }
    })
    return { success: false as const, errorMessage: 'Некорректный вход createOrder' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] createOrder: вход`,
    payload: {
      idempotencyKey: input.idempotencyKey,
      email: input.email,
      hasAmount: typeof input.amount === 'number',
      currency: input.currency
    }
  })

  return runWithExclusiveLock(
    ctx,
    `gc-order-create:${input.idempotencyKey}`,
    async (lockCtx: app.Ctx) => {
      // Проверка идемпотентности
      const existing = await ordersRepo.findByIdempotencyKey(lockCtx, input.idempotencyKey)
      if (existing) {
        if (existing.status === 'failed') {
          // Транзиентный сбой — не фиксируем неудачу: переиспользуем orderKey и повторяем создание
          await loggerLib.writeServerLog(lockCtx, {
            severity: 6,
            message: `[${LOG_MODULE}] createOrder: retry of failed order`,
            payload: { idempotencyKey: input.idempotencyKey, orderKey: existing.orderKey }
          })
          // Управление передаётся дальше: orderKey берём существующий (не генерируем новый)
        } else {
          await loggerLib.writeServerLog(lockCtx, {
            severity: 6,
            message: `[${LOG_MODULE}] createOrder: заказ уже существует (идемпотентность)`,
            payload: { idempotencyKey: input.idempotencyKey, orderKey: existing.orderKey }
          })
          return {
            success: true as const,
            paymentUrl: existing.paymentUrl ?? '',
            dealNumber: existing.gcDealNumber ?? '',
            orderKey: existing.orderKey
          }
        }
      }

      // Генерируем внутренний orderKey (или переиспользуем из failed-строки)
      const orderKey: string =
        existing?.status === 'failed' ? existing.orderKey : accountNanoid(lockCtx)

      // Определяем offerId
      const offerId = input.offerId ?? (await settingsLib.getGcDefaultOfferId(lockCtx))
      if (!offerId) {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 3,
          message: `[${LOG_MODULE}] createOrder: offerId не задан`,
          payload: { idempotencyKey: input.idempotencyKey }
        })
        return {
          success: false as const,
          errorMessage: 'offerId не задан и gc_default_offer_id не настроен'
        }
      }
      // Валидация: offerId должен быть числовой строкой (избегаем offer_id: NaN в гейтвее)
      if (!/^\d+$/.test(String(offerId))) {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 3,
          message: `[${LOG_MODULE}] createOrder: offerId не числовой`,
          payload: { idempotencyKey: input.idempotencyKey }
        })
        return { success: false as const, errorMessage: 'offerId не числовой' }
      }

      // Собираем params для GC
      const user: Record<string, unknown> = { email: input.email }
      if (input.firstName) user.first_name = input.firstName
      if (input.lastName) user.last_name = input.lastName
      if (input.phone) user.phone = input.phone

      const deal: Record<string, unknown> = {
        offer_id: Number(offerId),
        deal_cost: input.amount,
        deal_currency: input.currency
      }

      const session: Record<string, string> = {}
      if (input.utmSource) session.utm_source = input.utmSource
      if (input.utmMedium) session.utm_medium = input.utmMedium
      if (input.utmCampaign) session.utm_campaign = input.utmCampaign
      if (input.utmContent) session.utm_content = input.utmContent
      if (input.utmTerm) session.utm_term = input.utmTerm

      const params = {
        user,
        deal,
        system: {
          refresh_if_exists: 1,
          multiple_offers: 1,
          return_payment_link: 1
        },
        session
      }

      // Вызов гейтвея
      const gatewayResult = await callCreateDeal(lockCtx, params)

      if (!gatewayResult.ok) {
        const errorMessage = classifyGatewayError(gatewayResult.error)
        await loggerLib.writeServerLog(lockCtx, {
          severity: 3,
          message: `[${LOG_MODULE}] createOrder: ошибка гейтвея`,
          payload: { code: gatewayResult.error.code, errorMessage }
        })
        // Сохраняем со статусом failed для трассировки
        await ordersRepo.upsert(lockCtx, {
          orderKey,
          idempotencyKey: input.idempotencyKey,
          userEmail: input.email,
          offerId: String(offerId),
          amount: toMoney(input.amount, input.currency),
          status: 'failed',
          rawCreateResponse: gatewayResult.error,
          firstName: input.firstName ?? '',
          lastName: input.lastName ?? '',
          phone: input.phone ?? '',
          utmSource: input.utmSource ?? '',
          utmMedium: input.utmMedium ?? '',
          utmCampaign: input.utmCampaign ?? '',
          utmContent: input.utmContent ?? '',
          utmTerm: input.utmTerm ?? ''
        })
        return { success: false as const, errorMessage }
      }

      // Разбор ответа GC
      const parsed = parseGcDealsResponse(gatewayResult.data)
      if (!parsed.ok) {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 3,
          message: `[${LOG_MODULE}] createOrder: ошибка разбора ответа GC`,
          payload: { detail: parsed.detail, errorMessage: parsed.errorMessage }
        })
        await ordersRepo.upsert(lockCtx, {
          orderKey,
          idempotencyKey: input.idempotencyKey,
          userEmail: input.email,
          offerId: String(offerId),
          amount: toMoney(input.amount, input.currency),
          status: 'failed',
          rawCreateResponse: gatewayResult.data,
          firstName: input.firstName ?? '',
          lastName: input.lastName ?? '',
          phone: input.phone ?? '',
          utmSource: input.utmSource ?? '',
          utmMedium: input.utmMedium ?? '',
          utmCampaign: input.utmCampaign ?? '',
          utmContent: input.utmContent ?? '',
          utmTerm: input.utmTerm ?? ''
        })
        return { success: false as const, errorMessage: parsed.errorMessage }
      }

      // Сохраняем успешный заказ
      await ordersRepo.upsert(lockCtx, {
        orderKey,
        idempotencyKey: input.idempotencyKey,
        userEmail: input.email,
        offerId: String(offerId),
        amount: toMoney(input.amount, input.currency),
        status: 'new',
        paymentUrl: parsed.paymentLink ?? '',
        gcDealId: parsed.dealId ?? '',
        gcDealNumber: parsed.dealNumber ?? '',
        rawCreateResponse: gatewayResult.data,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        phone: input.phone ?? '',
        utmSource: input.utmSource ?? '',
        utmMedium: input.utmMedium ?? '',
        utmCampaign: input.utmCampaign ?? '',
        utmContent: input.utmContent ?? '',
        utmTerm: input.utmTerm ?? ''
      })

      // Публикация события created (occurredAt: 0, идемпотентный ключ per orderKey)
      await publishCoreBrokerEvent(lockCtx, {
        eventType: 'getcourse.order.created',
        eventVersion: 1,
        occurredAt: 0,
        idempotencyKey: `getcourse-order-created:${orderKey}`,
        correlationId: input.correlationId,
        payload: {
          orderKey,
          idempotencyKey: input.idempotencyKey,
          gcDealId: parsed.dealId ?? '',
          gcDealNumber: parsed.dealNumber ?? '',
          offerId: String(offerId),
          userEmail: input.email,
          amount: input.amount,
          currency: input.currency,
          status: 'new',
          paymentUrl: parsed.paymentLink ?? ''
        }
      })

      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] createOrder: успех`,
        payload: { orderKey, gcDealId: parsed.dealId, gcDealNumber: parsed.dealNumber }
      })

      return {
        success: true as const,
        paymentUrl: parsed.paymentLink ?? '',
        dealNumber: parsed.dealNumber ?? '',
        orderKey
      }
    }
  )
}
