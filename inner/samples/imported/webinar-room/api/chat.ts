// @shared

import { requireAccountRole, findUsersByIds, findUsers } from '@app/auth'
import { sendDataToSocket } from '@app/socket'
import {
  checkRateLimit,
  getTimeUntilNextAttempt,
  validateText,
  LIMITS
} from '../shared/rate-limiter'
import { getUserDisplayName } from '../shared/user-name'
import { ChatAccessMode, ChatBanType, EpisodeStatus } from '../shared/enum'
import {
  getFeedById,
  feedMessagesGetHandler,
  feedMessagesChangesHandler,
  feedMessagesAddHandler
} from '@app/feed'
import { findCurrentWorkspaceAgents } from '@ai-agents/sdk/process'
import { findCurrentWorkspace } from '@start/sdk'
import { processAutowebinarChatMessage } from './chat-agent'
import {
  checkUserBan,
  ensureUserHaveAccessToFeed,
  mapAuthor,
  mapMessage,
  resolveChatTargetContext,
  buildBanErrorMessage
} from './chat-common'

// Debug endpoint to verify workspace agent discovery and key matching.
// @shared-route
export const apiAwModeratorAgentDebugRoute = app.get(
  '/debug/aw-moderator-agent',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const expectedKey = String((req.query?.key as string) || 'aw-moderator')
    const workspace = await findCurrentWorkspace(ctx)
    const agents = workspace?.id
      ? await findCurrentWorkspaceAgents(ctx, { entryModuleId: workspace.id })
      : []
    const includeRaw = String(req.query?.includeRaw ?? '1') !== '0'
    const sampleAgentKeys = agents.map((agent: any) => ({
      id: agent?.id,
      title: agent?.title,
      workspaceAgentKey: agent?.workspaceAgentKey || null,
      keys: Object.keys(agent || {})
    }))

    const normalizedAgents = agents.map((agent: any) => ({
      id: agent?.id,
      title: agent?.title,
      workspaceAgentKey: agent?.workspaceAgentKey || null
    }))

    const matchedAgent =
      normalizedAgents.find(
        (agent: { workspaceAgentKey: string | null }) => agent.workspaceAgentKey === expectedKey
      ) || null

    return {
      success: true,
      context: {
        accountId: (ctx.account as any)?.id || null,
        userId: (ctx.user as any)?.id || null,
        workspaceName: (ctx.account as any)?.name || null,
        workspaceId: workspace?.id || null
      },
      expectedKey,
      found: Boolean(matchedAgent),
      matchedAgent,
      totalAgents: normalizedAgents.length,
      sampleAgentKeys,
      agents: normalizedAgents,
      rawAgents: includeRaw ? agents : undefined
    }
  }
)

// @shared-route
export const episodeChatMessagesGetRoute = app.get(
  '/client-chat/:feedId/messages/get',
  async (ctx, req) => {
    if (!ctx.user) {
      throw new Error('Только авторизованные пользователи имеют доступ')
    }

    const feedId = req.params.feedId as string

    const feed = await getFeedById(ctx, feedId)
    await ensureUserHaveAccessToFeed(ctx, feed, ctx.user)

    const feedMessagesJson = await feedMessagesGetHandler(ctx, feed, (req.query ?? {}) as any)

    const smartUsersIds = [
      ...new Set([
        ...feedMessagesJson.data.messages.flatMap((message: any) => {
          const ids = [message.author.id, message.replyTo?.author?.id].filter(Boolean) as string[]
          return ids
        }),
        ctx.user.id
      ])
    ]

    const smartUsers = smartUsersIds.length ? await findUsersByIds(ctx, smartUsersIds) : []
    const smartUsersMap = new Map(smartUsers.map((u) => [u.id, u]))

    for (let message of feedMessagesJson.data.messages) {
      message = mapMessage(message, ctx.user, smartUsersMap)
    }

    return feedMessagesJson
  }
)

// @shared-route
export const episodeChatMessagesChangesRoute = app.get(
  '/client-chat/:feedId/messages/changes',
  async (ctx, req) => {
    if (!ctx.user) {
      throw new Error('Только авторизованные пользователи имеют доступ')
    }

    const feedId = req.params.feedId as string

    const feed = await getFeedById(ctx, feedId)
    await ensureUserHaveAccessToFeed(ctx, feed, ctx.user)

    const feedChangesJson = await feedMessagesChangesHandler(ctx, feed, (req.query ?? {}) as any)

    const smartUsersIds = [
      ...new Set([
        ...feedChangesJson.changes.flatMap((change) => {
          const ids = [change.message?.author.id, change.message?.replyTo?.author?.id].filter(
            Boolean
          ) as string[]
          return ids
        }),
        ctx.user.id
      ])
    ]

    const smartUsers = smartUsersIds.length ? await findUsersByIds(ctx, smartUsersIds) : []
    const smartUsersMap = new Map(smartUsers.map((u) => [u.id, u]))

    for (let change of feedChangesJson.changes) {
      if (change.message) {
        change.message = mapMessage(change.message, ctx.user, smartUsersMap)
      }
    }

    return feedChangesJson
  }
)

// @shared-route
export const episodeChatMessagesAddRoute = app.post(
  '/client-chat/:feedId/messages/add',
  async (ctx, req) => {
    if (!ctx.user) {
      throw new Error('Только авторизованные пользователи имеют доступ')
    }

    const feedId = req.params.feedId as string

    const feed = await getFeedById(ctx, feedId)
    await ensureUserHaveAccessToFeed(ctx, feed, ctx.user)

    const {
      episode,
      isAutowebinar,
      autowebinarId,
      autowebinarSchedule,
      chatAccessMode,
      isFinished
    } = await resolveChatTargetContext(ctx, feedId)

    if (isFinished) {
      throw new Error('Чат закрыт. Эфир завершён.')
    }

    if (
      chatAccessMode === ChatAccessMode.AuthOnly &&
      ctx.user?.type === 'Anonymous' &&
      !ctx.user?.is('Staff')
    ) {
      throw new Error('Только авторизованные пользователи могут писать в чат')
    }

    if (chatAccessMode === ChatAccessMode.Disabled) {
      throw new Error('Чат отключён')
    }

    // Проверяем бан ДО отправки сообщения
    const ban = await checkUserBan(ctx, ctx.user!.id, req.body.episodeId)

    if (ban) {
      throw new Error(buildBanErrorMessage(ban))
    }

    // Проверяем rate-limit ДО отправки сообщения
    const rateLimitKey = `chat_${ctx.user!.id}_${req.body.episodeId}`

    if (!(await checkRateLimit(ctx, rateLimitKey, LIMITS.CHAT_MESSAGES_PER_MINUTE, 60 * 1000))) {
      const secondsLeft = await getTimeUntilNextAttempt(ctx, rateLimitKey, 60 * 1000)
      const blockedUntil = Date.now() + secondsLeft * 1000

      const userSocketId = `episode_${req.body.episodeId}_user_${ctx.user!.id}`
      try {
        await sendDataToSocket(ctx, userSocketId, {
          type: 'rate_limit',
          blockedUntil,
          secondsLeft
        })
      } catch (e) {}

      throw new Error(`Слишком частые сообщения. Подождите ${secondsLeft} сек.`)
    }

    // Валидация текста до отправки
    if (req.body.text) {
      validateText(req.body.text, 'Сообщение', LIMITS.CHAT_MESSAGE_MAX_LENGTH)

      // Запрет ссылок для обычных пользователей
      if (!ctx.user.is('Staff')) {
        const urlPattern =
          /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|ru|net|org|info|io|app|site|online|tech|pro|dev|club|store|shop|me|xyz|by|kz|ua|uk|de|fr|us)[^\s]*)/gi
        if (urlPattern.test(req.body.text)) {
          throw new Error('Ссылки в сообщениях запрещены')
        }
      }
    }

    const feedMessageJson = await feedMessagesAddHandler(ctx, feed, req.body)

    const allSmartUsersIds = [
      ...new Set(
        [
          feedMessageJson.data.added.author.id,
          feedMessageJson.data.added.replyTo?.author.id,
          ctx.user.id
        ].filter(Boolean)
      )
    ] as string[]

    const allSmartUsers = allSmartUsersIds.length ? await findUsersByIds(ctx, allSmartUsersIds) : []
    const smartUsersMap = new Map(allSmartUsers.map((u) => [u.id, u]))

    feedMessageJson.data.added.author = mapAuthor(
      feedMessageJson.data.added.author,
      ctx.user,
      smartUsersMap
    )

    if (feedMessageJson.data.added.replyTo) {
      feedMessageJson.data.added.replyTo.author = mapAuthor(
        feedMessageJson.data.added.replyTo.author,
        ctx.user,
        smartUsersMap
      )
    }

    // Вызов агента Елена для автовебинаров (только для живых сообщений от зрителей)
    if (isAutowebinar && autowebinarId && autowebinarSchedule && req.body.text) {
      try {
        const rawElapsedSeconds = req.body?.elapsedSeconds
        const parsedElapsedSeconds =
          typeof rawElapsedSeconds === 'number'
            ? rawElapsedSeconds
            : typeof rawElapsedSeconds === 'string'
              ? parseFloat(rawElapsedSeconds)
              : NaN

        await processAutowebinarChatMessageJob.scheduleJobAsap(ctx, {
          feedId,
          autowebinarId,
          autowebinarSchedule,
          messageText: req.body.text,
          userId: ctx.user!.id,
          userName: getUserDisplayName(ctx.user) || 'Зритель',
          viewerElapsedSeconds: Number.isFinite(parsedElapsedSeconds)
            ? Math.max(0, Math.floor(parsedElapsedSeconds))
            : undefined
        })
      } catch (err) {
        ctx.account.log('Error processing autowebinar chat message with agent', {
          level: 'error',
          err: err as any,
          json: { autowebinarId, userId: ctx.user?.id }
        })
      }
    } else if (isAutowebinar) {
      ctx.account.log('Skipping autowebinar agent processing', {
        level: 'info',
        json: {
          autowebinarId,
          hasSchedule: Boolean(autowebinarSchedule),
          hasText: Boolean(req.body.text)
        }
      })
    }

    return feedMessageJson
  }
)

const processAutowebinarChatMessageJob = app
  .job('process-autowebinar-chat-message')
  .body((s) => ({
    feedId: s.string(),
    autowebinarId: s.string(),
    autowebinarSchedule: s.object({
      startedAt: s.string().optional(),
      scheduledDate: s.string().optional()
    }),
    messageText: s.string(),
    userId: s.string(),
    userName: s.string(),
    viewerElapsedSeconds: s.number().optional()
  }))
  .handle(async (ctx, params) => {
    const {
      feedId,
      autowebinarId,
      autowebinarSchedule,
      messageText,
      userId,
      userName,
      viewerElapsedSeconds
    } = params

    await processAutowebinarChatMessage(ctx, {
      feedId,
      autowebinarId,
      schedule: autowebinarSchedule,
      messageText: messageText,
      userId: userId,
      userName: userName,
      viewerElapsedSeconds:
        Number.isFinite(viewerElapsedSeconds) && typeof viewerElapsedSeconds === 'number'
          ? Math.max(0, Math.floor(viewerElapsedSeconds))
          : undefined
    })
  })
