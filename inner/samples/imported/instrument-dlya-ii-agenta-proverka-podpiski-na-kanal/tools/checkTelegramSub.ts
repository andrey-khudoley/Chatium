import { getConfig } from '../api/config'
import { findIdentities } from '@app/auth'
import { checkTelegramSubscription } from '../shared/checkSubscription'
import { getChannels, getTelegramGroups } from '@sender/sdk'

app.accountHook('@start/agent/tools', async (ctx, params) => {
  return checkTelegramSubTool
})

export const checkTelegramSubTool = app
  .function('/checkTelegramSub')
  .meta({
    name: 'checkTelegramSub',
    description: `Функция проверяет, подписан ли пользователь на указанный Telegram-канал`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object({}, { additionalProperties: true })
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('🛠️ checkTelegramSubTool', { json: body })

    if (!body.context.userId) {
      return {
        ok: false,
        result: 'User is not authenticated'
      }
    }

    const userId = body.context.userId

    // Находим TelegramID пользователя
    const identities = await findIdentities(ctx, {
      where: {
        userId: userId,
        type: 'TelegramId'
      }
    })

    const telegramUserId = identities[0]?.key

    if (!telegramUserId) {
      return {
        ok: false,
        result: 'User does not have a linked Telegram account'
      }
    }

    ctx.account.log('telegramUserId', {
      level: 'debug',
      json: { telegramUserId }
    })

    try {
      // Получаем конфигурацию
      const config = await getConfig(ctx)

      if (!config.botId || !config.senderChannelId) {
        return {
          ok: false,
          result: 'Bot or channel is not configured. Please set up configuration first.'
        }
      }

      // Получаем информацию о канале из сендера
      const channels = await getTelegramGroups(ctx)
      const channel = channels.find((ch) => ch.id === config.senderChannelId)

      if (!channel || !channel.externalId) {
        return {
          ok: false,
          result: 'Channel not found in sender or has no externalId'
        }
      }

      // Проверяем подписку через сендер
      const checkResult = await checkTelegramSubscription(
        ctx,
        config.botId,
        channel.externalId,
        parseInt(telegramUserId)
      )

      if (checkResult.error) {
        return {
          ok: false,
          result: checkResult.error
        }
      }

      if (checkResult.subscribed) {
        return {
          ok: true,
          result: `User is subscribed to the channel`
        }
      } else {
        return {
          ok: true,
          result: `User is NOT subscribed to the channel`
        }
      }
    } catch (error) {
      ctx.account.log('checkTelegramSubTool error', {
        level: 'error',
        err: error
      })
      return {
        ok: false,
        result: `Error checking subscription: ${error.message || 'Unknown error'}`
      }
    }
  })
