// @shared

import { getOrCreateParticipant, createFeedMessage } from '@app/feed'
import { createOrUpdateBotUser } from '@app/auth'
import { formStorage } from '@app/form-storage'

export const sendMessageToAutowebinarChatTool = app
  .function('/send-message-to-chat')
  .meta({
    name: 'send_message_to_chat',
    description:
      'Отправить сообщение в чат автовебинара от имени модератора Елены. Используй этот инструмент ТОЛЬКО если твой ответ НЕ пустой и действительно требуется ответ на вопрос зрителя.'
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional(),
            feedId: s.string().optional(),
            chatFeedId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            messageText: s
              .string()
              .describe(
                'Текст сообщения для отправки в чат. Должен быть кратким и по делу (до 50 слов).'
              )
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    try {
      ctx.account.log('🎯 sendMessageToAutowebinarChatTool called', { json: body })

      const { messageText } = body.input
      const contextFeedId = body.context?.chatFeedId || body.context?.feedId || null
      const chainId = body.context?.chainId || null

      let feedId = contextFeedId

      if (!feedId && chainId) {
        feedId = (await formStorage.getItem(chainId + '_feedId', null)) as unknown as string | null
      }

      if (!feedId) {
        throw new Error('No feedId in tool context and no chainId->feedId mapping')
      }

      // Создаём бот-пользователя "Елена"
      const elenaBot = await createOrUpdateBotUser(ctx, 'elena_webinar_moderator', {
        firstName: 'Елена'
      })

      // Добавляем бота в участники чата (если ещё не добавлен)
      await getOrCreateParticipant(ctx, feedId, elenaBot.id, {
        muted: true,
        silent: true,
        inboxDisabled: true
      })

      // Отправляем сообщение в чат
      await createFeedMessage(ctx, feedId, elenaBot, {
        text: messageText
      })

      return {
        ok: true,
        result: 'Сообщение отправлено в чат'
      }
    } catch (error) {
      ctx.account.log('Error sending message to autowebinar chat', {
        level: 'error',
        err: error as any
      })

      return {
        ok: false,
        result: `Ошибка: ${(error as Error).message}`
      }
    }
  })
