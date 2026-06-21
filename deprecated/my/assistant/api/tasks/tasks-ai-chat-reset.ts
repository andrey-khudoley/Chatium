// @shared-route
import { requireRealUser } from '@app/auth'
import { getOrCreateParticipant } from '@app/feed'
import * as loggerLib from '../../lib/logger.lib'
import * as taskAiChatRepo from '../../repos/task-ai-chat.repo'

const LOG_PATH = 'api/tasks/tasks-ai-chat-reset'

/**
 * POST /api/tasks/tasks-ai-chat-reset — новый фид (очистка истории чата с AI).
 */
export const taskAiChatResetRoute = app
  .body((s) => ({
    projectId: s.string()
  }))
  .post('/', async (ctx, req) => {
    const user = requireRealUser(ctx)

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] reset`,
      payload: { projectId: req.body.projectId }
    })

    try {
      const { feedId } = await taskAiChatRepo.resetAiChatFeed(ctx, user.id, req.body.projectId)

      await getOrCreateParticipant(ctx, feedId, user.id, {
        role: 'member',
        muted: true,
        silent: true,
        inboxDisabled: true
      })

      return { success: true, feedId }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] ошибка`,
        payload: { error: String(error) }
      })
      return { success: false, error: String(error) }
    }
  })
