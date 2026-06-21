import { SenderMessageReceivedHookParams } from '@sender/sdk'
import { getConnectedAgent, getConnectedChannels } from '../config'
import { pushMessageToChainFromSender, getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'

//
// Это хук получения сообщения по одному из каналов связи
// которые подключены в sender.
//
app.accountHook('@sender/message-received', async (ctx, params) => {
  const {
    channel, // канал связи (конкретный телеграм, вайбер и т.п.)
    chatId, // чат в канале связи
    message, // полученное сообщение
    user, // пользователь который написал в аккаунте
    person // профиль который пишет (получает данные из канала связи и чата)
  } = params as SenderMessageReceivedHookParams

  // channel - транспорт связи
  if (channel && chatId && message) {
    const connectedChannels = await getConnectedChannels(ctx)
    if (!connectedChannels.some((connectedChannel) => connectedChannel.id === channel.id)) {
      return false
    }

    const agent = await getConnectedAgent(ctx)
    if (!agent) {
      return false
    }

    // если есть текст в сообщении или какой-то файл, то реагируем
    if (message.text || message.files?.length) {
      await pushMessageToChainFromSender(ctx, {
        agentId: agent.id,
        chainKey: person?.uid || user?.id || chatId,
        wakeAgent: true,
        senderMessage: params,
        chainParams: {
          title: user?.displayName || person?.title,
          userId: user?.id,
          uid: person?.uid
        }
      })
    }
  }
})
