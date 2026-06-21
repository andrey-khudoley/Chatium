// @shared-route
import { requireRealUser, findUsersByIds } from '@app/auth'
import { feedMessagesGetHandler, getFeedById } from '@app/feed'
import {
  assertTaskAiChatFeedAccess,
  mapTaskAiChatMessage,
  type TaskAiChatFeedMsg
} from './tasks-ai-chat-lib'
import { sortTaskAiChatMessagesForDisplay } from '../../shared/tasks-ai-chat-message-order'

export const taskAiChatMessagesGetRoute = app.get('/tasks-ai-chat/:feedId/messages/get', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const feedId = req.params.feedId as string

  await assertTaskAiChatFeedAccess(ctx, user, feedId)

  const feed = await getFeedById(ctx, feedId)
  const feedMessagesJson = await feedMessagesGetHandler(ctx, feed, (req.query ?? {}) as Record<string, string>)

  const smartUsersIds = [
    ...new Set([
      ...feedMessagesJson.data.messages.flatMap((message: TaskAiChatFeedMsg) => {
        const ids = [message.author?.id, message.replyTo?.author?.id].filter(Boolean) as string[]
        return ids
      }),
      user.id
    ])
  ]

  const smartUsers = smartUsersIds.length ? await findUsersByIds(ctx, smartUsersIds) : []
  const smartUsersMap = new Map(smartUsers.map((u) => [u.id, u]))

  for (const message of feedMessagesJson.data.messages as TaskAiChatFeedMsg[]) {
    mapTaskAiChatMessage(message, user, smartUsersMap)
  }

  feedMessagesJson.data.messages = sortTaskAiChatMessagesForDisplay(
    feedMessagesJson.data.messages as TaskAiChatFeedMsg[]
  ) as typeof feedMessagesJson.data.messages

  return feedMessagesJson
})
