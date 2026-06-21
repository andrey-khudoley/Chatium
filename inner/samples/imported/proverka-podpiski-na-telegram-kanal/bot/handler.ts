import { sendMessageToChat, getTelegramGroups } from '@sender/sdk'
import { getConfig } from '../shared/configHelpers'
import { checkTelegramSubscription } from '../shared/checkSubscription'

type MessageReceivedParams = {
  channel: any
  chatId: string
  person: any
  user: any
  message: any
  sourcePayload?: any
}

// Обработка команды /start
app.accountHook('@sender/message-received', async (ctx, params: MessageReceivedParams) => {
  try {
    const config = await getConfig(ctx)

    // Проверяем, что это сообщение от нужного бота
    if (!config.botId || params.channel.id !== config.botId) {
      return
    }

    const messageText = params.message.text || ''
    const chatId = params.chatId
    ctx.account.log('Bot handler', {
      // level: 'debug',
      json: { params: params.sourcePayload }
    })
    // Обработка команды /start
    if (messageText.startsWith('/start')) {
      await sendMessageToChat(ctx, chatId, {
        text: config.messages.start,
        buttons: [
          [
            {
              text: config.messages.buttonText,
              id: 'check_subscription'
            }
          ]
        ],
        inlineButtons: false
      })
      return
    }

    // Обработка нажатия на кнопку (callback_query)
    if (params.sourcePayload?.message.text) {
      const titleButton = params.sourcePayload?.message.text

      if (titleButton === config.messages.buttonText) {
        // Получаем telegram user id из sourcePayload
        const telegramUserId = params.sourcePayload?.message.chat.id

        if (!config.botId || !config.senderChannelId) {
          await sendMessageToChat(ctx, chatId, {
            text: '⚠️ Бот не настроен. Обратитесь к администратору.'
          })
          return
        }

        // Получаем externalId канала из сендера
        const channels = await getTelegramGroups(ctx)
        const channel = channels.find((ch) => ch.id === config.senderChannelId)

        if (!channel || !channel.externalId) {
          await sendMessageToChat(ctx, chatId, {
            text: '⚠️ Канал не найден. Проверьте настройки.'
          })
          return
        }

        // Проверяем подписку через сендер
        // Передаем botId (ID бота в сендере) вместо токена
        const { subscribed, error } = await checkTelegramSubscription(
          ctx,
          config.botId, // ID бота в сендере
          channel.externalId, // externalId канала
          telegramUserId
        )

        if (error) {
          await sendMessageToChat(ctx, chatId, {
            text: `⚠️ ${error}`
          })
          return
        }

        if (subscribed) {
          await sendMessageToChat(ctx, chatId, {
            text: config.messages.subscribed
          })
        } else {
          await sendMessageToChat(ctx, chatId, {
            text: config.messages.notSubscribed,
            buttons: [
              [
                {
                  text: config.messages.buttonText,
                  id: 'check_subscription'
                }
              ]
            ],
            inlineButtons: false
          })
        }
      }
    }
  } catch (error) {
    ctx.account.log('Bot handler error', {
      level: 'error',
      err: error
    })
  }
})
