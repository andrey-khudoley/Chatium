// @shared

import { request } from '@app/request'

const TELEGRAM_BOT_TOKEN = ''
const TELEGRAM_CHAT_ID = ''

interface ErrorReportOptions {
  error: Error | unknown
  context?: string
  userId?: string
  additionalData?: Record<string, any>
}

/**
 * Отправляет репорт об ошибке в Telegram и логирует в систему
 */
export async function reportError(ctx: app.Ctx, options: ErrorReportOptions): Promise<void> {
  const { error, context, userId, additionalData } = options

  // Формируем текст ошибки
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  // Формируем сообщение для Telegram
  let telegramMessage = `🚨 <b>Ошибка в вебинарной комнате</b>\n\n`

  if (context) {
    telegramMessage += `📍 <b>Контекст:</b> ${context}\n`
  }

  if (userId) {
    telegramMessage += `👤 <b>Пользователь:</b> ${userId}\n`
  }

  telegramMessage += `\n❌ <b>Ошибка:</b>\n<code>${escapeHtml(errorMessage)}</code>\n`

  if (errorStack) {
    const shortStack = errorStack.split('\n').slice(0, 5).join('\n')
    telegramMessage += `\n📚 <b>Stack trace:</b>\n<code>${escapeHtml(shortStack)}</code>\n`
  }

  if (additionalData && Object.keys(additionalData).length > 0) {
    telegramMessage += `\n📊 <b>Данные:</b>\n<code>${escapeHtml(JSON.stringify(additionalData, null, 2))}</code>`
  }

  // Ограничиваем длину сообщения (Telegram max 4096 символов)
  if (telegramMessage.length > 4000) {
    telegramMessage = telegramMessage.substring(0, 3900) + '\n\n...(обрезано)'
  }

  // Логируем в систему
  ctx.account.log(`@webinar-room error: ${context || 'Unknown context'}`, {
    level: 'error',
    json: {
      error: errorMessage,
      stack: errorStack,
      userId,
      additionalData
    }
  })

  if (!!TELEGRAM_BOT_TOKEN && !!TELEGRAM_CHAT_ID) {
    // Отправляем в Telegram
    try {
      await request({
        method: 'post',
        url: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        json: {
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'HTML'
        },
        throwHttpErrors: false
      })
    } catch (telegramError) {
      // Если не удалось отправить в Telegram - логируем это
      ctx.account.log('@be-on-time error: Failed to send error report to Telegram', {
        level: 'error',
        json: {
          originalError: errorMessage,
          telegramError:
            telegramError instanceof Error ? telegramError.message : String(telegramError)
        }
      })
    }
  }
}

/**
 * Экранирует HTML символы для Telegram
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
