import { runWithExclusiveLock } from '@app/sync'
import * as settingsLib from './settings.lib'
import * as chatsRepo from '../repos/maxChats.repo'
import * as messagesRepo from '../repos/maxChatMessages.repo'
import * as runsRepo from '../repos/maxHistoryRefreshRuns.repo'
import { getMaxMessages } from './max/apiClient.lib'
import { safeError } from './max/safe.lib'
import * as loggerLib from './logger.lib'

const LOG_PATH = 'lib/maxHistory.lib'

export type MaxHistoryRefreshCreateResult =
  | { success: true; runId: string | null; runsCreated: number; status: 'queued' }
  | { success: false; error: string }

export type MaxHistoryRefreshIterationResult = { processed: number; reschedule: boolean }

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback
}

export async function createHistoryRefreshRuns(
  ctx: app.Ctx,
  request: { scope?: string; chatId?: string | number; batchSize?: number }
): Promise<MaxHistoryRefreshCreateResult> {
  const enabled = await settingsLib.getSetting(
    ctx,
    settingsLib.SETTING_KEYS.MAX_HISTORY_REFRESH_ENABLED
  )
  if (enabled === false) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] MAX history refresh is disabled`,
      payload: {}
    })
    return { success: false, error: 'MAX history refresh is disabled' }
  }
  const token = await settingsLib.getRawSecretSettingString(
    ctx,
    settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN
  )
  if (!token) return { success: false, error: 'MAX bot token is not configured' }
  const defaultBatch = Number(
    await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_HISTORY_BATCH_SIZE)
  )
  const batchSize = clampInt(request.batchSize, 1, 100, defaultBatch)
  const scope = request.scope === 'all_known' ? 'all_known' : 'chat'
  const chatIds =
    scope === 'all_known'
      ? (await chatsRepo.findRecent(ctx, { limit: 500 }))
          .filter((chat) => chat.status === 'active' || chat.status === 'unknown')
          .map((chat) => chat.chatId)
      : [String(request.chatId ?? '')]
  let runsCreated = 0
  let firstRunId: string | null = null
  for (const chatId of chatIds.filter(Boolean)) {
    const chat = await chatsRepo.findByChatId(ctx, chatId)
    if (!chat) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] Unknown chat skipped for history refresh`,
        payload: { chatId }
      })
      continue
    }
    await runWithExclusiveLock(ctx, `max-history-refresh:create:${chatId}`, async () => {
      const active = await runsRepo.findActiveByChat(ctx, chatId)
      if (active) {
        if (!firstRunId) firstRunId = active.runId
        return
      }
      const run = await runsRepo.createQueued(ctx, { scope: 'chat', chatId, batchSize })
      await chatsRepo.markHistoryRefreshStatus(ctx, chatId, { runId: run.runId, status: 'queued' })
      if (!firstRunId) firstRunId = run.runId
      runsCreated++
    })
  }
  return {
    success: true,
    runId: scope === 'chat' ? firstRunId : null,
    runsCreated,
    status: 'queued'
  }
}

function messageTimestamp(message: unknown): number {
  if (typeof message !== 'object' || message === null) return 0
  const timestamp = (message as { timestamp?: unknown }).timestamp
  return typeof timestamp === 'number' ? timestamp : 0
}

export async function runHistoryRefreshIteration(
  ctx: app.Ctx
): Promise<MaxHistoryRefreshIterationResult> {
  const budget = Number(
    await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_HISTORY_JOB_BUDGET_MS)
  )
  const deadline = Date.now() + Math.min(9000, Math.max(1000, budget))
  const run = await runsRepo.findRunnable(ctx, Date.now())
  if (!run) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] No runnable history refresh runs`,
      payload: {}
    })
    return { processed: 0, reschedule: false }
  }
  return runWithExclusiveLock(ctx, `max-history-refresh:${run.chatId}`, async () => {
    let current = (await runsRepo.findByRunId(ctx, run.runId)) ?? run
    if (!['queued', 'deleting', 'fetching'].includes(current.status)) {
      return { processed: 0, reschedule: false }
    }
    if (current.status === 'queued') {
      await getMaxMessages(ctx, current.chatId, 1, current.cursorTimestamp || undefined)
      current = await runsRepo.markProgress(ctx, current, {
        status: 'deleting',
        phase: 'delete_old_messages',
        startedAt: current.startedAt || Date.now()
      })
    }
    try {
      let reschedule = false
      if (current.phase === 'delete_old_messages') {
        const deleteBatchSize = Number(
          await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_HISTORY_DELETE_BATCH_SIZE)
        )
        while (Date.now() < deadline) {
          const deleted = await messagesRepo.deleteBatchByChat(ctx, current.chatId, {
            limit: deleteBatchSize
          })
          current = await runsRepo.markProgress(ctx, current, {
            status: deleted.hasMore ? 'deleting' : 'fetching',
            phase: deleted.hasMore ? 'delete_old_messages' : 'fetch_messages',
            deleted: current.deleted + deleted.deleted,
            nextJobAt: deleted.hasMore ? Date.now() : 0
          })
          if (!deleted.hasMore) break
          return { processed: 1, reschedule: true }
        }
      }
      const maxBatches = Number(
        await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_HISTORY_MAX_BATCHES_PER_JOB)
      )
      let batches = 0
      while (Date.now() < deadline && batches < maxBatches) {
        const response = await getMaxMessages(
          ctx,
          current.chatId,
          current.batchSize,
          current.cursorTimestamp || undefined
        )
        const messages = Array.isArray(response.messages) ? response.messages : []
        const inserted = await messagesRepo.insertManyForRun(
          ctx,
          current.runId,
          current.chatId,
          messages
        )
        const timestamps = messages.map(messageTimestamp).filter((n) => n > 0)
        const nextCursor = timestamps.length ? Math.min(...timestamps) : current.cursorTimestamp
        current = await runsRepo.markProgress(ctx, current, {
          status: messages.length < current.batchSize || inserted === 0 ? 'succeeded' : 'fetching',
          phase: messages.length < current.batchSize || inserted === 0 ? 'done' : 'fetch_messages',
          cursorTimestamp: nextCursor,
          fetched: current.fetched + messages.length,
          inserted: current.inserted + inserted,
          batches: current.batches + 1,
          finishedAt: messages.length < current.batchSize || inserted === 0 ? Date.now() : 0,
          nextJobAt: messages.length < current.batchSize || inserted === 0 ? 0 : Date.now()
        })
        batches++
        if (current.status === 'succeeded') break
      }
      const count = await messagesRepo.countByChat(ctx, current.chatId)
      const latest = (await messagesRepo.findRecentByChat(ctx, current.chatId, { limit: 1 }))[0]
      await chatsRepo.updateCounters(ctx, current.chatId, {
        historyMessageCount: count,
        lastMessageAt: latest?.maxTimestamp ?? 0
      })
      await chatsRepo.markHistoryRefreshStatus(ctx, current.chatId, {
        runId: current.runId,
        status: current.status
      })
      if (current.status !== 'succeeded') reschedule = true
      return { processed: 1, reschedule }
    } catch (error) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] MAX history refresh failed`,
        payload: { runId: current.runId, chatId: current.chatId, error: safeError(error) }
      })
      await runsRepo.markProgress(ctx, current, {
        status: 'failed',
        finishedAt: Date.now(),
        lastError: safeError(error)
      })
      await chatsRepo.markHistoryRefreshStatus(ctx, current.chatId, {
        runId: current.runId,
        status: 'failed',
        error: safeError(error)
      })
      return { processed: 1, reschedule: false }
    }
  })
}
