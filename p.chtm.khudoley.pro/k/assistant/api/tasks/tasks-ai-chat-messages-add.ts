// @shared-route
import { requireRealUser, findUsersByIds } from '@app/auth'
import { feedMessagesAddHandler, getFeedById } from '@app/feed'
import * as taskAiChatRepo from '../../repos/task-ai-chat.repo'
import { mapAuthorForTaskAiChat, assertTaskAiChatFeedAccess, type TaskAiChatFeedMsg } from './tasks-ai-chat-lib'
import { runTaskAiChatReplyIfNeeded } from './tasks-ai-chat-reply'

export const taskAiChatMessagesAddRoute = app.post('/tasks-ai-chat/:feedId/messages/add', async (ctx, req) => {
  const user = requireRealUser(ctx)
  const feedId = req.params.feedId as string

  await assertTaskAiChatFeedAccess(ctx, user, feedId)

  const mapping = await taskAiChatRepo.findFeedMappingByFeedId(ctx, feedId, user.id)
  if (!mapping) {
    throw new Error('Нет доступа к этому чату')
  }

  const feed = await getFeedById(ctx, feedId)
  const feedMessageJson = await feedMessagesAddHandler(ctx, feed, req.body)

  const added = feedMessageJson.data?.added as TaskAiChatFeedMsg | undefined

  const allSmartUsersIds = [
    ...new Set([added?.author?.id, added?.replyTo?.author?.id, user.id].filter(Boolean) as string[])
  ]

  const allSmartUsers = allSmartUsersIds.length ? await findUsersByIds(ctx, allSmartUsersIds) : []
  const smartUsersMap = new Map(allSmartUsers.map((u) => [u.id, u]))

  if (added?.author) {
    mapAuthorForTaskAiChat(added.author, user, smartUsersMap)
    added.isOutgoing = added.author.id === user.id
  }
  if (added?.replyTo?.author) {
    mapAuthorForTaskAiChat(added.replyTo.author, user, smartUsersMap)
  }

  await runTaskAiChatReplyIfNeeded(ctx, {
    feedId,
    userId: user.id,
    projectId: mapping.projectId
  })

  return feedMessageJson
})
