import SupportRequests from '../tables/supportRequests.table'
import { runTelegramApi } from '@sender/sdk'
import { readWorkspaceFile } from '@start/sdk'

function safeJsonParse(json: any, defaultValue?: any) {
  try {
    return JSON.parse(json)
  } catch (error) {
    return defaultValue
  }
}

async function getConfig(ctx: app.Ctx) {
  const configData = await readWorkspaceFile(ctx, 'config.json')
  const config = safeJsonParse(configData?.source, {})

  return config
}

// Тул для отправки сообщений в Telegram
export const sendSupportRequestTool = app
  .function('/sendSupportRequest')
  .meta({
    name: 'sendSupportRequest',
    description: `Отправляет заявку в техподдержку когда пользователь сообщает о проблемах с оплатой, неработающих функциях или требует помощи техподдержки`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional(),
            chainKey: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            text: s
              .string()
              .describe(
                `Текст обращения пользователя с описанием проблемы. Укажи Имя и фамилию пользователя, если они известны`
              )
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const { text } = body.input
    const { userId, chainId, chainKey } = body.context
    try {
      const config = await getConfig(ctx)

      // Проверяем настройки
      if (!config?.tgBotId) {
        return {
          ok: false,
          result:
            'ID бота-менеджера не настроен. Перейдите в настройки инструмента и выберите бота-менеджера.'
        }
      }

      if (!config?.tgChannelId) {
        return {
          ok: false,
          result:
            'ID канала/группы не настроен. Перейдите в настройки инструмента и выберите канал.'
        }
      }

      if (!config?.agentId) {
        return {
          ok: false,
          result: 'AI агент не выбран. Перейдите в настройки инструмента и выберите агента.'
        }
      }

      // Создаем запись в таблице
      const supportRequest = await SupportRequests.create(ctx, {
        userId,
        chainId,
        chainKey,
        text
      })

      // Подставляем текст от агента в обертку
      const wrappedText = (config.messageWrapper || '{TEXT}').replace(/{TEXT}/g, text)

      // Отправляем сообщение через runTelegramApi
      const result = await runTelegramApi(ctx, null, 'sendMessage', {
        channelId: config.tgBotId,
        chat_id: config.tgChannelId,
        text: `${wrappedText}\n⛓️Ссылка на диалог: ${ctx.account.url('/')}app/agent-process/~agent/${config.agentId}/chain/${chainId}`,
        parse_mode: 'HTML'
      })

      if (!result || !result[0]) {
        return {
          ok: false,
          result: 'Ошибка при отправке сообщения'
        }
      }

      const [success, telegramResult, error] = result

      if (!success) {
        return {
          ok: false,
          result: `Ошибка Telegram API: ${error || 'неизвестная ошибка'}`
        }
      }

      // Обновляем запись после отправки
      await SupportRequests.update(ctx, {
        id: supportRequest.id,
        chatId: config.tgChannelId,
        telegramMessageId: telegramResult?.message_id
      })

      return {
        ok: true,
        result: `Сообщение успешно отправлено в Telegram. ID сообщения: ${telegramResult?.message_id || 'неизвестно'}`
      }
    } catch (error) {
      return {
        ok: false,
        result: `Ошибка отправки сообщения в Telegram: ${error.message}`
      }
    }
  })

// Регистрация тула для ИИ агентов
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return [sendSupportRequestTool]
})
