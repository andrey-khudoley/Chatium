/**
 * Webhook регистрации от внешней системы.
 * GET/POST /p/saas/ref/hook/register — параметры key, ref, tg_id, gc_id, name, email, phone.
 */

import * as pageRepo from '../lib/repo/pageRepo'
import * as eventRepo from '../lib/repo/eventRepo'
import * as loggerLib from '../lib/logger.lib'

const LOG_PATH = 'hook/register'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

export const registerWebhookGetRoute = app.get('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] GET запрос`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })
  return handleRegisterWebhook(ctx, (req.query ?? {}) as Record<string, unknown>)
})

export const registerWebhookPostRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] POST запрос`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })
  const data = {
    ...((req.query ?? {}) as Record<string, unknown>),
    ...((req.body ?? {}) as Record<string, unknown>)
  }
  return handleRegisterWebhook(ctx, data)
})

async function handleRegisterWebhook(
  ctx: app.Ctx,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const { key, ref, tg_id, gc_id, name, email, phone } = data

  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] Webhook получен`,
    payload: { key: !!key, ref: !!ref, tg_id, gc_id, hasEmail: !!email, hasPhone: !!phone }
  })

  if (!key || typeof key !== 'string') {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Нет key`,
      payload: {}
    })
    return { success: false, error: 'Missing key parameter' }
  }
  if (!ref || typeof ref !== 'string') {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Нет ref`,
      payload: {}
    })
    return { success: false, error: 'Missing ref parameter' }
  }

  const page = await pageRepo.findPageBySecret(ctx, key)
  if (!page) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Страница не найдена по key`,
      payload: { keyPrefix: String(key).slice(0, 8) + '…' }
    })
    ctx.account.log('Page not found by secret', { level: 'warn', json: { key } })
    return { success: false, error: 'Invalid key' }
  }

  const campaignId = page.campaignId?.id
  if (!campaignId) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Страница без кампании`,
      payload: { pageId: page.id }
    })
    return { success: false, error: 'Invalid key' }
  }

  try {
    const result = await eventRepo.processRegistration(ctx, campaignId, {
      ref: ref as string,
      tgId: tg_id != null ? String(tg_id) : undefined,
      gcId: gc_id != null ? String(gc_id) : undefined,
      name: name != null ? String(name) : undefined,
      email: email != null ? String(email) : undefined,
      phone: phone != null ? String(phone) : undefined,
      rawPayload: { ...data, receivedAt: new Date().toISOString() }
    })

    await loggerLib.writeServerLog(ctx, {
      severity: SEV.info,
      message: `[${LOG_PATH}] Регистрация обработана`,
      payload: { campaignId, ref, isNew: result.isNew, success: result.success }
    })

    if (!result.success) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] Ref не найден или уже зарегистрирован`,
        payload: { ref }
      })
      return { success: false, error: 'Ref not found or already registered' }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] Ошибка обработки`,
      payload: { campaignId, ref, error: message, stack }
    })
    ctx.account.log('Registration processing error', {
      level: 'error',
      json: { campaignId, ref, error: message }
    })
    return { success: false, error: 'Processing error' }
  }
}
