// @ts-ignore
import { CompletionFailedBody } from '@start/sdk'
import * as loggerLib from '../../lib/logger.lib'
import { appendTaskAiChatAssistantMessage } from './tasks-ai-chat-lib'

const LOG_PATH = 'api/tasks/tasks-ai-chat-completion-failed'

export const taskAiChatCompletionFailedFn = app
  .function('/tasks-ai-chat-failed')
  .body(CompletionFailedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { userId, feedId } = (body.context ?? {}) as { userId?: string; feedId?: string }

    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] AI completion failed (чат)`,
      payload: { error: body.error, userId, feedId }
    })

    if (userId && feedId) {
      try {
        await appendTaskAiChatAssistantMessage(
          ctx,
          feedId,
          userId,
          `Не удалось получить ответ: ${typeof body.error === 'string' ? body.error : 'ошибка сервиса AI'}`
        )
      } catch {
        // ignore
      }
    }

    return null
  })
