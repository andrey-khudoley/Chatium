// @shared-route
import { requireAccountRole } from '@app/auth'
import * as chatsRepo from '../../../repos/maxChats.repo'
import * as runsRepo from '../../../repos/maxHistoryRefreshRuns.repo'

function clampLimit(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(1, Math.min(500, Math.floor(n))) : 100
}

export const maxChatsListRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const chats = await chatsRepo.findRecent(ctx, {
    limit: clampLimit(req.query.limit),
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    type: typeof req.query.type === 'string' ? req.query.type : undefined
  })
  const runs = await runsRepo.findRecent(ctx, { limit: 50 })
  return {
    success: true,
    chats: chats.map((chat) => ({
      chatId: chat.chatId,
      title: chat.title,
      type: chat.chatType,
      status: chat.status,
      historyMessageCount: chat.historyMessageCount,
      maxMessagesCount: chat.maxMessagesCount,
      lastMessageAt: chat.lastMessageAt,
      lastEventTime: chat.lastEventTime,
      lastHistoryRefreshStatus: chat.lastHistoryRefreshStatus,
      lastHistoryRefreshRunId: chat.lastHistoryRefreshRunId,
      lastError: chat.lastError
    })),
    runs,
    at: Date.now()
  }
})
