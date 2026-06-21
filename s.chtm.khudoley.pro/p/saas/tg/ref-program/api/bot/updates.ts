// @shared-route
import { requireRealUser } from '@app/auth'
import * as botRepo from '../../lib/repo/botRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/bot/updates'
const SEV = { warn: 4, info: 6, debug: 7 } as const

/**
 * GET /api/bot/updates?campaignId=…&limit=… — последние апдейты бота кампании.
 * Требуется авторизация и доступ к кампании.
 * limit по умолчанию 50, максимум 100.
 */
export const botUpdatesRoute = app.get('/', async (ctx, req) => {
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
      message: `[${LOG_PATH}] campaignId не указан`,
      payload: {}
    })
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Нет доступа к кампании`,
      payload: { campaignId, userId: user.id }
    })
    return { success: false, error: 'Нет доступа к кампании' }
  }

  const bot = await botRepo.getBotByCampaignId(ctx, campaignId)
  if (!bot) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] Бот не найден, пустой список`,
      payload: { campaignId }
    })
    return { success: true, updates: [] }
  }

  const limitRaw = typeof req.query?.limit === 'string' ? parseInt(req.query.limit, 10) : 50
  const limit = Number.isNaN(limitRaw) ? 50 : Math.min(Math.max(1, limitRaw), 100)

  const updates = await botRepo.getRecentUpdates(ctx, bot.id, limit)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Апдейты получены`,
    payload: { campaignId, botId: bot.id, count: updates.length }
  })
  return {
    success: true,
    updates: updates.map((u) => ({
      id: u.id,
      updateId: u.updateId,
      tgUserId: u.tgUserId ?? undefined,
      updateType: u.updateType ?? undefined,
      payloadJson: u.payloadJson
    }))
  }
})
