import { findFeedMessages } from '@app/feed'
import { runWithExclusiveLock } from '@app/sync'
// @ts-ignore external platform module is resolved at runtime in Chatium
import { startCompletion } from '@start/sdk'
import { TASKS_AI_CHAT_JSON_APPENDIX } from '../../config/prompts'
import * as settingsLib from '../../lib/settings.lib'
import * as taskAiChatRepo from '../../repos/task-ai-chat.repo'
import { taskAiChatCompletionCompletedFn } from './tasks-ai-chat-completion-completed'
import { taskAiChatCompletionFailedFn } from './tasks-ai-chat-completion-failed'
import {
  appendTaskAiChatAssistantMessage,
  buildTaskAiChatProjectContextBlock,
  taskAiChatFeedToCompletionMessages,
  taskAiChatMsgTime,
  type TaskAiChatFeedMsg
} from './tasks-ai-chat-lib'

function buildCurrentUserMessageBlock(text: string): string {
  return [
    '## ТЕКУЩЕЕ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ',
    text,
    '',
    '## ПРАВИЛО',
    'Служебный контекст проекта передан отдельно в system-блоке. Это не новый запрос пользователя.'
  ].join('\n')
}

/**
 * Запускает ответ ассистента по последнему пользовательскому сообщению в фиде.
 * Должен вызываться только из HTTP-роута (или иного proxy app context): `startCompletion`
 * требует `ctx.app`, которого нет в `app.job().handle()`.
 */
export async function runTaskAiChatReplyIfNeeded(
  ctx: app.Ctx,
  params: { feedId: string; userId: string; projectId: string }
): Promise<void> {
  const { feedId, userId, projectId } = params

  await runWithExclusiveLock(ctx, `task-ai-chat-reply:${feedId}`, async () => {
    const mapping = await taskAiChatRepo.findFeedMappingByFeedId(ctx, feedId, userId)
    if (!mapping || mapping.projectId !== projectId) {
      return
    }

    const batch = await findFeedMessages(ctx, feedId, {
      mode: 'tail',
      limit: 100,
      reverse: true
    })

    const chronological = [...(batch as TaskAiChatFeedMsg[])].sort(
      (a, b) => taskAiChatMsgTime(a) - taskAiChatMsgTime(b)
    )
    const last = chronological[chronological.length - 1]
    if (!last || last.data?.assistant) {
      return
    }

    const formulatePrompt = await settingsLib.getAiFormulateSystemPrompt(ctx)
    const projectBlock = await buildTaskAiChatProjectContextBlock(ctx, userId, projectId)
    const system = `${formulatePrompt}\n\n${TASKS_AI_CHAT_JSON_APPENDIX}\n\n---\n## СЛУЖЕБНЫЙ КОНТЕКСТ ПРОЕКТА (НЕ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ)\nСнимок проекта и списка задач (из Heap на каждый запрос). Служебный context проекта в БД — только общая рамка; не дублируй ниже перечень задач (см. правила в промпте выше).\n${projectBlock}`

    const history = taskAiChatFeedToCompletionMessages(chronological)
    if (!history.length) {
      return
    }
    const latestUserText = (last.text ?? '').trim()
    if (!latestUserText) {
      return
    }
    const completionMessages = history.slice(0, -1)
    completionMessages.push({
      role: 'user',
      content: [{ type: 'text', text: buildCurrentUserMessageBlock(latestUserText) }]
    })

    const aiModel = await settingsLib.getAiModel(ctx)
    if (!aiModel || !aiModel.trim()) {
      await appendTaskAiChatAssistantMessage(ctx, feedId, userId, 'Модель AI не настроена.')
      return
    }

    await startCompletion(ctx, {
      onCompletionCompleted: taskAiChatCompletionCompletedFn,
      onCompletionFailed: taskAiChatCompletionFailedFn,
      system,
      model: aiModel,
      messages: completionMessages,
      context: {
        userId,
        projectId,
        feedId
      }
    })
  })
}
