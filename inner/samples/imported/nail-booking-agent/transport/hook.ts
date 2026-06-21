import { nanoid } from '@app/nanoid'
import { sendDataToSocket } from '@app/socket'
import { findWorkspaceByEntryModuleId } from '@start/sdk'
import { CreateTransportForm, TransportSettingsForm } from './components'

import Chats from '../tables/Chats.table'
import { getChannels } from '@sender/sdk'

app.accountHook('@sender/get-external-transports', async (ctx: app.Ctx, params: any) => {
  const transportIdentity = await getWorkspaceTransportIdentity(ctx)

  return {
    key: transportIdentity.key,
    title: 'GPT',
    sourceIcon: 'image_lKsJmyIGdh.220x220.png', // "image_PYwBi9YoDI.220x220.png",
    coverImage: '',
    actions: {
      sendMessage: sendMessageFunction
      // deleteMessage?: deleteMessageRoute
    },
    components: {
      createTransport: CreateTransportForm.__exportInfo,
      settings: TransportSettingsForm.__exportInfo
    }
  }
})

const sendMessageFunction = app
  .function('/send-message')
  .body((s) => s.any<{ chat: { id: string } }>())
  .handle(async (ctx, body) => {
    const chatId = body.chat.id

    const chat = await Chats.findById(ctx, chatId)

    if (chat && chat.userId) {
      ctx.account.log('SEND_MESSAGE SOCKET', {
        json: {
          sockerId: 'GPT_SOCKET_ID_' + chat.userId,
          data: {
            action: 'chat.received',
            chatId: chat.id
          },
          body
        }
      })
      await sendDataToSocket(ctx, 'GPT_SOCKET_ID_' + chat.userId, {
        action: 'chat.received',
        chatId: chat.id
      } as any)
    }

    return {
      success: true,
      result: {
        message: { id: nanoid() }
      }
    }
  })

export async function getWorkspaceTransportIdentity(ctx: app.Ctx) {
  const workspace = await findWorkspaceByEntryModuleId(ctx, ctx.entryModule.id)

  if (!workspace) {
    throw new Error('Workspace not found')
  }

  return {
    id: workspace.id,
    key: 'chat-with-gpt-transport-' + workspace.id,
    title: workspace.name,
    description: workspace.description ?? undefined
  }
}

export async function findWorkspaceTransport(ctx: app.Ctx) {
  const transportIdentity = await getWorkspaceTransportIdentity(ctx)
  const channels = await getChannels(ctx)

  return channels.find(
    (channel) =>
      channel.externalId === 'account:' + transportIdentity.id &&
      channel.externalKey === 'account:' + transportIdentity.key
  )
}
