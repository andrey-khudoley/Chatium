/**
 * Обработчик апдейтов от Telegram: /start → партнёр + ссылка + статистика.
 */

import type { BotRow, PartnerRow, TelegramUpdate } from '../../shared/types'
import * as botRepo from '../repo/botRepo'
import * as partnerRepo from '../repo/partnerRepo'
import * as campaignRepo from '../repo/campaignRepo'
import * as pageRepo from '../repo/pageRepo'
import * as linkRepo from '../repo/linkRepo'
import { getPartnerRedirectUrl } from '../../config/routes'
import { buildWelcomeMessage, buildStatsMessage } from './messages'
import { getWelcomeInlineButtons } from './keyboards'
import { sendTelegramMessage, inlineKeyboardFromButtons } from './sendTelegram'
import * as loggerLib from '../logger.lib'

const LOG_PATH = 'lib/telegram/botHandler'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * Обработка входящего апдейта от Telegram.
 */
export async function handleTelegramUpdate(
  ctx: app.Ctx,
  botId: string,
  update: TelegramUpdate
): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] handleTelegramUpdate: начало`,
    payload: { botId, updateId: update.update_id }
  })
  const bot = await botRepo.getBotById(ctx, botId)
  if (!bot) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] Бот не найден`,
      payload: { botId }
    })
    ctx.account.log('Bot not found', { level: 'error', json: { botId } })
    return
  }

  const campaignId = bot.campaignId?.id
  if (!campaignId) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] У бота нет кампании`,
      payload: { botId }
    })
    ctx.account.log('Bot has no campaign', { level: 'error', json: { botId } })
    return
  }

  await botRepo.saveUpdate(ctx, botId, update)
  if (update.message) {
    await handleMessage(ctx, campaignId, bot, update.message)
  } else if (update.callback_query) {
    await handleCallbackQuery(ctx, campaignId, bot, update.callback_query)
  }
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] handleTelegramUpdate: завершено`,
    payload: { botId, updateId: update.update_id }
  })
}

async function handleMessage(
  ctx: app.Ctx,
  campaignId: string,
  bot: BotRow,
  message: { from?: { id: number }; chat: { id: number }; text?: string }
): Promise<void> {
  const text = message.text ?? ''
  const from = message.from
  if (!from) return
  const chatId = String(message.chat.id)
  const tgUser = from as import('../../shared/types').TelegramUser

  const { partner, isNew } = await partnerRepo.getOrCreatePartner(ctx, campaignId, tgUser)

  if (text.startsWith('/start')) {
    await handleStartCommand(ctx, campaignId, partner, chatId, bot, isNew)
    return
  }

  if (text === '/stats' || text.trim() === '📈 Статистика') {
    await handleStatsCommand(ctx, partner, chatId, bot)
    return
  }

  await sendWelcomeMessage(ctx, campaignId, partner, chatId, bot)
}

async function handleStartCommand(
  ctx: app.Ctx,
  campaignId: string,
  partner: PartnerRow,
  chatId: string,
  bot: BotRow,
  isNew: boolean
): Promise<void> {
  ctx.account.log('Partner /start', {
    level: 'info',
    json: { campaignId, partnerId: partner.id, isNew }
  })
  await sendWelcomeMessage(ctx, campaignId, partner, chatId, bot)
}

async function handleStatsCommand(
  ctx: app.Ctx,
  partner: PartnerRow,
  chatId: string,
  bot: BotRow
): Promise<void> {
  const text = buildStatsMessage(partner)
  const token = bot.tokenEncrypted ?? ''
  if (!token) {
    ctx.account.log('Bot has no token', { level: 'warn', json: { botId: bot.id } })
    return
  }
  await sendTelegramMessage(ctx, token, chatId, { text })
}

async function sendWelcomeMessage(
  ctx: app.Ctx,
  campaignId: string,
  partner: PartnerRow,
  chatId: string,
  bot: BotRow
): Promise<void> {
  const campaign = await campaignRepo.getCampaignById(ctx, campaignId)
  const campaignTitle = campaign?.title ?? undefined

  let partnerLinkUrl: string | undefined
  const pages = await pageRepo.getCampaignPages(ctx, campaignId)
  const firstPage = pages[0]
  if (firstPage) {
    const link = await linkRepo.getOrCreatePartnerLink(ctx, campaignId, partner.id, firstPage.id)
    partnerLinkUrl = getPartnerRedirectUrl(link.publicSlug ?? '')
  }

  const text = buildWelcomeMessage(partner, campaignTitle, partnerLinkUrl)
  const inlineButtons = getWelcomeInlineButtons(partnerLinkUrl)
  const token = bot.tokenEncrypted ?? ''
  if (!token) {
    ctx.account.log('Bot has no token', { level: 'warn', json: { botId: bot.id } })
    return
  }

  await sendTelegramMessage(ctx, token, chatId, {
    text,
    reply_markup: inlineButtons.length > 0 ? inlineKeyboardFromButtons(inlineButtons) : undefined
  })
}

async function handleCallbackQuery(
  ctx: app.Ctx,
  campaignId: string,
  bot: BotRow,
  query: { from: { id: number }; message?: { chat: { id: number } }; data?: string }
): Promise<void> {
  const chatId = query.message?.chat?.id != null ? String(query.message.chat.id) : ''
  if (!chatId) return
  const tgUser = query.from as import('../../shared/types').TelegramUser
  const { partner } = await partnerRepo.getOrCreatePartner(ctx, campaignId, tgUser)
  if (query.data === 'stats') {
    await handleStatsCommand(ctx, partner, chatId, bot)
  } else {
    await sendWelcomeMessage(ctx, campaignId, partner, chatId, bot)
  }
}

/** Default export для совместимости с рантаймом (именованный экспорт может теряться при сборке). */
export default { handleTelegramUpdate }
