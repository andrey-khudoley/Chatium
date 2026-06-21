// @ts-ignore
import { CompletionCompletedBody } from '@start/sdk'
import * as loggerLib from '../../lib/logger.lib'
import { appendTaskAiChatAssistantMessage } from './tasks-ai-chat-lib'
import {
  applyAiFormulateJsonResponse,
  parseAiFormulateJsonFromText
} from './tasks-ai-formulate-apply'

const LOG_PATH = 'api/tasks/tasks-ai-chat-completion-completed'

export const taskAiChatCompletionCompletedFn = app
  .function('/tasks-ai-chat-completed')
  .body(CompletionCompletedBody)
  .handle(async (ctx, body, caller) => {
    if (!(caller.type === 'plugin' && caller.appSlug === 'start')) {
      throw new Error('Invalid caller')
    }

    const { userId, projectId, feedId } = (body.context ?? {}) as {
      userId?: string
      projectId?: string
      feedId?: string
    }

    if (!userId || !projectId || !feedId) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] completion: нет context`,
        payload: {}
      })
      return null
    }

    try {
      const messageTexts: string[] = []
      const latestMessage = body.messages[body.messages.length - 1]!
      for (const block of latestMessage.content) {
        if (block.type === 'text') {
          messageTexts.push(block.text)
        }
      }
      const responseText = messageTexts.join('\n').trim() || 'Не удалось сформулировать ответ.'

      const parsed = parseAiFormulateJsonFromText(responseText)
      if (parsed) {
        try {
          await applyAiFormulateJsonResponse(ctx, userId, projectId, parsed)
        } catch (applyErr) {
          await loggerLib.writeServerLog(ctx, {
            severity: 3,
            message: `[${LOG_PATH}] ошибка применения actions`,
            payload: { error: String(applyErr) }
          })
        }
        const forUser =
          (typeof parsed.reply === 'string' && parsed.reply.trim()) ||
          (typeof parsed.summary === 'string' && parsed.summary.trim()) ||
          'Готово.'
        await appendTaskAiChatAssistantMessage(ctx, feedId, userId, forUser)
      } else {
        await appendTaskAiChatAssistantMessage(ctx, feedId, userId, responseText.slice(0, 12000))
      }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка записи ответа в фид`,
        payload: { error: String(error) }
      })
      try {
        await appendTaskAiChatAssistantMessage(
          ctx,
          feedId,
          userId,
          'Произошла ошибка при обработке ответа. Попробуйте ещё раз.'
        )
      } catch {
        // ignore
      }
    }

    return null
  })
