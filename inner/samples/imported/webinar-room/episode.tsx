import { jsx } from '@app/html-jsx'
import { headContent } from './styles'
import { requireAnyUser } from '@app/auth'
import { tryRunWithExclusiveLock } from '@app/sync'
import Episodes from './tables/episodes.table'
import Autowebinars from './tables/autowebinars.table'
import AutowebinarSchedules from './tables/autowebinar_schedules.table'
import { EpisodeDtoSchema } from './api/episodes'
import { awPreStartJob } from './api/autowebinar-engine'
import EpisodeLivePage from './pages/EpisodeLivePage.vue'
import AutowebinarPage from './pages/AutowebinarPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'
import { AutowebinarStatus, ScheduleStatus } from './shared/enum'

// @shared-route
export const autowebinarInstantStartRoute = app.get('/aw-start/:id', async (ctx, req) => {
  await requireAnyUser(ctx)

  const autowebinarId = req.params.id as string
  const aw = await Autowebinars.findById(ctx, autowebinarId)
  if (!aw) {
    throw new Error('Вебинар не найден')
  }
  if (aw.status !== AutowebinarStatus.Active) {
    throw new Error('Вебинар не активен')
  }

  const now = Date.now()
  const oneMinuteAgo = new Date(now - 60 * 1000)

  const lockResult = await tryRunWithExclusiveLock(
    ctx,
    `lock:autowebinar:${autowebinarId}:instant-start`,
    15000,
    async (lockCtx) => {
      // Reuse launch started within last minute
      const recentLive = await AutowebinarSchedules.findAll(lockCtx, {
        where: {
          autowebinar: autowebinarId,
          status: ScheduleStatus.Live,
          startedAt: { $gte: oneMinuteAgo }
        },
        order: [{ startedAt: 'desc' }],
        limit: 1
      })
      const recentLiveSchedule = recentLive[0]
      if (recentLiveSchedule) {
        return recentLiveSchedule.id
      }

      // Reuse just-created waiting room launch (race protection before live starts)
      const recentWaitingRoom = await AutowebinarSchedules.findAll(lockCtx, {
        where: {
          autowebinar: autowebinarId,
          status: ScheduleStatus.WaitingRoom,
          scheduledDate: { $gte: oneMinuteAgo }
        },
        order: [{ scheduledDate: 'desc' }],
        limit: 1
      })
      const recentWaitingRoomSchedule = recentWaitingRoom[0]
      if (recentWaitingRoomSchedule) {
        return recentWaitingRoomSchedule.id
      }

      // Create launch immediately and start it through existing engine flow
      const schedule = await AutowebinarSchedules.create(lockCtx, {
        autowebinar: autowebinarId,
        scheduledDate: new Date(),
        status: ScheduleStatus.Scheduled
      })

      await awPreStartJob.scheduleJobAsap(lockCtx, { scheduleId: schedule.id })
      return schedule.id
    }
  )

  if (!lockResult.success || !lockResult.result) {
    throw new Error('Не удалось подготовить запуск автовебинара')
  }

  return ctx.resp.redirect(
    episodePageRoute({ id: autowebinarId }).query({ scheduleId: lockResult.result }).url()
  )
})

// @shared-route
export const episodePageRoute = app.html('/:id', async (ctx, req) => {
  await requireAnyUser(ctx)

  const id = req.params.id as string

  // First try episodes
  const episode = await Episodes.findById(ctx, id)

  if (episode) {
    const episodeDto = EpisodeDtoSchema.parse(episode)

    return (
      <html lang="ru">
        <head>
          <title>{episode.title} — Вебинарная комната</title>
          <meta
            name="description"
            content={episode.description || 'Смотрите онлайн-трансляции и участвуйте в вебинарах'}
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
          />

          <link
            rel="icon"
            type="image/x-icon"
            href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
          />
          <link
            rel="apple-touch-icon"
            href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
          />

          <meta property="og:type" content="website" />
          <meta property="og:title" content={`${episode.title} — Вебинарная комната`} />
          <meta
            property="og:description"
            content={episode.description || 'Смотрите онлайн-трансляции и участвуйте в вебинарах'}
          />

          {headContent}
        </head>

        <body class="antialiased">
          <EpisodeLivePage episode={episodeDto} />
        </body>
      </html>
    )
  }

  // Then try autowebinars
  const autowebinar = await Autowebinars.findById(ctx, id)

  if (autowebinar) {
    if (autowebinar.status !== AutowebinarStatus.Active) {
      return (
        <html lang="ru">
          <head>
            <title>Страница не найдена — Вебинарная комната</title>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
            />
            <link
              rel="icon"
              type="image/x-icon"
              href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
            />
            {headContent}
          </head>

          <body class="antialiased">
            <NotFoundPage message="Возможно, вы перешли по неверной ссылке или мероприятие ещё не началось. Попробуйте позже или свяжитесь с организатором." />
          </body>
        </html>
      )
    }

    return (
      <html lang="ru">
        <head>
          <title>{autowebinar.title} — Вебинарная комната</title>
          <meta
            name="description"
            content={
              autowebinar.description || 'Смотрите онлайн-трансляции и участвуйте в вебинарах'
            }
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
          />

          <link
            rel="icon"
            type="image/x-icon"
            href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
          />
          <link
            rel="apple-touch-icon"
            href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
          />

          <meta property="og:type" content="website" />
          <meta property="og:title" content={`${autowebinar.title} — Вебинарная комната`} />
          <meta
            property="og:description"
            content={
              autowebinar.description || 'Смотрите онлайн-трансляции и участвуйте в вебинарах'
            }
          />

          {headContent}
        </head>

        <body class="antialiased">
          <AutowebinarPage autowebinarId={autowebinar.id} />
        </body>
      </html>
    )
  }

  return (
    <html lang="ru">
      <head>
        <title>Страница не найдена — Вебинарная комната</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        <link
          rel="icon"
          type="image/x-icon"
          href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
        />

        {headContent}
      </head>

      <body class="antialiased">
        <NotFoundPage />
      </body>
    </html>
  )
})
