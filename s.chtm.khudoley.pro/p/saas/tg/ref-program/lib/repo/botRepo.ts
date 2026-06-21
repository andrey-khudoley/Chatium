/**
 * Репозиторий ботов (bots) и апдейтов (bot_updates).
 * getBotById, getBotByCampaignId — чтение; addBot — создание/замена бота кампании;
 * saveUpdate — сохранение апдейта от Telegram; getRecentUpdates — последние апдейты.
 */

import { request } from '@app/request'
import type { BotRow, TelegramUpdate } from '../../shared/types'
import Bots from '../../tables/bots.table'
import BotUpdates from '../../tables/bot_updates.table'
import { getTelegramWebhookUrl } from '../../config/routes'
import * as loggerLib from '../logger.lib'

const LOG_PATH = 'lib/repo/botRepo'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * Возвращает бота по id или null.
 */
export async function getBotById(ctx: app.Ctx, botId: string): Promise<BotRow | null> {
  const row = await Bots.findById(ctx, botId)
  return row as BotRow | null
}

/**
 * Возвращает бота по campaignId или null (у кампании не более одного бота).
 */
export async function getBotByCampaignId(ctx: app.Ctx, campaignId: string): Promise<BotRow | null> {
  const rows = await Bots.findAll(ctx, {
    where: { campaignId },
    limit: 1
  })
  return (rows[0] as BotRow) ?? null
}

export interface TelegramGetMeResult {
  ok: boolean
  result?: {
    id: number
    is_bot: boolean
    first_name: string
    username?: string
  }
  description?: string
}

/**
 * Проверяет токен через Telegram getMe. Возвращает данные бота или ошибку.
 */
export async function validateBotToken(
  ctx: app.Ctx,
  token: string
): Promise<{ ok: true; username?: string; tgBotId: string } | { ok: false; error: string }> {
  const trimmed = token.trim()
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] validateBotToken: начало`,
    payload: {
      tokenLength: trimmed.length,
      tokenPrefix: trimmed ? `${trimmed.slice(0, 8)}…` : '(пусто)'
    }
  })
  if (!trimmed) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] validateBotToken: токен пустой`,
      payload: {}
    })
    return { ok: false, error: 'Токен не указан' }
  }
  try {
    const url = `https://api.telegram.org/bot${trimmed}/getMe`
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] validateBotToken: запрос getMe`,
      payload: { urlPrefix: url.slice(0, 40) + '…' }
    })
    const response = await request({
      url,
      method: 'get',
      responseType: 'json',
      throwHttpErrors: false
    })
    const data = response.body as TelegramGetMeResult
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] validateBotToken: ответ getMe`,
      payload: {
        ok: data?.ok,
        hasResult: !!data?.result,
        description: (data as { description?: string })?.description,
        statusCode: (response as { statusCode?: number })?.statusCode
      }
    })
    if (data?.ok === true && data.result != null) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.info,
        message: `[${LOG_PATH}] validateBotToken: токен валиден`,
        payload: { username: data.result.username, tgBotId: String(data.result.id) }
      })
      return {
        ok: true,
        username: data.result.username,
        tgBotId: String(data.result.id)
      }
    }
    const errMsg = (data as { description?: string })?.description ?? 'Неверный токен'
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] validateBotToken: неверный токен или ответ Telegram`,
      payload: { error: errMsg, rawOk: data?.ok }
    })
    return { ok: false, error: errMsg }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] validateBotToken: исключение при запросе`,
      payload: { error: message, stack }
    })
    return { ok: false, error: message }
  }
}

/**
 * Устанавливает webhook для бота в Telegram (setWebhook).
 */
export async function setTelegramWebhook(
  ctx: app.Ctx,
  token: string,
  botId: string
): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = getTelegramWebhookUrl(botId)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] setTelegramWebhook: начало`,
    payload: { botId, webhookUrl }
  })
  try {
    const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    const response = await request({
      url,
      method: 'get',
      responseType: 'json',
      throwHttpErrors: false
    })
    const data = response.body as { ok?: boolean; description?: string }
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] setTelegramWebhook: ответ`,
      payload: { botId, ok: data?.ok, description: data?.description }
    })
    if (data?.ok === true) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.info,
        message: `[${LOG_PATH}] setTelegramWebhook: успех`,
        payload: { botId }
      })
      return { ok: true }
    }
    const errMsg = data?.description ?? 'Unknown error'
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] setTelegramWebhook: ошибка Telegram`,
      payload: { botId, error: errMsg }
    })
    return { ok: false, error: errMsg }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] setTelegramWebhook: исключение`,
      payload: { botId, error: message, stack }
    })
    ctx.account.log('Telegram setWebhook error', {
      level: 'error',
      json: { botId, error: message }
    })
    return { ok: false, error: message }
  }
}

/**
 * Создаёт или заменяет бота кампании. Проверяет токен через getMe, создаёт запись в bots,
 * устанавливает webhook. Если у кампании уже есть бот — обновляет его (замена токена и данных).
 */
export async function addBot(
  ctx: app.Ctx,
  campaignId: string,
  token: string
): Promise<{ bot: BotRow; isReplaced: boolean } | { error: string }> {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] addBot: начало`,
    payload: { campaignId, tokenLength: token.trim().length }
  })

  const validation = await validateBotToken(ctx, token)
  if (!validation.ok) {
    const failed = validation as { ok: false; error: string }
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] addBot: валидация токена не пройдена`,
      payload: { campaignId, error: failed.error }
    })
    return { error: failed.error }
  }

  const trimmedToken = token.trim()
  const existing = await getBotByCampaignId(ctx, campaignId)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] addBot: проверка существующего бота`,
    payload: { campaignId, hasExisting: !!existing, existingBotId: existing?.id }
  })

  if (existing) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.info,
      message: `[${LOG_PATH}] addBot: замена существующего бота`,
      payload: { campaignId, botId: existing.id }
    })
    await Bots.update(ctx, {
      id: existing.id,
      tokenEncrypted: trimmedToken,
      tgBotId: validation.tgBotId,
      username: validation.username ?? undefined,
      webhookUrl: getTelegramWebhookUrl(existing.id),
      webhookStatus: 'pending'
    })
    const setResult = await setTelegramWebhook(ctx, trimmedToken, existing.id)
    await Bots.update(ctx, {
      id: existing.id,
      webhookStatus: setResult.ok ? 'ok' : 'error'
    })
    if (!setResult.ok) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] addBot: webhook при замене не установлен`,
        payload: { botId: existing.id, error: setResult.error }
      })
    }
    const updated = await Bots.findById(ctx, existing.id)
    return { bot: updated as BotRow, isReplaced: true }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] addBot: создание нового бота`,
    payload: { campaignId }
  })
  const created = await Bots.create(ctx, {
    campaignId,
    tokenEncrypted: trimmedToken,
    tgBotId: validation.tgBotId,
    username: validation.username ?? undefined
  })
  const webhookUrl = getTelegramWebhookUrl(created.id)
  const setResult = await setTelegramWebhook(ctx, trimmedToken, created.id)
  await Bots.update(ctx, {
    id: created.id,
    webhookUrl,
    webhookStatus: setResult.ok ? 'ok' : 'error'
  })
  if (!setResult.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] addBot: webhook при создании не установлен`,
      payload: { botId: created.id, error: setResult.error }
    })
  }
  const bot = await Bots.findById(ctx, created.id)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] addBot: бот создан`,
    payload: { campaignId, botId: created.id, webhookStatus: setResult.ok ? 'ok' : 'error' }
  })
  return { bot: bot as BotRow, isReplaced: false }
}

/**
 * Переустанавливает webhook для уже подключённого бота кампании (например, если вебхук перезаписали снаружи).
 * Возвращает обновлённого бота или ошибку.
 */
export async function reinstallWebhook(
  ctx: app.Ctx,
  campaignId: string
): Promise<{ bot: BotRow } | { error: string }> {
  const bot = await getBotByCampaignId(ctx, campaignId)
  if (!bot) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] reinstallWebhook: бот не найден`,
      payload: { campaignId }
    })
    return { error: 'Бот не подключён' }
  }
  const token = bot.tokenEncrypted?.trim()
  if (!token) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] reinstallWebhook: токен не найден`,
      payload: { campaignId, botId: bot.id }
    })
    return { error: 'Токен бота не найден' }
  }
  const webhookUrl = getTelegramWebhookUrl(bot.id)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] reinstallWebhook: переустановка webhook`,
    payload: { campaignId, botId: bot.id, webhookUrl }
  })
  await Bots.update(ctx, { id: bot.id, webhookStatus: 'pending' })
  const setResult = await setTelegramWebhook(ctx, token, bot.id)
  await Bots.update(ctx, {
    id: bot.id,
    webhookStatus: setResult.ok ? 'ok' : 'error'
  })
  if (!setResult.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] reinstallWebhook: setWebhook ошибка`,
      payload: { campaignId, botId: bot.id, error: setResult.error }
    })
    return { error: setResult.error ?? 'Не удалось установить webhook' }
  }
  const updated = await Bots.findById(ctx, bot.id)
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] reinstallWebhook: успех`,
    payload: { campaignId, botId: bot.id }
  })
  return { bot: updated as BotRow }
}

/**
 * Возвращает последние апдейты бота (для отображения в админке).
 */
export async function getRecentUpdates(
  ctx: app.Ctx,
  botId: string,
  limit: number = 50
): Promise<Array<typeof BotUpdates.T>> {
  const rows = await BotUpdates.findAll(ctx, {
    where: { botId },
    order: [{ updateId: 'desc' }],
    limit: Math.min(limit, 100)
  })
  return rows
}

/**
 * Сохраняет апдейт от Telegram в bot_updates.
 * campaignId берётся из бота.
 */
export async function saveUpdate(
  ctx: app.Ctx,
  botId: string,
  update: TelegramUpdate
): Promise<void> {
  const bot = await Bots.findById(ctx, botId)
  if (!bot || !bot.campaignId?.id) return

  const updateType = update.message ? 'message' : update.callback_query ? 'callback_query' : 'other'
  const tgUserId =
    update.message?.from?.id != null
      ? String(update.message.from.id)
      : update.callback_query?.from?.id != null
        ? String(update.callback_query.from.id)
        : undefined

  await BotUpdates.create(ctx, {
    campaignId: bot.campaignId.id,
    botId,
    updateId: update.update_id,
    tgUserId: tgUserId ?? undefined,
    updateType,
    payloadJson: update as unknown as Record<string, unknown>
  })
}
