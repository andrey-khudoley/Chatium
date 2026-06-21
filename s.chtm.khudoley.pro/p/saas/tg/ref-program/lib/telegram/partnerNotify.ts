/**
 * Уведомления партнёру в Telegram при регистрации, заказе или оплате по его реферальной ссылке.
 * Отправка только если у кампании подключён бот и у партнёра есть tgId.
 */

import * as botRepo from '../repo/botRepo'
import * as partnerRepo from '../repo/partnerRepo'
import {
  buildOrderNotification,
  buildPaymentNotification,
  buildRegistrationNotification
} from './messages'
import { sendTelegramMessage } from './sendTelegram'

/**
 * Отправляет партнёру уведомление о первой регистрации. Fire-and-forget: ошибки логируются, не пробрасываются.
 */
export async function notifyPartnerRegistration(
  ctx: app.Ctx,
  campaignId: string,
  partnerId: string,
  params: { ref: string; name?: string; email?: string; phone?: string }
): Promise<void> {
  const bot = await botRepo.getBotByCampaignId(ctx, campaignId)
  if (!bot?.tokenEncrypted?.trim()) {
    ctx.account.log('Partner registration notify skipped: no bot token', {
      level: 'debug',
      json: { campaignId, partnerId }
    })
    return
  }
  const partner = await partnerRepo.getPartnerById(ctx, partnerId)
  if (!partner?.tgId?.trim()) {
    ctx.account.log('Partner registration notify skipped: partner has no tgId', {
      level: 'debug',
      json: { partnerId }
    })
    return
  }
  const text = buildRegistrationNotification(params.ref, params.name, params.email, params.phone)
  const result = await sendTelegramMessage(ctx, bot.tokenEncrypted.trim(), partner.tgId.trim(), {
    text
  })
  if (!result.ok) {
    ctx.account.log('Partner registration notify failed', {
      level: 'warn',
      json: { partnerId, error: result.error }
    })
  }
}

/**
 * Отправляет партнёру уведомление о новом заказе. Fire-and-forget: ошибки логируются, не пробрасываются.
 */
export async function notifyPartnerOrder(
  ctx: app.Ctx,
  campaignId: string,
  partnerId: string,
  params: { orderId: string; productName: string; orderSum: number }
): Promise<void> {
  const bot = await botRepo.getBotByCampaignId(ctx, campaignId)
  if (!bot?.tokenEncrypted?.trim()) {
    ctx.account.log('Partner order notify skipped: no bot token', {
      level: 'debug',
      json: { campaignId, partnerId }
    })
    return
  }
  const partner = await partnerRepo.getPartnerById(ctx, partnerId)
  if (!partner?.tgId?.trim()) {
    ctx.account.log('Partner order notify skipped: partner has no tgId', {
      level: 'debug',
      json: { partnerId }
    })
    return
  }
  const text = buildOrderNotification(params.orderId, params.productName, params.orderSum)
  const result = await sendTelegramMessage(ctx, bot.tokenEncrypted.trim(), partner.tgId.trim(), {
    text
  })
  if (!result.ok) {
    ctx.account.log('Partner order notify failed', {
      level: 'warn',
      json: { partnerId, error: result.error }
    })
  }
}

/**
 * Отправляет партнёру уведомление о новой оплате. Fire-and-forget: ошибки логируются, не пробрасываются.
 */
export async function notifyPartnerPayment(
  ctx: app.Ctx,
  campaignId: string,
  partnerId: string,
  params: { orderId: string; paymentSum: number }
): Promise<void> {
  const bot = await botRepo.getBotByCampaignId(ctx, campaignId)
  if (!bot?.tokenEncrypted?.trim()) {
    ctx.account.log('Partner payment notify skipped: no bot token', {
      level: 'debug',
      json: { campaignId, partnerId }
    })
    return
  }
  const partner = await partnerRepo.getPartnerById(ctx, partnerId)
  if (!partner?.tgId?.trim()) {
    ctx.account.log('Partner payment notify skipped: partner has no tgId', {
      level: 'debug',
      json: { partnerId }
    })
    return
  }
  const text = buildPaymentNotification(params.orderId, params.paymentSum)
  const result = await sendTelegramMessage(ctx, bot.tokenEncrypted.trim(), partner.tgId.trim(), {
    text
  })
  if (!result.ok) {
    ctx.account.log('Partner payment notify failed', {
      level: 'warn',
      json: { partnerId, error: result.error }
    })
  }
}
