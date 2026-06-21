// @shared-route
import * as loggerLib from '../../lib/logger.lib'
import * as webhookSecret from '../../lib/webhookSecret.lib'
import * as registrationWelcome from '../../lib/registrationWelcome.lib'
import * as webhookRepo from '../../repos/webhookLog.repo'

const LOG_PATH = 'api/webhook'

/**
 * POST /api/webhook?token=<secret> — приём входящего вебхука GC о регистрации (App D).
 *
 * Безопасность (ADR-0004 «токен в URL»):
 * - Токен извлекается из query (`req.query.token`), сравнивается с Heap-настройкой
 *   `webhook_token` через константное по времени сравнение `safeEqualToken`.
 * - При расхождении или отсутствии токена возвращается **HTTP 401** без тела.
 *   Сам токен в логи не попадает (только длина и факт совпадения).
 *
 * Поток:
 * 1. Валидация токена.
 * 2. Парсинг тела (любой JSON-объект GC).
 * 3. Нормализация события через `normalizeRegistrationEvent`.
 * 4. `processRegistrationEvent` → idempotency → invoke('addCommentToDialog') → запись в WebhookLog.
 *
 * Ответ GC: всегда 200 (если токен валиден), даже при ошибке внутренней обработки —
 * чтобы GC не ретраил бесконечно. Подробности — в WebhookLog приложения.
 */
export const webhookRoute = app.post('/', async (ctx, req) => {
  const startedAt = Date.now()
  const tokenFromUrl = typeof req.query?.token === 'string' ? String(req.query.token) : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {
      hasTokenInUrl: tokenFromUrl.length > 0,
      tokenLength: tokenFromUrl.length,
      bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body as object) : []
    }
  })

  const expected = await webhookSecret.ensureWebhookToken(ctx)
  const tokenValid = webhookSecret.safeEqualToken(tokenFromUrl, expected)

  if (!tokenValid) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] invalid token`,
      payload: { tokenLengthReceived: tokenFromUrl.length, tokenLengthExpected: expected.length }
    })
    await webhookRepo.create(ctx, {
      eventType: 'registrationCreated',
      tokenValid: false,
      reactionOk: false,
      status: 'invalid_token'
    })
    return {
      statusCode: 401,
      rawHttpBody: '',
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    }
  }

  const event = registrationWelcome.normalizeRegistrationEvent(req.body)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] event normalized`,
    payload: {
      gcEventId: event.gcEventId,
      hasEmail: !!event.email,
      hasActivityId: !!event.activityId,
      activityName: event.activityName
    }
  })

  let reaction: registrationWelcome.WelcomeResult
  try {
    reaction = await registrationWelcome.processRegistrationEvent(ctx, event)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] internal error`,
      payload: { error: msg, durationMs: Date.now() - startedAt }
    })
    const log = await webhookRepo.create(ctx, {
      gcEventId: event.gcEventId,
      eventType: 'registrationCreated',
      email: event.email,
      activityId: event.activityId,
      activityName: event.activityName,
      tokenValid: true,
      reactionOk: false,
      reactionErrorCode: 'CLIENT4_INTERNAL_ERROR',
      status: 'error'
    })
    return {
      success: false,
      status: 'error' as const,
      logId: String(log.id),
      error: { code: 'CLIENT4_INTERNAL_ERROR', message: msg }
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: {
      status: reaction.status,
      reactionOk: reaction.reactionOk,
      logId: reaction.logId,
      durationMs: Date.now() - startedAt
    }
  })

  return {
    success: reaction.reactionOk,
    status: reaction.status,
    logId: reaction.logId,
    ...(reaction.reactionErrorCode ? { error: { code: reaction.reactionErrorCode } } : {})
  }
})
