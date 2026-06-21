import { SenderMessageReceivedHookParams } from '@sender/sdk'
import SupportRequests from '../tables/supportRequests.table'
import { pushMessageToChain } from '@ai-agents/sdk/process'
import { getConfig } from '../api/settings'

//
// Хук получения сообщений от Telegram через @sender
// Обрабатывает ответы от техподдержки на запросы пользователей
//
app.accountHook('@sender/message-received', async (ctx, params) => {
  const {
    channel, // канал связи (Telegram бот)
    chatId, // ID чата/канала в Telegram
    message, // полученное сообщение
    user, // пользователь который написал
    person, // профиль который пишет
    sourcePayload // полные данные от Telegram API
  } = params as SenderMessageReceivedHookParams

  if (sourcePayload?.message) {
    const chatIdMessage = String(sourcePayload.message.reply_to_message?.chat.id || '0')
    // Сохраняем все входящие сообщения в таблицу логов
    try {
      ctx.account.log('Saving message log', {
        level: 'debug',
        json: {
          channelId: channel?.id,
          chatId: chatIdMessage,
          messageText: message?.text,
          hasSourcePayload: !!sourcePayload,
          sourcePayloadKeys: sourcePayload.message
        }
      })

      ctx.account.log('Message log saved successfully', { level: 'debug' })
    } catch (error: any) {
      ctx.account.log('Error saving message to logs', {
        level: 'error',
        err: error
      })
    }

    // Загружаем настройки из config.json
    const settings = await getConfig(ctx)

    if (!settings || !settings.tgChannelId || !settings.agentId) {
      ctx.account.log('Settings not configured for webhook', {
        level: 'warn',
        json: {
          hasSettings: !!settings,
          hasChannel: !!settings?.tgChannelId,
          hasAgent: !!settings?.agentId
        }
      })
      return false
    }

    // Проверяем, что сообщение из нужного канала
    if (String(chatIdMessage) !== String(settings.tgChannelId)) {
      ctx.account.log('Message from different channel', {
        level: 'debug',
        json: { receivedChatId: chatIdMessage, expectedChannelId: settings.tgChannelId }
      })
      return false
    }

    // Проверяем, что это ответ (reply) на сообщение бота
    if (sourcePayload?.message?.reply_to_message) {
      const replyToMessage = sourcePayload.message.reply_to_message

      // Проверяем, что это ответ на сообщение бота
      if (replyToMessage.from?.is_bot) {
        const messageId = replyToMessage.message_id
        const supportRequest = await SupportRequests.findOneBy(ctx, {
          telegramMessageId: messageId
        })

        if (supportRequest) {
          // Сохраняем ответ
          await SupportRequests.update(ctx, {
            id: supportRequest.id,
            response: message.text || ''
          })

          try {
            ctx.account.log('Pushing message to chain', {
              json: {
                agentId: settings.agentId,
                chainKey: supportRequest.chainKey,
                messageText: message.text,
                wakeAgent: true
              }
            })

            // Отправляем ответ в диалог агента
            await pushMessageToChain(ctx, {
              agentId: settings.agentId,
              chainKey: supportRequest.chainKey,
              messageText: `Получен ответ от технической поддержки:
  ---
  ${message.text}
  ---

  Если пользователь пришлет уточнения на этот ответ, то пришли их в техподдержку.`,
              wakeAgent: true
            })

            ctx.account.log('Message successfully pushed to chain', {
              level: 'info',
              json: { chainId: supportRequest.chainKey, agentId: settings.agentId }
            })
          } catch (error: any) {
            ctx.account.log('Error pushing message to chain', {
              level: 'error',
              err: error
            })
          }
        } else {
          ctx.account.log('Support request not found for message_id', {
            level: 'warn',
            json: { messageId }
          })
        }
      }
    }
  }

  return true
})
