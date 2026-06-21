import * as loggerLib from '../../../../lib/logger.lib'
import { normalizeLavaCurrency } from '../../../../lib/lava-currency.lib'
import * as paymentService from '../../../../lib/lava-payment.service'
import * as gcApi from '../../../../lib/getcourse-api.client'
import type { PaymentLinkRequest } from '../../../../lib/lava-types'

const LOG_PATH = 'api/integrations/lava/payment-link'

/**
 * POST …/api/integrations/lava/payment-link — создание ссылки на оплату для заказа GetCourse.
 *
 * Клиент передаёт только id заказа и желаемую валюту оплаты.
 * Сервер сам запрашивает данные заказа и пользователя через GetCourse REST API v1.
 */
export const lavaPaymentLinkRoute = app
  .body((s) => ({
    /** Идентификатор заказа GetCourse (deal id). */
    id: s.string(),
    /** Желаемая валюта оплаты: RUB / USD / EUR. */
    currency: s.string(),
    /**
     * Тестовый режим: при `true` после валидации полей возвращается успех без Lava/Heap.
     */
    integrationTestDryRun: s.optional(s.boolean())
  }))
  .post('/', async (ctx, req) => {
    const gcOrderId = req.body.id.trim()

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Вход`,
      payload: {
        gcOrderId,
        currency: req.body.currency,
        integrationTestDryRun: !!req.body.integrationTestDryRun
      }
    })

    if (!gcOrderId) {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_PATH}] VALIDATION_ERROR: пустой id`,
        payload: {}
      })
      return { success: false, errorCode: 'VALIDATION_ERROR', message: 'id must be non-empty' }
    }

    const currencyNorm = normalizeLavaCurrency(req.body.currency)
    if (!currencyNorm) {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_PATH}] VALIDATION_ERROR: неподдерживаемая валюта`,
        payload: { raw: req.body.currency }
      })
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'currency must be RUB, USD or EUR (Lava)'
      }
    }

    // --- Запрос данных заказа из GetCourse REST API v1 ---
    const dealResult = await gcApi.getDealFields(ctx, gcOrderId)
    if (!dealResult.ok) {
      const dealErr = (dealResult as { message: string }).message
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] GC_DEAL_ERROR: не удалось получить данные заказа`,
        payload: { gcOrderId, error: dealErr }
      })
      return { success: false, errorCode: 'GC_DEAL_ERROR', gcOrderId, message: dealErr }
    }

    const deal = (dealResult as { ok: true; data: gcApi.GcDealFields }).data
    const amount = deal.cost
    const gcOfferTitle = deal.title
    const gcUserId = deal.user_id

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Данные заказа получены из GC`,
      payload: {
        gcOrderId,
        amount,
        dealCurrency: deal.currency,
        title: gcOfferTitle,
        userId: gcUserId
      }
    })

    if (!Number.isFinite(amount) || amount <= 0) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] VALIDATION_ERROR: некорректный amount из заказа GC`,
        payload: { gcOrderId, amount }
      })
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        gcOrderId,
        message: `Сумма заказа в GetCourse некорректна: ${amount}`
      }
    }

    // --- Запрос данных пользователя из GetCourse REST API v1 ---
    const userResult = await gcApi.getUserFields(ctx, gcUserId)
    if (!userResult.ok) {
      const userErr = (userResult as { message: string }).message
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] GC_USER_ERROR: не удалось получить данные пользователя`,
        payload: { gcOrderId, userId: gcUserId, error: userErr }
      })
      return { success: false, errorCode: 'GC_USER_ERROR', gcOrderId, message: userErr }
    }

    const userData = (userResult as { ok: true; data: gcApi.GcUserFields }).data
    const buyerEmail = (userData.email ?? '').trim()
    if (!buyerEmail) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] VALIDATION_ERROR: у пользователя GC нет email`,
        payload: { gcOrderId, userId: gcUserId }
      })
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        gcOrderId,
        message: 'У пользователя в GetCourse не заполнен email'
      }
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Данные пользователя получены из GC`,
      payload: { gcOrderId, userId: gcUserId, email: buyerEmail }
    })

    if (req.body.integrationTestDryRun === true) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] integrationTestDryRun — ответ без Lava`,
        payload: { gcOrderId }
      })
      return {
        success: true,
        integrationTestDryRun: true,
        gcOrderId,
        lavaContractId: 'integration-test-dry-run-contract',
        paymentUrl: 'https://integration-test.invalid/lava-dry-run',
        status: 'dry-run'
      }
    }

    const params: PaymentLinkRequest = {
      gcOrderId,
      buyerEmail,
      amount,
      currency: currencyNorm,
      gcOfferTitle: gcOfferTitle || undefined,
      gcProductTitle: gcOfferTitle || undefined,
      gcUserId: String(gcUserId),
      description: undefined,
      paymentProvider: undefined,
      paymentMethod: undefined,
      buyerLanguage: undefined,
      utm: undefined,
      requestId: undefined
    }

    const result = await paymentService.createPaymentLink(ctx, params)

    await loggerLib.writeServerLog(ctx, {
      severity: result.success ? 6 : 4,
      message: `[${LOG_PATH}] Выход`,
      payload: {
        success: result.success,
        gcOrderId: result.gcOrderId,
        errorCode: result.errorCode,
        hasPaymentUrl: !!result.paymentUrl,
        hasMessage: typeof result.message === 'string' && result.message.length > 0
      }
    })

    return result
  })
