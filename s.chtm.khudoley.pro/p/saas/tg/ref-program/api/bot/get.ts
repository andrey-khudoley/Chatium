// @shared-route
import { requireRealUser } from '@app/auth'
import * as botRepo from '../../lib/repo/botRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/bot/get'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * GET /api/bot/get?campaignId=… — бот кампании по campaignId.
 * Требуется авторизация и доступ к кампании (участник).
 * Токен не возвращается.
 */
export const getBotRoute = app.get('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос GET`,
    payload: { query: req.query }
  })
  const user = requireRealUser(ctx)
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId.trim() : ''
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

  const bot = await botRepo.getBotByCampaignId(ctx, campaignId)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Результат getBotByCampaignId`,
    payload: { campaignId, hasBot: !!bot, botId: bot?.id }
  })
  if (!bot) {
    return { success: true, bot: null }
  }

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
})
