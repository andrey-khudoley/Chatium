// @shared-route
import { requireRealUser } from '@app/auth'
import { getChat, getOrCreateParticipant } from '@app/feed'
import * as loggerLib from '../../lib/logger.lib'
import * as taskAiChatRepo from '../../repos/task-ai-chat.repo'
import { taskAiChatMessagesAddRoute } from './tasks-ai-chat-messages-add'
import { taskAiChatMessagesChangesRoute } from './tasks-ai-chat-messages-changes'
import { taskAiChatMessagesGetRoute } from './tasks-ai-chat-messages-get'

const LOG_PATH = 'api/tasks/tasks-ai-chat-ensure'

/**
 * POST /api/tasks/tasks-ai-chat-ensure — создать/получить фид и конфиг чата для проекта.
 */
export const taskAiChatEnsureRoute = app
  .body((s) => ({
    projectId: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] ensure`,
      payload: { projectId: req.body.projectId }
    })

    try {
      const { feedId } = await taskAiChatRepo.getOrCreateAiChatFeed(ctx, user.id, req.body.projectId)

      await getOrCreateParticipant(ctx, feedId, user.id, {
        role: 'member',
        muted: true,
        silent: true,
        inboxDisabled: true
      })

      // Без useAppAccount: true — иначе getChat обращается к ctx.app (только proxy context).
      const chat = await getChat(ctx, feedId, {
        messagesGetUrl: taskAiChatMessagesGetRoute({ feedId }).url(),
        messagesAddUrl: taskAiChatMessagesAddRoute({ feedId }).url(),
        messagesChangesUrl: taskAiChatMessagesChangesRoute({ feedId }).url()
      })

      return { success: true, chat, feedId }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
