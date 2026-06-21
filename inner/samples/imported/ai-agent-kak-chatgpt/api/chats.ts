import { s } from '@app/schema'
import { requireAnyUser } from '@app/auth'
import { sendDataToSocket } from '@app/socket'
import { getDownloadUrl, getThumbnailUrl } from '@app/storage'
import { accountNanoid, nanoid } from '@app/nanoid'
import { findMessagesByChatId, getOrCreateTransport, privateMessageRecieved } from '@sender/sdk'
import Chats from '../tables/Chats.table'
import { getWorkspaceTransportIdentity } from '../transport/hook'

// @shared-route
export const apiChatsListRoute = app.get('/list', async (ctx, req) => {
  const user = await requireAnyUser(ctx)

  return {
    success: true,
    chats: await Chats.findAll(ctx, {
      where: {
        userId: user.id
      },
      order: [
        {
          createdAt: 'desc'
        }
      ]
    })
  }
})

// @shared-route
export const apiChatsCreateRoute = app
  .body({
    text: s.string(),
    files: s
      .array(
        s.object({
          hash: s.string(),
          name: s.string(),
          mime: s.string().optional(),
          size: s.number().optional()
        })
      )
      .optional()
  })
  .post('/create')
  .handle(async (ctx, req) => {
    const user = await requireAnyUser(ctx)

    const { text, files = [] } = req.body

    const transportIdentity = await getWorkspaceTransportIdentity(ctx)

    const createTransportResponse = await getOrCreateTransport(ctx, {
      id: transportIdentity.id,
      key: transportIdentity.key,
      title: transportIdentity.title,
      description: transportIdentity.description
    })

    if (!createTransportResponse.success) {
      return createTransportResponse
    }

    const chatId = accountNanoid(ctx)

    const createMessageResponse = await privateMessageRecieved(ctx, {
      transport: transportIdentity,
      data: {
        message: {
          id: nanoid(),
          from: {
            id: chatId,
            firstName: user.firstName ?? user.displayName,
            lastName: user.lastName,
            username: user.username,
            avatarUrl: user.imageUrl
          },
          text,
          files: files.map((file) => ({
            url: file.hash?.startsWith('image')
              ? getThumbnailUrl(ctx, file.hash, 2048, 2048)
              : getDownloadUrl(ctx, file.hash),
            hash: file.hash,
            meta: {
              mime: file.mime,
              size: file.size,
              name: file.name
            }
          })) as any
        },
        user
      }
    })

    if (createMessageResponse.success === true) {
      const chat = await Chats.create(ctx, {
        id: chatId,
        userId: user.id,
        chatId: createMessageResponse.response.chat?.id,
        personId: createMessageResponse.response.person?.id,
        title: text.length > 100 ? text?.slice(0, 90) + '...' : text
      })

      await sendDataToSocket(ctx, 'GPT_SOCKET_ID_' + user.id, {
        action: 'chat.created',
        chat
      } as any)

      return {
        success: true,
        chat,
        createMessageResponse: createMessageResponse
      }
    }

    return createMessageResponse
  })

// @shared-route
export const apiChatMessagesRoute = app
  .get('/:id/messages')
  .pathParams({
    id: s.string()
  })
  .handle(async (ctx, req) => {
    const { id } = req.params

    const user = await requireAnyUser(ctx)

    const chat = await Chats.findOneBy(ctx, { id, userId: user.id })
    if (!chat || !chat.chatId) {
      return {
        success: false,
        reason: 'Chat not found'
      }
    }

    const availableMessages = (
      await findMessagesByChatId(ctx, chat.chatId, {
        limit: 100,
        mode: 'tail'
      })
    ).reverse()

    const messages = availableMessages
      .filter((message) => message.text || message.files?.length)
      .reverse()
      .map((message) =>
        message.text || message.files?.length
          ? {
              role: message.data === undefined ? ('user' as const) : ('assistant' as const),
              content: message.text,
              files:
                message.files?.map((file) => ({
                  ...file.meta,
                  url: file.hash?.startsWith('image')
                    ? getThumbnailUrl(ctx, file.hash, 2048, 2048)
                    : getDownloadUrl(ctx, file.hash)
                })) ?? []
            }
          : null
      )
      .filter((msg) => Boolean(msg))

    return {
      success: true,
      messages
    }
  })

// @shared-route
export const apiChatSendMessageRoute = app
  .body({
    text: s.string(),
    files: s
      .array(
        s.object({
          hash: s.string(),
          name: s.string(),
          mime: s.string().optional(),
          size: s.number().optional()
        })
      )
      .optional()
  })
  .post('/:id/send')
  .pathParams({
    id: s.string()
  })
  .handle(async (ctx, req) => {
    const user = await requireAnyUser(ctx)

    const { id } = req.params
    const { text, files = [] } = req.body

    const chat = await Chats.findOneBy(ctx, { id, userId: user.id })
    if (!chat || !chat.chatId) {
      return {
        success: false,
        reason: 'Chat not found'
      }
    }

    const transportIdentity = await getWorkspaceTransportIdentity(ctx)

    const createMessageResponse = await privateMessageRecieved(ctx, {
      transport: transportIdentity,
      data: {
        message: {
          id: nanoid(),
          from: {
            id,
            firstName: user.firstName ?? user.displayName,
            lastName: user.lastName,
            username: user.username,
            avatarUrl: user.imageUrl
          },
          text,
          files: files.map((file) => ({
            url: file.hash?.startsWith('image')
              ? getThumbnailUrl(ctx, file.hash, 2048, 2048)
              : getDownloadUrl(ctx, file.hash),
            hash: file.hash,
            meta: {
              mime: file.mime,
              size: file.size,
              name: file.name
            }
          })) as any
        },
        user
      }
    })

    return createMessageResponse
  })
