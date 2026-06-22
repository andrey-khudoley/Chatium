// @shared-route
// @ts-ignore
import { runWithExclusiveLock } from '@app/sync'
import { sendDataToSocket } from '@app/socket'
import * as loggerLib from '../../lib/logger.lib'
import * as checkoutRequestsRepo from '../../repos/checkoutRequests.repo'
import { normalizeCheckoutForm } from '../../lib/checkout/normalizeForm.lib'
import {
  buildIdempotencyKey,
  buildSocketId,
  buildEventIdempotencyKey
} from '../../lib/checkout/constants'
import {
  buildCheckoutSubmittedMessage,
  buildCheckoutFailedMessage
} from '../../lib/checkout/socketMessages.lib'
import {
  publishCoreBrokerEvent,
  pingGetCourseProcess,
  WEB_CHECKOUT_SUBMITTED_EVENT_TYPE
} from '../../lib/broker/coreBrokerClient.lib'

const LOG_MODULE = 'api/checkout/submit'

// Объявление джобы (импортируется здесь для scheduleJobAfter)
import brokerPollJob from '../../jobs/broker/poll'

export const checkoutSubmitRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] вход`,
    payload: { hasBody: !!req.body }
  })

  // Валидация requestKey
  const rawRequestKey = (req.body as Record<string, unknown>)?.requestKey
  const requestKey = typeof rawRequestKey === 'string' ? rawRequestKey.trim() : ''
  if (!requestKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] отсутствует requestKey`,
      payload: {}
    })
    return { success: false, error: 'requestKey обязателен' }
  }

  // Нормализация полей формы
  const normalizeResult = normalizeCheckoutForm(req.body)
  if (!normalizeResult.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] невалидные поля формы`,
      payload: { error: normalizeResult.error }
    })
    return { success: false, error: normalizeResult.error }
  }

  const form = normalizeResult.value
  const idempotencyKey = buildIdempotencyKey(requestKey)
  const socketId = buildSocketId(requestKey)

  // Под runWithExclusiveLock по socketId (единый ключ лока с processOrderCreated)
  const result = await runWithExclusiveLock(ctx, socketId, async (lockCtx: app.Ctx) => {
    // Идемпотентность: если строка уже есть — вернуть текущий статус без повторного publish
    const existing = await checkoutRequestsRepo.findByRequestKey(lockCtx, requestKey)
    if (existing) {
      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] идемпотентный повторный submit — строка уже существует`,
        payload: { requestKey, status: existing.status }
      })
      return {
        success: true,
        status: existing.status,
        paymentUrl: existing.paymentUrl || undefined,
        requestKey
      }
    }

    // Создаём строку со статусом submitted
    await checkoutRequestsRepo.upsert(lockCtx, {
      requestKey,
      idempotencyKey,
      socketId,
      status: 'submitted',
      formPayload: form
    })

    await loggerLib.writeServerLog(lockCtx, {
      severity: 6,
      message: `[${LOG_MODULE}] строка создана`,
      payload: { requestKey, idempotencyKey }
    })

    // Публикация события в broker
    // occurredAt: 0 — детерминизм fingerprint (не Date.now()), чтобы ядро использовало
    // idempotencyKey для дедупликации независимо от времени вызова
    const publishResult = await publishCoreBrokerEvent(lockCtx, {
      eventType: WEB_CHECKOUT_SUBMITTED_EVENT_TYPE,
      eventVersion: 1,
      occurredAt: 0,
      aggregateType: 'checkout.request',
      aggregateId: requestKey,
      correlationId: requestKey,
      idempotencyKey: buildEventIdempotencyKey(requestKey),
      payload: {
        requestKey,
        idempotencyKey,
        email: form.email,
        amount: form.amount,
        currency: form.currency,
        ...(form.offerId !== undefined ? { offerId: form.offerId } : {}),
        ...(form.firstName !== undefined ? { firstName: form.firstName } : {}),
        ...(form.lastName !== undefined ? { lastName: form.lastName } : {}),
        ...(form.phone !== undefined ? { phone: form.phone } : {}),
        ...(form.utmSource !== undefined ? { utmSource: form.utmSource } : {}),
        ...(form.utmMedium !== undefined ? { utmMedium: form.utmMedium } : {}),
        ...(form.utmCampaign !== undefined ? { utmCampaign: form.utmCampaign } : {}),
        ...(form.utmContent !== undefined ? { utmContent: form.utmContent } : {}),
        ...(form.utmTerm !== undefined ? { utmTerm: form.utmTerm } : {}),
        ...(form.comment !== undefined ? { comment: form.comment } : {}),
        ...(form.sourceUrl !== undefined ? { sourceUrl: form.sourceUrl } : {}),
        ...(form.returnUrl !== undefined ? { returnUrl: form.returnUrl } : {})
      },
      metadata: { interface: 'web' }
    })

    if (!publishResult || publishResult.success !== true) {
      // Ошибка публикации — сохраняем failed + сокет
      const errMsg =
        typeof publishResult?.error === 'string'
          ? publishResult.error
          : 'Ошибка публикации в broker'
      await checkoutRequestsRepo.upsert(lockCtx, {
        requestKey,
        status: 'failed',
        errorMessage: errMsg
      })
      await sendDataToSocket(
        lockCtx,
        socketId,
        buildCheckoutFailedMessage(requestKey, errMsg) as any
      )
      await loggerLib.writeServerLog(lockCtx, {
        severity: 3,
        message: `[${LOG_MODULE}] ошибка публикации broker-события`,
        payload: { requestKey, error: errMsg }
      })
      return { success: false, error: errMsg }
    }

    // Успех publish — отправляем checkout_submitted в сокет
    await sendDataToSocket(lockCtx, socketId, buildCheckoutSubmittedMessage(requestKey) as any)

    await loggerLib.writeServerLog(lockCtx, {
      severity: 6,
      message: `[${LOG_MODULE}] событие опубликовано, сокет отправлен`,
      payload: { requestKey }
    })

    return { success: true, status: 'submitted', requestKey }
  })

  // Если лок вернул ошибку — возвращаем её сразу
  if (!result.success) {
    return result
  }

  // Если идемпотентный возврат (уже был submit) — не планируем джобу повторно
  if ((result as { status?: string }).status !== 'submitted') {
    return result
  }

  // Планируем fallback-джобу ВНЕ лока (scheduleJobAfter требует await — §005-jobs.md)
  await brokerPollJob.scheduleJobAfter(ctx, 3, 'seconds', { requestKey, iteration: 0 })

  // Best-effort cold-start GetCourse Interface (вызывает /checkout/process)
  try {
    await pingGetCourseProcess(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] pingGetCourseProcess выполнен`,
      payload: { requestKey }
    })
  } catch (e) {
    // Best-effort: ошибку логируем, но НЕ валим submit
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] pingGetCourseProcess ошибка (best-effort, не критично)`,
      payload: { requestKey, error: e instanceof Error ? e.message : String(e) }
    })
  }

  return result
})

export default checkoutSubmitRoute
