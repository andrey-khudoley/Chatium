import { findUsersByIds } from '@app/auth'
import { formStorage } from '@app/form-storage'
import { findFeedMessages } from '@app/feed'
import { findCurrentWorkspace } from '@start/sdk'
import { findCurrentWorkspaceAgents, pushMessageToChain } from '@ai-agents/sdk/process'
import Autowebinars from '../tables/autowebinars.table'
import ScenarioEvents from '../tables/scenario_events.table'
import { ScenarioEventType } from '../shared/enum'
import { formatMinuteLabel } from './scenario-helper'

export interface ProcessAutowebinarChatMessageParams {
  feedId: string
  autowebinarId: string
  schedule: any
  messageText: string
  userId: string
  userName: string
  viewerElapsedSeconds?: number
}

async function resolveElenaAgentId(ctx: app.Ctx): Promise<string | null> {
  try {
    const workspace = await findCurrentWorkspace(ctx)
    if (!workspace?.id) {
      ctx.account.log('resolveElenaAgentId: workspace not found')
      return null
    }

    const agents = await findCurrentWorkspaceAgents(ctx, { entryModuleId: workspace.id })
    const elenaAgent = agents.find((agent: any) => agent?.workspaceAgentKey === 'aw-moderator')

    if (elenaAgent?.id) {
      return elenaAgent.id
    }
  } catch (error) {
    ctx.account.log('Failed to resolve Elena agent dynamically', {
      level: 'warn',
      err: error as any
    })
  }

  return null
}

export async function processAutowebinarChatMessage(
  ctx: app.Ctx,
  params: ProcessAutowebinarChatMessageParams
) {
  const { feedId, autowebinarId, schedule, messageText, userId, userName, viewerElapsedSeconds } =
    params

  const autowebinar = await Autowebinars.findById(ctx, autowebinarId)
  if (!autowebinar) return

  const timelineBaseMs = schedule?.startedAt
    ? new Date(schedule.startedAt).getTime()
    : schedule?.scheduledDate
      ? new Date(schedule.scheduledDate).getTime()
      : NaN
  const resolvedViewerElapsedSeconds =
    typeof viewerElapsedSeconds === 'number'
      ? viewerElapsedSeconds
      : Number.isFinite(timelineBaseMs)
        ? Math.max(0, Math.floor((Date.now() - timelineBaseMs) / 1000))
        : undefined

  const hasCutoff =
    Number.isFinite(timelineBaseMs) && typeof resolvedViewerElapsedSeconds === 'number'
  const cutoffTimestampMs = hasCutoff
    ? timelineBaseMs + resolvedViewerElapsedSeconds * 1000
    : Number.POSITIVE_INFINITY

  const liveMessages = await findFeedMessages(ctx, feedId, {
    mode: 'tail',
    limit: 300
  })

  const liveAuthorIds = [
    ...new Set(liveMessages.map((msg) => msg.createdBy).filter(Boolean))
  ] as string[]
  const liveAuthors = liveAuthorIds.length ? await findUsersByIds(ctx, liveAuthorIds) : []
  const liveAuthorsMap = new Map(liveAuthors.map((user) => [user.id, user]))

  const scenarioMessages = await ScenarioEvents.findAll(ctx, {
    where: {
      autowebinar: autowebinarId,
      eventType: ScenarioEventType.ChatMessage
    },
    limit: 1000,
    order: [{ offsetSeconds: 'asc' }]
  })

  interface CombinedMessage {
    authorName: string
    text: string
    timestamp: number
    isScenario: boolean
  }

  const combined: CombinedMessage[] = []

  for (const msg of liveMessages) {
    const messageTimestamp = new Date(msg.createdAt).getTime()
    if (messageTimestamp > cutoffTimestampMs) continue

    combined.push({
      authorName: liveAuthorsMap.get(msg.createdBy)?.fullName || 'Участник',
      text: msg.text || '',
      timestamp: messageTimestamp,
      isScenario: false
    })
  }

  if (Number.isFinite(timelineBaseMs)) {
    for (const event of scenarioMessages) {
      if (event.chatMessage?.authorName && event.chatMessage?.text) {
        const effectiveTimeMs = timelineBaseMs + Number(event.offsetSeconds ?? 0) * 1000
        if (effectiveTimeMs > cutoffTimestampMs) continue

        combined.push({
          authorName: event.chatMessage.authorName,
          text: event.chatMessage.text,
          timestamp: effectiveTimeMs,
          isScenario: true
        })
      }
    }
  }

  const sortedMessages = combined.sort((a, b) => a.timestamp - b.timestamp).slice(-20)

  ctx.account.log('Autowebinar agent context timeline cutoff', {
    level: 'info',
    json: {
      autowebinarId,
      scheduleId: schedule?.id,
      scheduleStatus: schedule?.status,
      hasStartedAt: Boolean(schedule?.startedAt),
      hasScheduledDate: Boolean(schedule?.scheduledDate),
      viewerElapsedSeconds: viewerElapsedSeconds ?? null,
      resolvedViewerElapsedSeconds: resolvedViewerElapsedSeconds ?? null,
      hasCutoff,
      timelineBaseMs: Number.isFinite(timelineBaseMs) ? timelineBaseMs : null,
      cutoffTimestampMs: Number.isFinite(cutoffTimestampMs) ? cutoffTimestampMs : null,
      combinedBeforeSlice: combined.length,
      combinedAfterSlice: sortedMessages.length
    }
  })

  const chatHistory = sortedMessages.map((msg) => `${msg.authorName}: ${msg.text}`).join('\n')

  const contextMessage = `# НОВОЕ СООБЩЕНИЕ В ЧАТЕ АВТОВЕБИНАРА

## Информация об автовебинаре:
- **ID:** ${autowebinar.id}
- **Название:** ${autowebinar.title}
- **Описание:** ${autowebinar.description || 'Нет описания'}

## Зритель:
- **Имя:** ${userName}
- **ID:** ${userId}
- **Время просмотра:** ${typeof resolvedViewerElapsedSeconds === 'number' ? formatMinuteLabel(resolvedViewerElapsedSeconds) : 'Неизвестно'}

## История последних сообщений чата:
${chatHistory || 'Нет предыдущих сообщений'}

## Текущее сообщение зрителя:
> ${messageText}

---

**Инструкция:** Проанализируй сообщение зрителя. Если это вопрос или запрос, требующий ответа модератора - напиши краткий и полезный ответ. Если это просто комментарий, эмодзи или благодарность, не требующие ответа - не отправляй ответ, вызови stop тул.`

  try {
    const agentId = await resolveElenaAgentId(ctx)
    if (!agentId) {
      ctx.account.log('Skipping pushMessageToChain: aw-moderator agent not found', {
        level: 'warn',
        json: { autowebinarId, feedId, userId }
      })
      return
    }

    ctx.account.log('Calling pushMessageToChain for autowebinar chat', {
      level: 'info',
      json: {
        autowebinarId,
        feedId,
        scheduleId: schedule?.id,
        userId,
        messageText,
        agentId
      }
    })

    const result = await pushMessageToChain(ctx, {
      agentId,
      chainKey: `autowebinar_${autowebinarId}_chat_user_${userId}`,
      messageText: contextMessage,
      wakeAgent: true,
      createChainIfNotExists: true,
      chainParams: {
        title: `Чат автовебинара: ${autowebinar.title}`,
        chainMeta: {
          autowebinarId,
          chatFeedId: feedId
        }
      }
    })

    const chainId = result.chainId
    await formStorage.setItem(chainId + '_feedId', feedId)

    ctx.account.log('Agent Elena called for autowebinar chat', {
      level: 'info',
      json: { chainId: result.chainId, autowebinarId, messageText }
    })
  } catch (error) {
    ctx.account.log('Error calling agent Elena', {
      level: 'error',
      err: error as any,
      json: { autowebinarId, messageText }
    })
  }
}
