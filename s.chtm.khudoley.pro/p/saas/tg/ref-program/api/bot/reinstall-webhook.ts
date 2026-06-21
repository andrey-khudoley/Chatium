// @shared-route
import { requireRealUser } from '@app/auth'
import * as botRepo from '../../lib/repo/botRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/bot/reinstall-webhook'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * POST /api/bot/reinstall-webhook — переустановить webhook для подключённого бота кампании.
 * Body: { campaignId: string }
 * Требуется авторизация и доступ к кампании. Используется, если webhook в Telegram перезаписали снаружи.
 */
export const reinstallWebhookRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос POST: начало`,
    payload: { hasBody: !!req.body, bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { campaignId?: unknown }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''

  if (!campaignId) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Отказ: campaignId не указан`,
      payload: {}
    })
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Отказ: нет доступа к кампании`,
      payload: { campaignId, userId: user.id }
    })
    return { success: false, error: 'Нет доступа к кампании' }
  }

  try {
    const result = await botRepo.reinstallWebhook(ctx, campaignId)
    if ('error' in result) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] reinstallWebhook вернул ошибку`,
        payload: { campaignId, error: result.error }
      })
      return { success: false, error: result.error }
    }

    const bot = result.bot
    return {
      success: true,
      bot: {
        id: bot.id,
        username: bot.username ?? undefined,
        title: bot.title ?? undefined,
        webhookStatus: bot.webhookStatus ?? undefined,
        tgBotId: bot.tgBotId ?? undefined
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] Исключение при reinstallWebhook`,
      payload: { campaignId, error: message }
    })
    return { success: false, error: message }
  }
})
