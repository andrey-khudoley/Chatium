// @shared
import { runTelegramApi } from '@sender/sdk'

export async function checkTelegramSubscription(
  ctx: app.Ctx,
  botChannelId: string,
  channelExternalId: string,
  userId: number
): Promise<{ subscribed: boolean; error?: string }> {
  try {
    // Используем runTelegramApi для безопасной проверки подписки
    // Передаем botChannelId в data, чтобы система определила токен бота
    const result = await runTelegramApi(
      ctx,
      null, // chatId не нужен для getChatMember
      'getChatMember',
      {
        channelId: botChannelId, // ID бота в сендере
        chat_id: channelExternalId, // externalId канала
        user_id: userId // Telegram user ID
      }
    )

    if (!result) {
      return {
        subscribed: false,
        error: 'Не удалось выполнить запрос к Telegram API'
      }
    }

    const [success, data, error] = result

    if (!success) {
      ctx.account.log('Telegram API error', {
        level: 'warn',
        json: { error }
      })
      // Если ошибка содержит "user not found" или подобное - пользователь не подписан
      if (error && (error.includes('user not found') || error.includes('USER_NOT_PARTICIPANT'))) {
        return { subscribed: false }
      }
      return {
        subscribed: false,
        error: `Ошибка проверки подписки: ${error || 'Неизвестная ошибка'}`
      }
    }

    const status = data?.status

    // Возможные статусы: creator, administrator, member, restricted, left, kicked
    const isSubscribed = ['creator', 'administrator', 'member', 'restricted'].includes(status)

    return { subscribed: isSubscribed }
  } catch (error) {
    ctx.account.log('checkTelegramSubscription error', {
      level: 'error',
      err: error
    })
    return {
      subscribed: false,
      error: `Ошибка проверки подписки: ${error.message || 'Неизвестная ошибка'}`
    }
  }
}
