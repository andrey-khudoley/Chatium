import { pushMessageToChain } from '@ai-agents/sdk/process'
import { findUserById, findIdentities } from '@app/auth'
import { getOrCreateChat } from '@sender/sdk'
import SettingsTable from '../tables/settings.table'

interface WebAppOpenedHookParams {
  userId: string
  isNewUser: boolean
}

app.accountHook('@sender/webapp-opened', async (ctx, params) => {
  const { userId, isNewUser } = params as WebAppOpenedHookParams

  const settings = await SettingsTable.getSingleton(ctx)

  if (!settings || !settings.agentId) {
    return false
  }

  if (settings.onlyFirstVisit && !isNewUser) {
    return false
  }

  if (!settings.channelId) {
    return false
  }

  const user = await findUserById(ctx, userId)

  // Get Telegram ID from identities
  const [identity] = await findIdentities(ctx, {
    where: { type: 'TelegramId', userId: userId },
    limit: 1
  })

  const telegramId = identity?.key

  const userData = JSON.stringify(
    {
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.confirmedPhone,
      email: user?.confirmedEmail
      // isNewUser
    },
    null,
    2
  )

  const chatResult = await getOrCreateChat(ctx, {
    externalId: telegramId || userId,
    channelId: settings.channelId,
    createParams: {
      firstName: user?.firstName || undefined,
      lastName: user?.lastName || undefined,
      email: user?.confirmedEmail || undefined,
      phone: user?.confirmedPhone || undefined
    }
  })

  if (!chatResult.success || !chatResult.chat) {
    return false
  }

  let messageText = (
    settings.messageTemplate || 'Пользователь открыл WebApp.\n\nДанные пользователя:\n[userData]'
  ).replace('[userData]', userData)

  messageText += '\n\nChat ID: ' + chatResult.chat.id

  const person = chatResult.person
  const chat = chatResult.chat
  const chatId = chat.id

  const chainKey = person?.uid || userId || chatId

  await pushMessageToChain(ctx, {
    agentId: settings.agentId,
    chainKey,
    messageText,
    wakeAgent: settings.wakeAgent ?? true,
    chainParams: {
      title: user?.displayName || userId,
      userId,
      chatId,
      userProfile: {
        firstName: user?.firstName,
        lastName: user?.lastName,
        phone: user?.confirmedPhone,
        email: user?.confirmedEmail
      },
      chainMeta: {
        source: 'webapp-opened',
        isNewUser: String(isNewUser)
      }
    }
  })
})
