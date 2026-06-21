import { requireAccountRole } from '@app/auth'
import { s } from '@app/schema'
import { reporterApp } from '../shared/error-handler-middleware'
import { AutowebinarStatus, AutowebinarMode, ChatAccessMode, FinishAction } from '../shared/enum'
import Autowebinars from '../tables/autowebinars.table'
import ScenarioEvents from '../tables/scenario_events.table'
import AutowebinarSchedules from '../tables/autowebinar_schedules.table'
import {
  getOrCreateKinescopeWebinarPlayer,
  validateAndFixAutowebinarPlayer
} from './kinescope-player'
import { awRecurrenceBootstrap } from './autowebinar-recurrence'
import { getVideoInfo } from '@app/storage'
import { publishVideo, listVideos, requestSubtitles } from '@muuvee/sdk'
import { createKnowledgeBase, insertTextToKnowledgeBase } from '@knowledge-base/sdk'

async function ensureAutowebinarKnowledgeBase(
  ctx: app.Ctx,
  aw: {
    id: string
    title?: string | null
    description?: string | null
    knowledgeBaseId?: string | null
  }
): Promise<string> {
  if (aw.knowledgeBaseId) return aw.knowledgeBaseId

  const kbTitle = aw.title?.trim() || `Автовебинар ${aw.id}`
  const kbDescription = aw.description?.trim() || `База знаний для автовебинара ${aw.id}`
  const kbResult = await createKnowledgeBase(ctx, kbTitle, { description: kbDescription })

  if (!kbResult?.ok) {
    throw new Error(`Не удалось создать базу знаний: ${kbResult?.error || 'unknown error'}`)
  }

  const knowledgeBaseId = kbResult?.knowledgeBase?.id

  if (!knowledgeBaseId) {
    throw new Error('Не удалось создать базу знаний для автовебинара')
  }

  await Autowebinars.update(ctx, {
    id: aw.id,
    knowledgeBaseId
  })

  return knowledgeBaseId
}

/**
 * Извлекает kinescopeVideoId из videoHash динамически
 * Формат hlsUrl: https://kinescope.io/.../VIDEO_ID/master.m3u8
 */
export async function extractKinescopeVideoId(
  ctx: app.Ctx,
  videoHash: string
): Promise<string | null> {
  try {
    const videoInfo = await getVideoInfo(ctx, videoHash)
    if (!videoInfo?.hlsUrl) return null

    const urlParts = videoInfo.hlsUrl.split('/')
    return urlParts[3] || null
  } catch (e) {
    ctx.account.log('extractKinescopeVideoId error', {
      level: 'warn',
      json: { videoHash, error: e.message }
    })
    return null
  }
}

// Callback для успешного получения субтитров от Muuvee
const muuveeSubtitlesSuccessCallback = app.function(
  '/muuvee-subtitles-success',
  async (ctx, params) => {
    ctx.account.log('[Muuvee] Subtitles received', {
      level: 'info',
      json: { videoId: params.video_id, subtitleLength: params.subtitle_text?.length }
    })

    // Находим автовебинар по muuveeVideoId и сохраняем субтитры
    try {
      const autowebinars = await Autowebinars.findAll(ctx, {
        where: { muuveeVideoId: params.video_id },
        limit: 1
      })

      const targetAw = autowebinars[0]
      if (targetAw) {
        await Autowebinars.update(ctx, {
          id: targetAw.id,
          subtitles: params.subtitle_text,
          subtitlesStatus: 'completed'
        })

        const knowledgeBaseId = await ensureAutowebinarKnowledgeBase(ctx, targetAw as any)
        const subtitlesText = String(params.subtitle_text || '').trim()

        if (subtitlesText) {
          const insertResult = await insertTextToKnowledgeBase(
            ctx,
            knowledgeBaseId,
            subtitlesText,
            {
              title: `Текст видео: ${targetAw.title || targetAw.id}`,
              metadata: {
                source: 'muuvee_subtitles',
                autowebinarId: targetAw.id,
                muuveeVideoId: params.video_id
              }
            }
          )

          if (!insertResult?.ok) {
            throw new Error(
              `Не удалось вставить текст в KB: ${insertResult?.error || 'unknown error'}`
            )
          }

          ctx.account.log('[Muuvee] Subtitles inserted into KB', {
            level: 'info',
            json: {
              autowebinarId: targetAw.id,
              knowledgeBaseId,
              documentId: insertResult.document?.id,
              chunksCount: insertResult.document?.chunksCount
            }
          })
        }

        ctx.account.log('[Muuvee] Subtitles saved to autowebinar', {
          level: 'info',
          json: { autowebinarId: targetAw.id, muuveeVideoId: params.video_id, knowledgeBaseId }
        })
      }
    } catch (e: any) {
      ctx.account.log('[Muuvee] Failed to save subtitles', {
        level: 'error',
        json: { error: e.message, videoId: params.video_id }
      })
    }

    return { success: true }
  }
)

// Callback для ошибки получения субтитров от Muuvee
const muuveeSubtitlesFailedCallback = reporterApp.function(
  '/muuvee-subtitles-failed',
  async (ctx, params) => {
    // Параметры уже приходят как объект: { video_id, error, error_code? }
    const errorCode = params.error_code
    const isLowBalance = errorCode === 'too_low_balance'

    ctx.account.log('[Muuvee] Subtitles failed', {
      level: 'warn',
      json: {
        videoId: params.video_id,
        error: params.error,
        errorCode,
        isLowBalance
      }
    })

    // Находим автовебинар и сохраняем ошибку
    try {
      const autowebinars = await Autowebinars.findAll(ctx, {
        where: { muuveeVideoId: params.video_id },
        limit: 1
      })

      if (autowebinars.length > 0) {
        // Формируем понятное сообщение для ошибки баланса
        let errorMessage = params.error
        if (isLowBalance) {
          errorMessage =
            'Недостаточно средств на балансе Muuvee для обработки видео. Пожалуйста, пополните баланс: ' +
            ctx.account.url('/app/muuvee')
        }

        await Autowebinars.update(ctx, {
          id: autowebinars[0].id,
          muuveeError: errorMessage,
          subtitlesStatus: 'failed'
        })

        ctx.account.log('[Muuvee] Error saved to autowebinar', {
          level: 'info',
          json: { autowebinarId: autowebinars[0].id, muuveeVideoId: params.video_id, isLowBalance }
        })
      }
    } catch (e: any) {
      ctx.account.log('[Muuvee] Failed to save error', {
        level: 'error',
        json: { error: e.message, videoId: params.video_id }
      })
    }

    return { success: true }
  }
)

// Получить список видео из Muuvee
// @shared-route
export const apiMuuveeVideosListRoute = reporterApp
  .query((s) => ({
    search: s.string().optional(),
    limit: s.number().optional(),
    offset: s.number().optional(),
    onlyTranscribated: s.boolean().optional(),
    addKinescopeId: s.boolean().optional()
  }))
  .get('/muuvee-videos', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    const addKinescopeId = Boolean(req.query.addKinescopeId)

    const result = await listVideos(ctx, {
      search: req.query.search,
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
      onlyTranscribated: req.query.onlyTranscribated,
      addPlaylistsInfo: false,
      addKinescopeId
    })

    return result
  })

// @shared-route
export const apiAutowebinarsListRoute = reporterApp.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const where: any = {}
  if (req.query.status) where.status = req.query.status

  const autowebinars = await Autowebinars.findAll(ctx, {
    where: Object.keys(where).length > 0 ? where : undefined,
    limit: 100,
    order: [{ createdAt: 'desc' }]
  })

  return autowebinars
})

// @shared-route
export const apiAutowebinarByIdRoute = reporterApp.get('/by-id/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  let aw = await Autowebinars.findById(ctx, req.params.id as string)
  if (!aw) throw new Error('Автовебинар не найден')

  // Self-heal: if subtitles are already saved but status is still processing, finalize status.
  if (aw.subtitles && aw.subtitlesStatus === 'processing') {
    aw = await Autowebinars.update(ctx, {
      id: aw.id,
      subtitlesStatus: 'completed',
      muuveeError: null
    })
  }

  // Приоритет: сохраненный kinescopeVideoId, затем динамическое извлечение из videoHash.
  let kinescopeVideoId = aw.kinescopeVideoId || null
  if (!kinescopeVideoId && aw.videoHash) {
    kinescopeVideoId = await extractKinescopeVideoId(ctx, aw.videoHash)
  }

  return {
    ...aw,
    kinescopeVideoId // Добавляем в ответ, но не храним в базе
  }
})

// @shared-route
export const apiAutowebinarCreateRoute = reporterApp
  .body((s) => ({
    title: s.string(),
    description: s.string().optional(),
    videoHash: s.string().optional(),
    muuveeVideoId: s.string().optional(),
    kinescopeVideoId: s.string().optional(),
    duration: s.number(),
    waitingRoomDuration: s.number().optional(),
    chatAccessMode: s.enum(ChatAccessMode).optional(),
    finishAction: s.enum(FinishAction).optional(),
    resultUrl: s.string().optional(),
    resultButtonText: s.string().optional(),
    resultText: s.string().optional(),
    thumbnail: s.string().optional(),
    fakeOnlineConfig: s.any().optional()
  }))
  .post('/create', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    let kinescopePlayerId: string | undefined
    try {
      kinescopePlayerId = await getOrCreateKinescopeWebinarPlayer(ctx)
    } catch (e: any) {
      ctx.account.log('@webinar-room Kinescope getOrCreatePlayer error', {
        level: 'error',
        json: { error: e.message }
      })
    }

    // Публикуем видео в Muuvee (если есть videoHash)
    let muuveeVideoId: string | undefined = req.body.muuveeVideoId
    if (req.body.videoHash && !muuveeVideoId) {
      try {
        const muuveeResult = await publishVideo(ctx, {
          title: req.body.title,
          hash: req.body.videoHash,
          channelName: 'Автовебинары', // Ленивое создание канала
          description: req.body.description,
          isPaid: true,
          requiresAuth: true,
          viewingAccess: 'bylink' as any,
          sendToIndexing: true
        })

        if (muuveeResult.success) {
          muuveeVideoId = muuveeResult.videoId
          ctx.account.log('[Muuvee] Video published', {
            level: 'info',
            json: { videoId: muuveeVideoId, title: req.body.title }
          })
        } else {
          // Проверяем ошибку баланса в тексте ошибки
          const isLowBalance =
            muuveeResult.text?.includes('too_low_balance') ||
            muuveeResult.text?.includes('balance') ||
            Object.values(muuveeResult.errors || {}).some(
              (err: any) => err?.includes('too_low_balance') || err?.includes('balance')
            )

          ctx.account.log('[Muuvee] Video publish failed', {
            level: 'warn',
            json: { error: muuveeResult.text, errors: muuveeResult.errors, isLowBalance }
          })

          // Если ошибка баланса - выбрасываем понятное сообщение
          if (isLowBalance) {
            throw new Error(
              'Недостаточно средств на балансе Muuvee для публикации видео. Пожалуйста, пополните баланс: ' +
                ctx.account.url('/app/muuvee')
            )
          }

          // Иначе общая ошибка
          throw new Error(`Ошибка публикации видео в Muuvee: ${muuveeResult.text}`)
        }
      } catch (e: any) {
        ctx.account.log('[Muuvee] Video publish error', {
          level: 'error',
          json: { error: e.message }
        })
      }
    }

    const aw = await Autowebinars.create(ctx, {
      title: req.body.title,
      description: req.body.description,
      videoHash: req.body.videoHash,
      muuveeVideoId,
      kinescopeVideoId: req.body.kinescopeVideoId,
      subtitlesStatus: muuveeVideoId ? 'processing' : undefined,
      muuveeError: undefined,
      kinescopePlayerId,
      duration: req.body.duration,
      waitingRoomDuration: req.body.waitingRoomDuration || 0,
      chatAccessMode: req.body.chatAccessMode || ChatAccessMode.Open,
      finishAction: req.body.finishAction || FinishAction.Page,
      resultUrl: req.body.resultUrl,
      resultButtonText: req.body.resultButtonText,
      resultText: req.body.resultText,
      status: AutowebinarStatus.Draft,
      mode: AutowebinarMode.Scheduled, // Устанавливаем режим по умолчанию
      thumbnail: req.body.thumbnail,
      fakeOnlineConfig: req.body.fakeOnlineConfig || []
    })

    await ensureAutowebinarKnowledgeBase(ctx, aw as any)

    // Важно: запрашиваем субтитры только после создания aw,
    // чтобы callback всегда мог найти запись по muuveeVideoId.
    if (muuveeVideoId) {
      try {
        await requestSubtitles(ctx, {
          videoId: muuveeVideoId,
          subtitles: {
            get: true,
            recieveCallbacks: {
              success: muuveeSubtitlesSuccessCallback,
              failed: muuveeSubtitlesFailedCallback
            }
          }
        })
      } catch (e: any) {
        ctx.account.log('[Muuvee] requestSubtitles error on create', {
          level: 'warn',
          json: { muuveeVideoId, autowebinarId: aw.id, error: e.message }
        })

        await Autowebinars.update(ctx, {
          id: aw.id,
          subtitlesStatus: 'failed',
          muuveeError: e.message || 'Не удалось запросить текст видео из Muuvee'
        })
      }
    }

    return aw
  })

// @shared-route
export const apiAutowebinarUpdateRoute = reporterApp
  .body((s) => ({
    title: s.string().optional(),
    description: s.string().optional(),
    videoHash: s.string().optional(),
    muuveeVideoId: s.string().optional(),
    kinescopeVideoId: s.string().optional(),
    duration: s.number().optional(),
    waitingRoomDuration: s.number().optional(),
    chatAccessMode: s.enum(ChatAccessMode).optional(),
    finishAction: s.enum(FinishAction).optional(),
    resultUrl: s.string().optional(),
    resultButtonText: s.string().optional(),
    resultText: s.string().optional(),
    thumbnail: s.string().optional(),
    fakeOnlineConfig: s.any().optional(),
    recurrence: s.any().optional()
  }))
  .post('/update/:id', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.update(ctx, {
      id: req.params.id as string,
      ...req.body
    })

    return aw
  })

// @shared-route
export const apiAutowebinarDeleteRoute = reporterApp.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const awId = req.params.id as string

  await ScenarioEvents.deleteAll(ctx, {
    where: { autowebinar: awId },
    limit: null,
    hard: true
  })

  await AutowebinarSchedules.deleteAll(ctx, {
    where: { autowebinar: awId },
    limit: null,
    hard: true
  })

  await Autowebinars.delete(ctx, awId)

  return { success: true }
})

// Смена статуса: activate (draft → active)
// @shared-route
export const apiAutowebinarActivateRoute = reporterApp.post('/activate/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const aw = await Autowebinars.findById(ctx, req.params.id as string)
  if (!aw) throw new Error('Автовебинар не найден')
  if (aw.status !== AutowebinarStatus.Draft) throw new Error('Активировать можно только черновик')

  const updated = await Autowebinars.update(ctx, {
    id: aw.id,
    status: AutowebinarStatus.Active
  })

  // Запускаем recurrence bootstrap если есть recurrence
  if (aw.mode === AutowebinarMode.Scheduled && aw.recurrence) {
    awRecurrenceBootstrap.scheduleJobAsap(ctx, { autowebinarId: aw.id })
  }

  return updated
})

// Смена статуса: archive (active → archived)
// @shared-route
export const apiAutowebinarArchiveRoute = reporterApp.post('/archive/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const aw = await Autowebinars.findById(ctx, req.params.id as string)
  if (!aw) throw new Error('Автовебинар не найден')
  if (aw.status !== AutowebinarStatus.Active)
    throw new Error('Архивировать можно только активный автовеб')

  const updated = await Autowebinars.update(ctx, {
    id: aw.id,
    status: AutowebinarStatus.Archived
  })

  return updated
})

// Смена статуса: restore (archived → draft)
// @shared-route
export const apiAutowebinarRestoreRoute = reporterApp.post('/restore/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const aw = await Autowebinars.findById(ctx, req.params.id as string)
  if (!aw) throw new Error('Автовебинар не найден')
  if (aw.status !== AutowebinarStatus.Archived)
    throw new Error('Восстановить можно только архивный автовеб')

  const updated = await Autowebinars.update(ctx, {
    id: aw.id,
    status: AutowebinarStatus.Draft
  })

  return updated
})

// Повторный запрос субтитров при ошибке
// @shared-route
export const apiAutowebinarRetrySubtitlesRoute = reporterApp.post(
  '/retry-subtitles/:id',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const aw = await Autowebinars.findById(ctx, req.params.id as string)
    if (!aw) throw new Error('Автовебинар не найден')
    if (!aw.muuveeVideoId) throw new Error('Видео Muuvee не найдено у этого автовебинара')

    await requestSubtitles(ctx, {
      videoId: aw.muuveeVideoId,
      subtitles: {
        get: true,
        recieveCallbacks: {
          success: muuveeSubtitlesSuccessCallback,
          failed: muuveeSubtitlesFailedCallback
        }
      }
    })

    await Autowebinars.update(ctx, {
      id: aw.id,
      subtitlesStatus: 'processing',
      muuveeError: null
    })

    return { success: true }
  }
)
