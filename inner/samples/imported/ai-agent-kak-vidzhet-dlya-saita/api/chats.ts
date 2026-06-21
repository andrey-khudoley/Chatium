import { s } from '@app/schema'
import { nanoid } from '@app/nanoid'
import { getThumbnailUrl } from '@app/storage'
import {
  findMessagesByChatId,
  findPersons,
  getOrCreateTransport,
  privateMessageRecieved
} from '@sender/sdk'
import { getWorkspaceTransportIdentity } from '../transport/hook'
import { requireAnyUser } from '@app/auth'

// @shared-route
export const apiChatSendMessageRoute = app
  .query({ uid: s.string() })
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
  .post('/send')
  .handle(async (ctx, req) => {
    const user = await requireAnyUser(ctx)

    const { uid } = req.query
    const { text, files = [] } = req.body

    const transportIdentity = await getWorkspaceTransportIdentity(ctx)

    const createMessageResponse = await privateMessageRecieved(ctx, {
      transport: transportIdentity,
      data: {
        message: {
          id: nanoid(),
          from: {
            id: uid,
            firstName: user.type === 'Real' ? user.displayName : `Client (${uid})`
          },
          text,
          files: files.map((file) => ({
            url: getThumbnailUrl(ctx, file.hash, 2048, 2048),
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

// @shared-route
export const apiChatMessagesRoute = app
  .get('/messages')
  .query({ uid: s.string() })
  .handle(async (ctx, req) => {
    const { uid } = req.query

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

    const [person] = await findPersons(ctx, {
      where: {
        externalId: uid,
        channel: createTransportResponse.transport.id
      },
      limit: 1
    })

    if (!person) {
      return {
        success: true,
        reason: 'Person not found',
        messages: []
      }
    }

    const chatId = person.chat as string | undefined

    if (!chatId) {
      return {
        success: true,
        reason: 'Chat not found',
        messages: []
      }
    }

    const availableMessages = (
      await findMessagesByChatId(ctx, chatId, {
        limit: 100,
        mode: 'tail'
      })
    ).reverse()

    const messages = availableMessages
      .filter((message) => message.text || message.files?.length)
      .reverse()
      .map((message) => {
        if (!(message.text || message.files?.length)) {
          return null
        }

        const createdAt =
          (message as any).createdAt ??
          (message as any).created_at ??
          (message as any).sentAt ??
          null

        return {
          id: message.id,
          role:
            message.createdBy === (person.user as unknown as string)
              ? ('user' as const)
              : ('assistant' as const),
          // message.data === undefined
          //   ? ("user" as const)
          //   : ("assistant" as const),
          content: message.text ?? '',
          createdAt,
          files:
            message.files?.map((file) => ({
              ...file.meta,
              url: getThumbnailUrl(ctx, file.hash, 2048, 2048)
            })) ?? []
        }
      })
      .filter(Boolean) as Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      createdAt: string | Date | null
      files: Array<{
        url: string
        mime?: string
        size?: number
        name?: string
      }>
    }>

    return {
      success: true,
      messages
    }
  })
