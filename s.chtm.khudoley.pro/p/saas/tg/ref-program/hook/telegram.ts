/**
 * Webhook для приёма апдейтов от Telegram Bot API.
 * POST /hook/telegram?botId=… — body: Telegram Update. Без тильды в адресе (стандарты).
 * Всегда отвечает 200, чтобы Telegram не ретраил.
 */

import * as botRepo from '../lib/repo/botRepo'
import botHandler from '../lib/telegram/botHandler'
import * as loggerLib from '../lib/logger.lib'

const LOG_PATH = 'hook/telegram'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * Telegram webhook endpoint.
 * URL: /p/saas/ref/hook/telegram?botId=…
 */
export const telegramWebhookRoute = app.post('/', async (ctx, req) => {
  const botId = typeof req.query?.botId === 'string' ? req.query.botId : undefined
  const update = req.body

  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Входящий webhook`,
    payload: {
      botId,
      hasBody: !!update,
      bodyKeys: update && typeof update === 'object' ? Object.keys(update) : []
    }
  })

  if (!botId || typeof botId !== 'string') {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Отсутствует или неверный botId`,
      payload: { query: req.query }
    })
    ctx.account.log('Telegram webhook: missing botId', { level: 'warn' })
    return { ok: true }
  }

  if (
    !update ||
    typeof update !== 'object' ||
    typeof (update as { update_id?: number }).update_id !== 'number'
  ) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Невалидное тело запроса`,
      payload: { botId }
    })
    ctx.account.log('Telegram webhook: invalid body', { level: 'warn', json: { botId } })
    return { ok: true }
  }

  const updateId = (update as { update_id: number }).update_id
  const updateType = (update as { message?: unknown; callback_query?: unknown }).message
    ? 'message'
    : (update as { callback_query?: unknown }).callback_query
      ? 'callback_query'
      : 'other'
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] Апдейт принят`,
    payload: { botId, updateId, type: updateType }
  })

  try {
    const bot = await botRepo.getBotById(ctx, botId)
    if (!bot) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] Бот не найден`,
        payload: { botId }
      })
      ctx.account.log('Bot not found for webhook', { level: 'warn', json: { botId } })
      return { ok: true }
    }

    await botHandler.handleTelegramUpdate(
      ctx,
      botId,
      update as import('../shared/types').TelegramUpdate
    )
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] Апдейт обработан`,
      payload: { botId, updateId }
    })
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] Ошибка обработки апдейта`,
      payload: { botId, error: message, stack }
    })
    ctx.account.log('Telegram webhook error', {
      level: 'error',
      json: { botId, error: message, stack }
    })
    return { ok: true }
  }
})
