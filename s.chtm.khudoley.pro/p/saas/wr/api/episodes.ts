// @shared

import { requireAccountRole } from '@app/auth'
import Episodes from '../tables/episodes.table'
import { requireAnyUser, createUnconfirmedIdentity, normalizeIdentityKey } from '@app/auth'
import { genSocketId, sendDataToSocket } from '@app/socket'
import { reporterApp } from '../shared/error-handler-middleware'
import { ChatAccessMode, EpisodeStatus, LatencyMode, FinishAction } from '../shared/enum'
import { s } from '@app/schema'
import { createFeed, getChat, getOrCreateParticipant } from '@app/feed'
import {
  episodeChatMessagesAddRoute,
  episodeChatMessagesChangesRoute,
  episodeChatMessagesGetRoute
} from './chat'
import {
  createEvent,
  enableEvent,
  completeEvent,
  updateEvent,
  type CreateEventBody
} from '@kinescope/sdk'
import { captureCustomerEvent, ContactType } from '@crm/sdk'
import { writeWorkspaceEvent, getWorkspaceEventUrl } from '@start/sdk'
import request from '@app/request'
import { formStorage } from '@app/form-storage'
import { tryRunWithExclusiveLock } from '@app/sync'
import { emitEpisodeUpdated } from './episodes-socket'

// @shared-route
export const apiEpisodesListRoute = reporterApp.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodes = await Episodes.findAll(ctx, {
    limit: 100,
    order: [{ scheduledDate: 'desc' }]
  })

  return episodes.map((e) => EpisodeDtoSchema.parse(e))
})

// @shared-route
export const apiUserUpdateNameRoute = reporterApp
  .body((s) => ({
    firstName: s.string(),
    email: s.string().optional()
  }))
  .post('/user/update-name', async (ctx, req) => {
    await requireAnyUser(ctx)

    if (!ctx.user) {
      throw new Error('Пользователь не авторизован')
    }

    await ctx.user.updateExtendedInfo(ctx, {
      firstName: req.body.firstName
    })

    if (req.body.email) {
      try {
        await createUnconfirmedIdentity(ctx, {
          userId: ctx.user.id,
          type: 'Email',
          key: normalizeIdentityKey('Email', req.body.email)
        })
      } catch (e) {
        // Identity may already exist
      }
    }

    const contacts = []
    if (req.body.email) {
      contacts.push({ type: ContactType.Email, value: req.body.email })
    }
    if (ctx.user.confirmedPhone) {
      contacts.push({ type: ContactType.Phone, value: ctx.user.confirmedPhone })
    }

    await captureCustomerEvent(ctx, {
      event: 'webinar_viewer_identified',
      customer: {
        displayName: req.body.firstName
      },
      contacts,
      appendUserContacts: ctx.user.id
    })

    await writeWorkspaceEvent(ctx, 'webinar_viewer_identified', {
      user: {
        id: ctx.user.id,
        firstName: req.body.firstName,
        email: req.body.email
      },
      customer_contacts: contacts.map((c) => ({ type: c.type, value: c.value })),
      action_param1: req.body.firstName,
      action_param2: req.body.email,
      uid: (ctx.req as any)?.cookies?.['x-chtm-uid'] || undefined
    })

    return { success: true }
  })

export const EpisodeDtoSchema = s.object({
  id: s.string(),
  title: s.string(),
  description: s.string().optional(),
  scheduledDate: s.date(),
  startedAt: s.date().optional(),
  finishedAt: s.date().optional(),
  status: s.enum(EpisodeStatus),
  thumbnail: s.string().optional(),
  viewersCount: s.number().optional(),
  resultUrl: s.string().optional(),
  resultButtonText: s.string().optional(),
  resultText: s.string().optional(),
  chatAccessMode: s.string().optional(),
  kinescopePlayerId: s.string().optional(),
  latencyMode: s.string().optional(),
  dvr: s.boolean().optional(),
  record: s.boolean().optional(),
  kinescopeFolderId: s.string().optional(),
  finishAction: s.enum(FinishAction).optional(),
  shownFormIds: s.array(s.string()).optional(),
  kinescopeId: s.string().optional(),
  streamkey: s.string().optional(),
  rtmpLink: s.string().optional(),
  playLink: s.string().optional()
})

// @shared-route
export const apiEpisodeUpcomingRoute = reporterApp.get('/upcoming', async (ctx, req) => {
  const episodes = await Episodes.findAll(ctx, {
    where: { status: [EpisodeStatus.Live, EpisodeStatus.WaitingRoom, EpisodeStatus.Scheduled] },
    order: [{ scheduledDate: 'asc' }],
    limit: 1
  })

  const liveEpisode = episodes.find((e) => e.status === EpisodeStatus.Live)
  if (liveEpisode) {
    return EpisodeDtoSchema.parse(liveEpisode)
  }

  const waitingRoomEpisode = episodes.find((e) => e.status === EpisodeStatus.WaitingRoom)
  if (waitingRoomEpisode) {
    return EpisodeDtoSchema.parse(waitingRoomEpisode)
  }

  return episodes.length > 0 ? EpisodeDtoSchema.parse(episodes[0]) : null
})

// @shared-route
export const apiEpisodeByIdRoute = reporterApp.get('/:id', async (ctx, req) => {
  const episode = await Episodes.findById(ctx, req.params.id as string)

  if (!episode) {
    throw new Error('Эфир не найден')
  }

  return { episode: EpisodeDtoSchema.parse(episode) }
})

// @shared-route
export const getEpisodeChatRoute = reporterApp.get('/:id/chat', async (ctx, req) => {
  await requireAnyUser(ctx)

  const episodeId = req.params.id as string

  const episode = await Episodes.findById(ctx, episodeId)

  if (!episode) {
    throw new Error('Эфир не найден')
  }

  if (!episode.chatFeedId) {
    throw new Error('Чат для этого эфира не найден')
  }

  await getOrCreateParticipant(ctx, episode.chatFeedId, ctx.user?.id as string, {
    muted: true,
    silent: true,
    inboxDisabled: true
  })

  const chat = await getChat(ctx, episode.chatFeedId, {
    messagesGetUrl: episodeChatMessagesGetRoute({ feedId: episode.chatFeedId }).url(),
    messagesAddUrl: episodeChatMessagesAddRoute({ feedId: episode.chatFeedId }).url(),
    messagesChangesUrl: episodeChatMessagesChangesRoute({ feedId: episode.chatFeedId }).url()
  })

  return { chat: { ...chat, episodeId: episode.id } }
})

// @shared-route
export const apiEpisodeCreateRoute = reporterApp
  .body((s) => ({
    title: s.string(),
    description: s.string().optional(),
    scheduledDate: s.date(),
    thumbnail: s.string().optional(),
    chatAccessMode: s.enum(ChatAccessMode).optional(),
    kinescopePlayerId: s.string().optional(),
    latencyMode: s.enum(LatencyMode).optional(),
    dvr: s.boolean().optional(),
    record: s.boolean().optional(),
    kinescopeFolderId: s.string().optional(),
    finishAction: s.enum(FinishAction).optional(),
    resultUrl: s.string().optional(),
    resultButtonText: s.string().optional(),
    resultText: s.string().optional()
  }))
  .post('/create', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const count = await Episodes.countBy(ctx)

    // Создаём event (трансляцию) в Kinescope
    const createEventParams: CreateEventBody = {
      name: req.body.title,
      type: 'one-time'
    }

    // Добавляем subtitle только если description заполнен и не пустая строка
    if (req.body.description && req.body.description.trim()) {
      createEventParams.subtitle = req.body.description
    }

    // Устанавливаем режим задержки (по умолчанию low - минимальная задержка)
    createEventParams.latency_mode = req.body.latencyMode || LatencyMode.Low

    // Настройка DVR (перемотка во время эфира) - в Kinescope называется time_shift
    createEventParams.time_shift = req.body.dvr !== false

    // Настройка записи эфира - сохранять ли запись после завершения
    // record принимает объект вида { parent_id: FOLDER_ID } или { parent: null } для отключения
    if (req.body.record === false) {
      createEventParams.record = { parent: null }
    } else {
      if (!req.body.kinescopeFolderId) {
        throw new Error('Для сохранения записи эфира необходимо выбрать папку Kinescope')
      }
      createEventParams.record = { parent_id: req.body.kinescopeFolderId }
    }

    // Логируем параметры перед отправкой в Kinescope
    ctx.account.log('@webinar-room Creating Kinescope event', {
      level: 'info',
      json: {
        name: createEventParams.name,
        latency_mode: createEventParams.latency_mode,
        time_shift: createEventParams.time_shift,
        record: createEventParams.record,
        kinescopeFolderId: req.body.kinescopeFolderId,
        fullParams: createEventParams
      }
    })

    const kinescopeEvent = await createEvent(ctx, createEventParams)

    const episode = await Episodes.create(ctx, {
      title: req.body.title,
      description: req.body.description,
      scheduledDate: new Date(req.body.scheduledDate),
      status: EpisodeStatus.Scheduled,
      kinescopeId: kinescopeEvent.data.id,
      streamkey: kinescopeEvent.data.streamkey,
      rtmpLink: kinescopeEvent.data.rtmp_link,
      playLink: kinescopeEvent.data.play_link,
      chatAccessMode: req.body.chatAccessMode || ChatAccessMode.Open,
      kinescopePlayerId: req.body.kinescopePlayerId,
      latencyMode: req.body.latencyMode || LatencyMode.Low,
      dvr: req.body.dvr !== false,
      record: req.body.record !== false,
      kinescopeFolderId: req.body.kinescopeFolderId,
      finishAction: req.body.finishAction || FinishAction.Page,
      resultUrl: req.body.resultUrl,
      resultButtonText: req.body.resultButtonText,
      resultText: req.body.resultText
    })

    const chatFeed = await createFeed(ctx, {
      title: `Чат для эфира #${count + 1}`,
      inboxSubjectId: 'webinar_room:' + episode.id,
      inboxExtraData: { episodeId: episode.id }
    })

    await Episodes.update(ctx, { id: episode.id, chatFeedId: chatFeed.id })

    return EpisodeDtoSchema.parse(episode)
  })

// @shared-route
export const apiEpisodeUpdateRoute = reporterApp
  .body((s) => ({
    title: s.string().optional(),
    description: s.string().optional(),
    scheduledDate: s.date().optional(),
    thumbnail: s.string().optional(),
    chatAccessMode: s.enum(ChatAccessMode).optional(),
    kinescopePlayerId: s.string().optional(),
    latencyMode: s.enum(LatencyMode).optional(),
    dvr: s.boolean().optional(),
    record: s.boolean().optional(),
    kinescopeFolderId: s.string().optional(),
    resultUrl: s.string().optional(),
    resultButtonText: s.string().optional(),
    resultText: s.string().optional(),
    finishAction: s.enum(FinishAction).optional()
  }))
  .post('/update/:id', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const oldEpisode = await Episodes.findById(ctx, req.params.id as string)

    if (!oldEpisode) {
      throw new Error('Эфир не найден')
    }

    const episode = await Episodes.update(ctx, {
      id: req.params.id as string,
      ...req.body
    })

    // Обновляем параметры в Kinescope только если трансляция ещё не запущена
    if (
      oldEpisode.kinescopeId &&
      (oldEpisode.status === EpisodeStatus.Scheduled ||
        oldEpisode.status === EpisodeStatus.WaitingRoom)
    ) {
      const updateParams: any = {}

      if (req.body.title !== undefined) {
        updateParams.name = req.body.title
      }
      if (req.body.description !== undefined) {
        updateParams.subtitle = req.body.description || ''
      }
      if (req.body.latencyMode !== undefined) {
        updateParams.latency_mode = req.body.latencyMode
      }
      if (req.body.dvr !== undefined) {
        updateParams.time_shift = req.body.dvr
      }

      // Обрабатываем изменение параметра record
      if (req.body.record !== undefined) {
        if (req.body.record === false) {
          // Отключаем запись - передаём { parent: null }
          updateParams.record = { parent: null }
        } else {
          // Включаем запись - нужна папка
          const folderId = req.body.kinescopeFolderId || episode.kinescopeFolderId
          if (!folderId) {
            throw new Error('Для включения записи эфира необходимо выбрать папку Kinescope')
          }
          updateParams.record = { parent_id: folderId }
        }
      } else if (req.body.kinescopeFolderId !== undefined && episode.record !== false) {
        // Если изменилась только папка, но запись включена - обновляем папку
        updateParams.record = { parent_id: req.body.kinescopeFolderId }
      }

      // Отправляем обновление в Kinescope если есть что обновлять
      if (Object.keys(updateParams).length > 0) {
        ctx.account.log('@webinar-room Updating Kinescope event', {
          level: 'info',
          json: {
            kinescopeId: oldEpisode.kinescopeId,
            updateParams
          }
        })

        try {
          await updateEvent(ctx, oldEpisode.kinescopeId, updateParams)
        } catch (error: any) {
          ctx.account.log('@webinar-room Kinescope updateEvent error', {
            level: 'error',
            json: { error: error.message, kinescopeId: oldEpisode.kinescopeId }
          })
          throw new Error('Ошибка обновления параметров трансляции в Kinescope: ' + error.message)
        }
      }
    }

    // Если изменился chatAccessMode, отправляем WebSocket событие
    if (
      req.body.chatAccessMode &&
      oldEpisode &&
      oldEpisode.chatAccessMode !== req.body.chatAccessMode
    ) {
      const episodeSocketId = `episode_${req.params.id}`
      await sendDataToSocket(ctx, episodeSocketId, {
        type: 'chat_access_changed',
        chatAccessMode: req.body.chatAccessMode
      })
    }

    return EpisodeDtoSchema.parse(episode)
  })

// @shared-route
export const apiEpisodeOpenRoomRoute = reporterApp.post('/open-room/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episode = await Episodes.update(ctx, {
    id: req.params.id as string,
    status: EpisodeStatus.WaitingRoom
  })

  const episodeDto = EpisodeDtoSchema.parse(episode)
  await emitEpisodeUpdated(ctx, req.params.id as string, episodeDto as any)

  return episodeDto
})

// @shared-route
export const apiEpisodeStartRoute = reporterApp.post('/start/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episode = await Episodes.findById(ctx, req.params.id as string)

  if (!episode) {
    throw new Error('Эфир не найден')
  }

  if (!episode.kinescopeId) {
    throw new Error('Kinescope Event ID не найден')
  }

  // Запускаем трансляцию в Kinescope
  await enableEvent(ctx, episode.kinescopeId)

  const updatedEpisode = await Episodes.update(ctx, {
    id: req.params.id as string,
    status: EpisodeStatus.Live,
    startedAt: new Date()
  })

  const episodeDto = EpisodeDtoSchema.parse(updatedEpisode)
  await emitEpisodeUpdated(ctx, req.params.id as string, episodeDto as any)

  return episodeDto
})

// @shared-route
export const apiEpisodeFinishRoute = reporterApp.post('/finish/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episode = await Episodes.findById(ctx, req.params.id as string)

  if (!episode) {
    throw new Error('Эфир не найден')
  }

  // Завершаем трансляцию в Kinescope (если есть kinescopeId)
  if (episode.kinescopeId) {
    try {
      await completeEvent(ctx, episode.kinescopeId)
    } catch (error: any) {
      // Если трансляция уже завершена в Kinescope (например, из-за отключения OBS),
      // это нормально — просто логируем и продолжаем обновление статуса в нашей базе
      ctx.account.log('Kinescope completeEvent error (probably already finished)', {
        level: 'info',
        json: { error: error.message, kinescopeId: episode.kinescopeId }
      })
    }
  }

  const updatedEpisode = await Episodes.update(ctx, {
    id: req.params.id as string,
    status: EpisodeStatus.Finished,
    finishedAt: new Date()
  })

  const episodeDto = EpisodeDtoSchema.parse(updatedEpisode)
  await emitEpisodeUpdated(ctx, req.params.id as string, episodeDto as any)

  return episodeDto
})

// @shared-route
export const apiEpisodeGetSocketIdRoute = reporterApp.get('/:id/socket-id', async (ctx, req) => {
  const episode = await Episodes.findById(ctx, req.params.id as string)

  if (!episode) {
    throw new Error('Эфир не найден')
  }

  const socketId = `episode_${episode.id}`
  const encodedSocketId = await genSocketId(ctx, socketId)

  return { encodedSocketId }
})

// @shared-route
export const apiEpisodeDeleteRoute = reporterApp.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const episodeId = req.params.id as string

  await Episodes.delete(ctx, episodeId)

  return { success: true }
})

// @shared-route
export const apiEpisodesGlobalSocketIdRoute = reporterApp.get(
  '/global-socket-id',
  async (ctx, req) => {
    const globalSocketId = 'episodes_global'

    const encodedSocketId = await genSocketId(ctx, globalSocketId)

    return { encodedSocketId }
  }
)

// @shared-route
export const apiEpisodeGetOnlineCountRoute = reporterApp.get(
  '/online-count/:episodeId',
  async (ctx, req) => {
    const episode = await Episodes.findById(ctx, req.params.episodeId as string)

    if (!episode) {
      return { onlineCount: 0 }
    }

    const socketId = `episode_${req.params.episodeId}`
    const encodedSocketId = await genSocketId(ctx, socketId)

    const redisKey = `socket:${encodedSocketId}:subscribers`
    const cache = (await formStorage.getItem(redisKey, null)) as unknown as {
      count: number
      expiresAt: number
    } | null

    let onlineCount = 0

    if (!cache || cache.expiresAt < Date.now()) {
      const lockResult = await tryRunWithExclusiveLock(
        ctx,
        `lock:socket:${encodedSocketId}:count`,
        15000,
        async (ctx) => {
          let lockOnlineCount = 0

          const cache = (await formStorage.getItem(redisKey, null)) as unknown as {
            count: number
            expiresAt: number
          } | null

          if (cache && cache.expiresAt > Date.now()) {
            lockOnlineCount = cache.count

            return lockOnlineCount
          }

          const onlineCountResponse = await request.get<
            { ok: true; count: number; socketId: string } | { ok: false }
          >(`https://app.msk.chatium.io/socket.io/info/${encodedSocketId}/countSubscribers`, {
            throwHttpErrors: false
          })

          if (onlineCountResponse.statusCode === 200 && onlineCountResponse.body.ok) {
            lockOnlineCount = onlineCountResponse.body.count
          } else {
            ctx.account.log('Error fetching online count from socket service', {
              level: 'error',
              json: { statusCode: onlineCountResponse.statusCode, body: onlineCountResponse.body }
            })

            // В случае ошибки возвращаем 0, чтобы не мешать работе эфира
            lockOnlineCount = 0
          }

          // Кэшируем результат на 10 секунд
          const cacheTtl = 10 * 1000

          await formStorage.setItem(redisKey, {
            count: lockOnlineCount,
            expiresAt: Date.now() + cacheTtl
          })

          return lockOnlineCount
        }
      )

      if (lockResult.success) {
        onlineCount = lockResult.result
      } else {
        onlineCount = 0
      }
    } else {
      onlineCount = cache.count
    }

    return { onlineCount }
  }
)

// @shared-route
export const apiEpisodeVisitRoute = reporterApp
  .body((s) => ({
    episodeId: s.string()
  }))
  .post('/visit', async (ctx, req) => {
    await requireAnyUser(ctx)

    if (!ctx.user) {
      throw new Error('Пользователь не авторизован')
    }

    const episode = await Episodes.findById(ctx, req.body.episodeId)
    if (!episode) {
      throw new Error('Эфир не найден')
    }

    const contacts = []
    if (ctx.user.confirmedEmail) {
      contacts.push({ type: ContactType.Email, value: ctx.user.confirmedEmail })
    }
    if (ctx.user.confirmedPhone) {
      contacts.push({ type: ContactType.Phone, value: ctx.user.confirmedPhone })
    }

    if (contacts.length === 0) {
      return { success: false, reason: 'no_contacts' }
    }

    await captureCustomerEvent(ctx, {
      event: 'webinar_episode_visit',
      customer: {
        displayName: ctx.user.displayName
      },
      contacts,
      appendUserContacts: ctx.user.id,
      payload: {
        episodeId: episode.id,
        episodeTitle: episode.title,
        episodeStatus: episode.status
      }
    })

    return { success: true }
  })

app.accountHook('@start/account-events', async (ctx, params) => {
  return [
    {
      name: 'Зритель представился в вебинарной комнате',
      description:
        'Зритель заполнил форму с именем и (опционально) email при входе в вебинарную комнату',
      url: await getWorkspaceEventUrl(ctx, 'webinar_viewer_identified'),
      icon: '👤',
      category: 'users',
      payloadMapping: {
        firstName: {
          title: 'Имя',
          fieldName: 'action_param1',
          type: 'string'
        },
        email: {
          title: 'Email',
          fieldName: 'action_param2',
          type: 'string'
        }
      }
    }
  ]
})
