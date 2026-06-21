/**
 * Отправка сообщений в Telegram через Bot API (request к api.telegram.org).
 * Для прототипа токен хранится в bots.tokenEncrypted как есть (без шифрования).
 */

import { request } from '@app/request'
import * as loggerLib from '../logger.lib'
import type { TelegramInlineButton } from './keyboards'

const LOG_PATH = 'lib/telegram/sendTelegram'
const SEV = { error: 3, info: 6, debug: 7 } as const

export interface SendTelegramOptions {
  text: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  reply_markup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>
    resize_keyboard?: boolean
    keyboard?: Array<Array<{ text: string }>>
  }
}

/**
 * Отправляет сообщение в чат через Telegram Bot API.
 * token — токен бота (для прототипа хранится в bots.tokenEncrypted как есть).
 */
export async function sendTelegramMessage(
  ctx: app.Ctx,
  token: string,
  chatId: string,
  options: SendTelegramOptions
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: options.text,
    parse_mode: options.parse_mode ?? undefined,
    reply_markup: options.reply_markup ?? undefined
  }
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] sendMessage: запрос`,
      payload: { chatId, textLength: options.text?.length }
    })
    const response = await request({
      url,
      method: 'post',
      json: body,
      responseType: 'json',
      throwHttpErrors: false
    })
    const data = response.body as { ok?: boolean; description?: string }
    if (data?.ok === true) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.debug,
        message: `[${LOG_PATH}] sendMessage: успех`,
        payload: { chatId }
      })
      return { ok: true }
    }
    const errMsg = data?.description ?? 'Unknown error'
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] sendMessage: ошибка Telegram API`,
      payload: { chatId, error: errMsg }
    })
    return { ok: false, error: errMsg }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] sendMessage: исключение`,
      payload: { chatId, error: message, stack }
    })
    ctx.account.log('Telegram sendMessage error', {
      level: 'error',
      json: { chatId, error: message }
    })
    return { ok: false, error: message }
  }
}

/**
 * Формирует reply_markup для inline-кнопок из keyboards.
 */
export function inlineKeyboardFromButtons(
  rows: TelegramInlineButton[][]
): NonNullable<SendTelegramOptions['reply_markup']> {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((btn) => ({
        text: btn.text,
        url: btn.url,
        callback_data: btn.callback_data
      }))
    )
  }
}
