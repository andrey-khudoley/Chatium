// @shared-route
import { requireRealUser } from '@app/auth'
import * as botRepo from '../../lib/repo/botRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/bot/add'
/** Syslog severity: 3=error, 4=warning, 6=info, 7=debug */
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * POST /api/bot/add — подключить бота к кампании (токен).
 * Body: { campaignId: string, token: string }
 * Требуется авторизация и доступ к кампании.
 * Если у кампании уже есть бот — он будет заменён (токен и данные обновляются).
 */
export const addBotRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос POST: начало`,
    payload: { hasBody: !!req.body, bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { campaignId?: unknown; token?: unknown }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
  const token = typeof body.token === 'string' ? body.token : ''

  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Параметры запроса`,
    payload: {
      userId: user?.id,
      campaignId: campaignId || '(пусто)',
      tokenLength: token.length,
      tokenPrefix: token ? `${token.slice(0, 8)}…` : '(нет)'
    }
  })

  if (!campaignId) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Отказ: campaignId не указан`,
      payload: { bodyKeys: Object.keys(body) }
    })
    return { success: false, error: 'Параметр campaignId обязателен' }
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Проверка доступа к кампании`,
    payload: { campaignId, userId: user.id, hasAccess: access.hasAccess }
  })

  if (!access.hasAccess) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Отказ: нет доступа к кампании`,
      payload: { campaignId, userId: user.id }
    })
    return { success: false, error: 'Нет доступа к кампании' }
  }

  try {
    const result = await botRepo.addBot(ctx, campaignId, token)
    if ('error' in result) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.error,
        message: `[${LOG_PATH}] addBot вернул ошибку`,
        payload: { campaignId, error: result.error }
      })
      return { success: false, error: result.error }
    }

    const bot = result.bot
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.info,
      message: `[${LOG_PATH}] Бот успешно подключён`,
      payload: { campaignId, botId: bot.id, isReplaced: result.isReplaced, username: bot.username }
    })
    return {
      success: true,
      isReplaced: result.isReplaced,
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
    const stack = err instanceof Error ? err.stack : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] Исключение при addBot`,
      payload: { campaignId, error: message, stack }
    })
    return { success: false, error: message }
  }
})
