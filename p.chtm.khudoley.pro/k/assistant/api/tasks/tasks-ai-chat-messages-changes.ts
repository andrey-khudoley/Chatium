// @shared-route
import { requireRealUser, findUsersByIds } from '@app/auth'
import { feedMessagesChangesHandler, getFeedById } from '@app/feed'
import {
  assertTaskAiChatFeedAccess,
  mapTaskAiChatMessage,
  type TaskAiChatFeedMsg
} from './tasks-ai-chat-lib'

export const taskAiChatMessagesChangesRoute = app.get('/tasks-ai-chat/:feedId/messages/changes', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const feedId = req.params.feedId as string

  await assertTaskAiChatFeedAccess(ctx, user, feedId)

  const feed = await getFeedById(ctx, feedId)
  const feedChangesJson = await feedMessagesChangesHandler(ctx, feed, (req.query ?? {}) as Record<string, string>)

  const smartUsersIds = [
    ...new Set([
      ...feedChangesJson.changes.flatMap((change: { message?: TaskAiChatFeedMsg }) => {
        const m = change.message
        const ids = [m?.author?.id, m?.replyTo?.author?.id].filter(Boolean) as string[]
        return ids
      }),
      user.id
    ])
  ]

  const smartUsers = smartUsersIds.length ? await findUsersByIds(ctx, smartUsersIds) : []
  const smartUsersMap = new Map(smartUsers.map((u) => [u.id, u]))

  for (const change of feedChangesJson.changes as { message?: TaskAiChatFeedMsg }[]) {
    if (change.message) {
      mapTaskAiChatMessage(change.message, user, smartUsersMap)
    }
  }

  return feedChangesJson
})
