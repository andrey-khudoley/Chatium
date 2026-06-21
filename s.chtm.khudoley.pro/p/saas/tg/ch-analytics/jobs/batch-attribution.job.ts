// @shared-route

import { JoinEvents } from '../tables/join-events.table'
import { LinkClicks } from '../tables/link-clicks.table'
import { TrackingLinks } from '../tables/tracking-links.table'
import { BatchAttributionState } from '../tables/batch-attribution-state.table'
import { solveAssignment } from '../lib/hungarian-algorithm'
import {
  quality,
  getWeightParameters,
  likelihoodWithParameters,
  priorWithParameters
} from '../lib/attribution-weights'
import { updateWeightsForProject } from '../lib/update-weights'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import { runWithExclusiveLock } from '@app/sync'
import { cancelScheduledJob } from '@app/jobs'

/**
 * Job для периодического батч-матчинга JoinEvents с LinkClicks
 *
 * Алгоритм:
 * 1. Найти все JoinEvents со статусом 'pending' за последний час
 * 2. Для каждого канала отдельно:
 *    - Получить все активные LinkClicks (clickedAt <= joinedAt < expiresAt)
 *    - Построить матрицу весов W(i,j) = -log(score) для каждой пары (join, linkClick)
 *    - Запустить венгерский алгоритм
 *    - Применить назначения: обновить JoinEvents и LinkClicks
 * 3. Пометить истёкшие LinkClicks как неактивные
 * 4. Обновить веса в AttributionWeights на основе новых данных
 * 5. Запланировать следующее выполнение через 30-60 секунд
 */
const DEFAULT_WINDOW_MS = 60 * 60 * 1000 // 1 час
const MAX_WINDOW_MS = 4 * 60 * 60 * 1000 // 4 часа максимум
const JOB_SCHEDULE_DELAY_SECONDS = 45
const JOB_STATE_KEY = 'batch-attribution-global'

const MAX_PENDING_JOIN_EVENTS = 2000
const MAX_JOIN_EVENTS_PER_CHANNEL = 300
const MAX_LINK_CLICKS_PER_CHANNEL = 600

async function getOrCreateJobState(ctx: RichUgcCtx): Promise<any> {
  const existing = await BatchAttributionState.findOneBy(ctx, { key: JOB_STATE_KEY })
  if (existing) {
    return existing
  }

  return BatchAttributionState.create(ctx, {
    key: JOB_STATE_KEY,
    lastRunAt: null,
    nextRunAt: null,
    nextTaskId: null
  })
}

async function updateJobState(ctx: RichUgcCtx, updates: Partial<any>): Promise<void> {
  const existing = await BatchAttributionState.findOneBy(ctx, { key: JOB_STATE_KEY })
  if (existing) {
    await BatchAttributionState.update(ctx, {
      id: existing.id,
      ...updates
    })
    return
  }

  await BatchAttributionState.create(ctx, {
    key: JOB_STATE_KEY,
    ...updates
  })
}

async function getActivityWindowMs(
  ctx: RichUgcCtx,
  projectId: string,
  channelId: string
): Promise<number> {
  let activityWindowMs = DEFAULT_WINDOW_MS
  try {
    const weightParameters = await getWeightParameters(ctx, projectId, channelId)

    if (weightParameters.avgConversionTime > 0) {
      const adaptiveWindowMs = weightParameters.avgConversionTime * 3 * 1000
      activityWindowMs = Math.min(MAX_WINDOW_MS, Math.max(DEFAULT_WINDOW_MS, adaptiveWindowMs))
    }
  } catch (error: any) {
    Debug.warn(ctx, `[batch-attribution] Не удалось получить avg_conversion_time: ${error.message}`)
  }

  return activityWindowMs
}

async function expireStaleJoinEvents(ctx: RichUgcCtx, cutoffDate: Date): Promise<number> {
  const staleJoinEvents = await JoinEvents.findAll(ctx, {
    where: {
      status: 'pending',
      joinedAt: { $lt: cutoffDate }
    },
    limit: 1000
  })

  if (staleJoinEvents.length === 0) {
    return 0
  }

  for (const joinEvent of staleJoinEvents) {
    await JoinEvents.update(ctx, {
      id: joinEvent.id,
      status: 'expired'
    })
  }

  return staleJoinEvents.length
}

export const batchAttributionJob = app.job('/batch-attribution', async (ctx, params) => {
  try {
    await applyDebugLevel(ctx, 'jobs/batch-attribution')
    Debug.info(ctx, '[batch-attribution] Начало выполнения job для батч-матчинга')

    return await runWithExclusiveLock(ctx, 'batch-attribution-job-global', {}, async () => {
      const now = new Date()
      await updateJobState(ctx, { lastRunAt: now, nextRunAt: null, nextTaskId: null })

      // Шаг 0: Истекающие JoinEvents, чтобы не держать вечные pending
      const expireBefore = new Date(now.getTime() - MAX_WINDOW_MS)
      const expiredJoinEvents = await expireStaleJoinEvents(ctx, expireBefore)
      if (expiredJoinEvents > 0) {
        Debug.info(ctx, `[batch-attribution] Помечено истёкших JoinEvents: ${expiredJoinEvents}`)
      }

      // Шаг 1: Найти все JoinEvents со статусом 'pending' за окно активности
      // ВАЖНО: Исключаем JoinEvents с attributionMethod: 'deterministic' и 'unknown', так как:
      // - 'deterministic': предназначены только для детерминированной атрибуции
      // - 'unknown': используются для закрытых каналов без успешной детерминированной атрибуции
      const windowStart = new Date(now.getTime() - MAX_WINDOW_MS)

      const allPendingJoinEvents = await JoinEvents.findAll(ctx, {
        where: {
          status: 'pending',
          joinedAt: { $gte: windowStart }
        },
        order: { joinedAt: 'asc' },
        limit: MAX_PENDING_JOIN_EVENTS
      })

      if (allPendingJoinEvents.length >= MAX_PENDING_JOIN_EVENTS) {
        Debug.warn(
          ctx,
          `[batch-attribution] Достигнут лимит pending JoinEvents (${MAX_PENDING_JOIN_EVENTS}), обработка будет урезана`
        )
      }

      // Фильтруем: исключаем события с attributionMethod: 'deterministic' и 'unknown'
      const pendingJoinEvents = allPendingJoinEvents.filter(
        (event) =>
          event.attributionMethod !== 'deterministic' && event.attributionMethod !== 'unknown'
      )

      const excludedDeterministicCount = allPendingJoinEvents.filter(
        (e) => e.attributionMethod === 'deterministic'
      ).length
      const excludedUnknownCount = allPendingJoinEvents.filter(
        (e) => e.attributionMethod === 'unknown'
      ).length
      const totalExcluded = excludedDeterministicCount + excludedUnknownCount

      if (totalExcluded > 0) {
        if (excludedDeterministicCount > 0) {
          Debug.info(
            ctx,
            `[batch-attribution] Исключено ${excludedDeterministicCount} JoinEvents с attributionMethod: 'deterministic' (предназначены только для детерминированной атрибуции)`
          )
        }
        if (excludedUnknownCount > 0) {
          Debug.info(
            ctx,
            `[batch-attribution] Исключено ${excludedUnknownCount} JoinEvents с attributionMethod: 'unknown' (закрытые каналы, не предназначены для батч-матчинга)`
          )
        }
      }

      const pendingCount = pendingJoinEvents.length
      Debug.info(ctx, `[batch-attribution] Найдено pending JoinEvents: ${pendingCount}`)

      if (pendingCount === 0) {
        // Нет событий для обработки - планируем следующее выполнение
        await scheduleNextRun(ctx)
        return {
          success: true,
          processed: 0,
          attributed: 0,
          message: 'Нет pending JoinEvents для обработки'
        }
      }

      // ДЕДУПЛИКАЦИЯ: Для каждого пользователя в каждом канале оставляем только первое (самое раннее) событие
      // Это предотвращает двойную атрибуцию при повторном вступлении пользователя
      const deduplicatedJoinEvents: typeof pendingJoinEvents = []
      const seenUsersByChannel = new Map<string, Set<string>>() // channelKey -> Set<userId>

      // События уже отсортированы по joinedAt ASC, поэтому первое событие - самое раннее
      for (const joinEvent of pendingJoinEvents) {
        const channelKey = `${joinEvent.chatId}:${joinEvent.projectId}`

        if (!seenUsersByChannel.has(channelKey)) {
          seenUsersByChannel.set(channelKey, new Set())
        }

        const seenUsers = seenUsersByChannel.get(channelKey)!

        // Если пользователь уже был обработан для этого канала, пропускаем
        if (seenUsers.has(joinEvent.userId)) {
          Debug.info(
            ctx,
            `[batch-attribution] Пропускаем дублирующее событие для userId=${joinEvent.userId} в канале ${joinEvent.chatId}`
          )
          continue
        }

        seenUsers.add(joinEvent.userId)
        deduplicatedJoinEvents.push(joinEvent)
      }

      const deduplicatedCount = pendingJoinEvents.length - deduplicatedJoinEvents.length
      if (deduplicatedCount > 0) {
        Debug.info(
          ctx,
          `[batch-attribution] Дедуплицировано ${deduplicatedCount} событий (дубликаты пользователей)`
        )
      }

      // Группируем дедуплицированные JoinEvents по каналам (chatId)
      const joinEventsByChannel = new Map<string, typeof deduplicatedJoinEvents>()
      for (const joinEvent of deduplicatedJoinEvents) {
        const channelKey = `${joinEvent.chatId}:${joinEvent.projectId}`
        if (!joinEventsByChannel.has(channelKey)) {
          joinEventsByChannel.set(channelKey, [])
        }
        joinEventsByChannel.get(channelKey)!.push(joinEvent)
      }

      Debug.info(
        ctx,
        `[batch-attribution] JoinEvents сгруппированы по ${joinEventsByChannel.size} каналам`
      )

      let totalAttributed = 0
      let totalErrors = 0

      // Шаг 2: Для каждого канала обрабатываем отдельно
      for (const [channelKey, joinEvents] of joinEventsByChannel) {
        const [chatId, projectId] = channelKey.split(':')
        const limitedJoinEvents =
          joinEvents.length > MAX_JOIN_EVENTS_PER_CHANNEL
            ? joinEvents.slice(0, MAX_JOIN_EVENTS_PER_CHANNEL)
            : joinEvents

        try {
          if (limitedJoinEvents.length !== joinEvents.length) {
            Debug.warn(
              ctx,
              `[batch-attribution] Канал ${chatId}: JoinEvents урезаны до ${MAX_JOIN_EVENTS_PER_CHANNEL} (из ${joinEvents.length})`
            )
          }

          Debug.info(
            ctx,
            `[batch-attribution] Обработка канала ${chatId}, JoinEvents: ${limitedJoinEvents.length}`
          )

          const result = await processChannelAttribution(ctx, {
            chatId,
            projectId,
            joinEvents: limitedJoinEvents
          })

          totalAttributed += result.attributed
          totalErrors += result.errors

          Debug.info(
            ctx,
            `[batch-attribution] Канал ${chatId}: атрибутировано ${result.attributed}, ошибок ${result.errors}`
          )
        } catch (error: any) {
          Debug.error(
            ctx,
            `[batch-attribution] Ошибка обработки канала ${chatId}: ${error.message}`,
            'E_BATCH_ATTRIBUTION_CHANNEL_ERROR'
          )
          totalErrors += limitedJoinEvents.length
        }
      }

      // Шаг 3: Пометить истёкшие LinkClicks (expiresAt < now)
      await markExpiredLinkClicks(ctx)

      // Шаг 4: Обновить веса в AttributionWeights на основе новых данных
      // Обновляем веса для каждого проекта/канала, который был обработан
      if (totalAttributed > 0) {
        const processedProjects = new Set<string>()

        for (const [channelKey] of joinEventsByChannel) {
          const [chatId, projectId] = channelKey.split(':')
          const projectChannelKey = `${projectId}:${chatId}`

          if (!processedProjects.has(projectChannelKey)) {
            processedProjects.add(projectChannelKey)

            try {
              // Обновляем веса на основе новых данных об атрибуции
              await updateWeightsForProject(ctx, projectId, chatId)
              Debug.info(
                ctx,
                `[batch-attribution] ✅ Веса обновлены для проекта ${projectId}, канал ${chatId}`
              )
            } catch (error: any) {
              Debug.warn(
                ctx,
                `[batch-attribution] Ошибка обновления весов для проекта ${projectId}: ${error.message}`
              )
            }
          }
        }
      }

      // Шаг 5: Планируем следующее выполнение
      await scheduleNextRun(ctx)

      Debug.info(
        ctx,
        `[batch-attribution] Обработка завершена: атрибутировано ${totalAttributed}, ошибок ${totalErrors}`
      )

      return {
        success: true,
        processed: pendingCount,
        attributed: totalAttributed,
        errors: totalErrors
      }
    })
  } catch (error: any) {
    Debug.error(
      ctx,
      `[batch-attribution] Критическая ошибка выполнения job: ${error.message}`,
      'E_BATCH_ATTRIBUTION_JOB_ERROR'
    )
    Debug.error(ctx, `[batch-attribution] Stack trace: ${error.stack || 'N/A'}`)

    // Планируем следующее выполнение даже при ошибке
    try {
      await scheduleNextRun(ctx)
    } catch (scheduleError: any) {
      Debug.error(
        ctx,
        `[batch-attribution] Ошибка планирования следующего выполнения: ${scheduleError.message}`,
        'E_BATCH_ATTRIBUTION_SCHEDULE_ERROR'
      )
    }

    return {
      success: false,
      error: error.message
    }
  }
})

/**
 * Обрабатывает атрибуцию для одного канала
 */
async function processChannelAttribution(
  ctx: RichUgcCtx,
  params: {
    chatId: string
    projectId: string
    joinEvents: any[]
  }
): Promise<{ attributed: number; errors: number }> {
  const { chatId, projectId, joinEvents } = params

  // Получаем TrackingLinks для данного канала
  // ОПТИМИЗАЦИЯ: сначала получаем TrackingLinks, затем загружаем только связанные LinkClicks
  const trackingLinks = await TrackingLinks.findAll(ctx, {
    where: {
      projectId,
      channelId: chatId
    }
  })

  if (trackingLinks.length === 0) {
    Debug.info(ctx, `[batch-attribution] Нет TrackingLinks для канала ${chatId}, пропускаем`)
    return { attributed: 0, errors: 0 }
  }

  const trackingLinksMap = new Map(trackingLinks.map((tl) => [tl.id, tl]))
  const trackingLinkIds = trackingLinks.map((tl) => tl.id)

  const now = new Date()
  const activityWindowMs = await getActivityWindowMs(ctx, projectId, chatId)
  Debug.info(
    ctx,
    `[batch-attribution] Используем окно активности: ${(activityWindowMs / 1000 / 60).toFixed(1)} мин`
  )

  // Фильтруем JoinEvents, которые уже истекли для этого канала
  const validJoinEvents: typeof joinEvents = []
  let expiredJoinEventsCount = 0

  for (const joinEvent of joinEvents) {
    const joinedAt =
      typeof joinEvent.joinedAt === 'string' ? new Date(joinEvent.joinedAt) : joinEvent.joinedAt

    if (now.getTime() - joinedAt.getTime() > activityWindowMs) {
      await JoinEvents.update(ctx, {
        id: joinEvent.id,
        status: 'expired'
      })
      expiredJoinEventsCount++
      continue
    }

    validJoinEvents.push(joinEvent)
  }

  if (expiredJoinEventsCount > 0) {
    Debug.info(
      ctx,
      `[batch-attribution] Помечено истёкших JoinEvents для канала ${chatId}: ${expiredJoinEventsCount}`
    )
  }

  if (validJoinEvents.length === 0) {
    Debug.info(ctx, `[batch-attribution] Все JoinEvents для канала ${chatId} истекли, пропускаем`)
    return { attributed: 0, errors: 0 }
  }

  const weightParameters = await getWeightParameters(ctx, projectId, chatId)
  const priorCache = new Map<string, number>()
  const priorWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const getPriorForTrackingLink = async (trackingLinkId: string): Promise<number> => {
    if (priorCache.has(trackingLinkId)) {
      return priorCache.get(trackingLinkId)!
    }

    const clicksCount = await LinkClicks.countBy(ctx, {
      linkId: trackingLinkId,
      clickedAt: { $gte: priorWindowStart }
    })

    const joinsCount = await JoinEvents.countBy(ctx, {
      attributedToTrackingLinkId: trackingLinkId,
      status: 'attributed',
      joinedAt: { $gte: priorWindowStart }
    })

    const priorValue = priorWithParameters(clicksCount, joinsCount, {
      alpha: weightParameters.alpha,
      beta: weightParameters.beta
    })

    priorCache.set(trackingLinkId, priorValue)
    return priorValue
  }

  const getScoreValue = async (linkClick: any, joinEvent: any): Promise<number> => {
    const clickedAt =
      typeof linkClick.clickedAt === 'string' ? new Date(linkClick.clickedAt) : linkClick.clickedAt
    const joinedAt =
      typeof joinEvent.joinedAt === 'string' ? new Date(joinEvent.joinedAt) : joinEvent.joinedAt

    const deltaTSeconds = (joinedAt.getTime() - clickedAt.getTime()) / 1000
    const likelihoodValue = likelihoodWithParameters(deltaTSeconds, {
      lambda: weightParameters.lambda,
      tauFast: weightParameters.tauFast,
      tauSlow: weightParameters.tauSlow
    })

    const priorValue = await getPriorForTrackingLink(linkClick.linkId)
    const qualityValue = quality(linkClick.queryParams)

    const scoreValue = priorValue * likelihoodValue * qualityValue
    return Math.max(0, Math.min(1, scoreValue))
  }

  // Получаем только LinkClicks для данного канала (через linkId)
  // ОПТИМИЗАЦИЯ: загружаем только необходимые LinkClicks вместо всех
  const linkClicksWindowStart = new Date(now.getTime() - activityWindowMs)
  const allLinkClicks = await LinkClicks.findAll(ctx, {
    where: {
      linkId: trackingLinkIds, // Фильтрация по массиву ID (IN-запрос)
      subscribedAt: null,
      clickedAt: { $gte: linkClicksWindowStart },
      $or: [{ status: null }, { status: 'active' }]
    },
    limit: 10000
  })

  // Собираем все уникальные активные LinkClicks для всех JoinEvents
  // Используем Set для дедупликации по ID, чтобы избежать двойной атрибуции
  let allActiveLinkClicksSet = new Set<string>()
  const activeLinkClicksByJoinEvent = new Map<number, Set<string>>()

  for (let i = 0; i < validJoinEvents.length; i++) {
    const joinEvent = validJoinEvents[i]
    const joinedAt =
      typeof joinEvent.joinedAt === 'string' ? new Date(joinEvent.joinedAt) : joinEvent.joinedAt

    const joinEventActiveLinkClickIds = new Set<string>()

    for (const linkClick of allLinkClicks) {
      // Пропускаем уже атрибутированные LinkClicks
      if (linkClick.subscribedAt) {
        continue
      }
      if (linkClick.status === 'expired') {
        continue
      }

      // Получаем TrackingLink для вычисления expiresAt
      const trackingLink = trackingLinksMap.get(linkClick.linkId)
      if (!trackingLink || !trackingLink.inviteLinkCreatedAt) {
        continue
      }

      const clickedAt =
        typeof linkClick.clickedAt === 'string'
          ? new Date(linkClick.clickedAt)
          : linkClick.clickedAt

      const inviteLinkCreatedAt =
        typeof trackingLink.inviteLinkCreatedAt === 'string'
          ? new Date(trackingLink.inviteLinkCreatedAt)
          : trackingLink.inviteLinkCreatedAt

      // expiresAt = min(inviteLinkCreatedAt + адаптивное_окно, revokedAt)
      // АДАПТИВНОЕ ОКНО: используем вычисленное окно вместо фиксированного 1 часа
      let expiresAt = new Date(inviteLinkCreatedAt.getTime() + activityWindowMs)
      if (trackingLink.revokedAt) {
        const revokedAt =
          typeof trackingLink.revokedAt === 'string'
            ? new Date(trackingLink.revokedAt)
            : trackingLink.revokedAt
        expiresAt = new Date(Math.min(expiresAt.getTime(), revokedAt.getTime()))
      }

      // Проверяем активность: clickedAt <= joinedAt < expiresAt
      if (clickedAt <= joinedAt && joinedAt < expiresAt) {
        // Дополнительная проверка: LinkClick должен быть для того же канала
        // (через TrackingLink)
        if (trackingLink.channelId === chatId) {
          joinEventActiveLinkClickIds.add(linkClick.id)
          allActiveLinkClicksSet.add(linkClick.id)
        }
      }
    }

    activeLinkClicksByJoinEvent.set(i, joinEventActiveLinkClickIds)
  }

  // Если нет активных LinkClicks, пропускаем канал
  if (allActiveLinkClicksSet.size === 0) {
    Debug.info(ctx, `[batch-attribution] Нет активных LinkClicks для канала ${chatId}, пропускаем`)
    return { attributed: 0, errors: 0 }
  }

  // Создаём глобальную карту LinkClick ID -> индекс столбца для всех уникальных активных LinkClicks
  // Это гарантирует, что каждый LinkClick имеет один и тот же индекс столбца во всех строках матрицы
  const allActiveLinkClickIds = Array.from(allActiveLinkClicksSet)
  const linkClickIdToColumnIndex = new Map<string, number>()
  const columnIndexToLinkClickId = new Map<number, string>()

  for (let colIndex = 0; colIndex < allActiveLinkClickIds.length; colIndex++) {
    const linkClickId = allActiveLinkClickIds[colIndex]
    linkClickIdToColumnIndex.set(linkClickId, colIndex)
    columnIndexToLinkClickId.set(colIndex, linkClickId)
  }

  // Создаём карту LinkClick ID -> LinkClick объект для быстрого доступа
  const linkClickById = new Map<string, any>()
  for (const linkClick of allLinkClicks) {
    if (allActiveLinkClicksSet.has(linkClick.id)) {
      linkClickById.set(linkClick.id, linkClick)
    }
  }

  if (allActiveLinkClicksSet.size > MAX_LINK_CLICKS_PER_CHANNEL) {
    const sortedActiveIds = Array.from(allActiveLinkClicksSet).sort((a, b) => {
      const aClick = linkClickById.get(a)
      const bClick = linkClickById.get(b)
      const aTime = aClick?.clickedAt ? new Date(aClick.clickedAt).getTime() : 0
      const bTime = bClick?.clickedAt ? new Date(bClick.clickedAt).getTime() : 0
      return bTime - aTime
    })

    const limitedIds = new Set(sortedActiveIds.slice(0, MAX_LINK_CLICKS_PER_CHANNEL))
    allActiveLinkClicksSet = limitedIds

    for (const [rowIndex, idsSet] of activeLinkClicksByJoinEvent.entries()) {
      const filtered = new Set<string>()
      for (const id of idsSet) {
        if (limitedIds.has(id)) {
          filtered.add(id)
        }
      }
      activeLinkClicksByJoinEvent.set(rowIndex, filtered)
    }

    Debug.warn(
      ctx,
      `[batch-attribution] Канал ${chatId}: активные LinkClicks урезаны до ${MAX_LINK_CLICKS_PER_CHANNEL}`
    )
  }

  if (allActiveLinkClicksSet.size === 0) {
    Debug.info(
      ctx,
      `[batch-attribution] После ограничения LinkClicks нет активных кандидатов для канала ${chatId}`
    )
    return { attributed: 0, errors: 0 }
  }

  Debug.info(
    ctx,
    `[batch-attribution] Найдено ${allActiveLinkClicksSet.size} уникальных активных LinkClicks для канала ${chatId}`
  )

  // Построение матрицы весов с глобальными индексами столбцов
  // ВАЖНО: Каждый столбец соответствует одному и тому же LinkClick для всех строк
  const costMatrix: number[][] = []

  for (let i = 0; i < validJoinEvents.length; i++) {
    const joinEvent = validJoinEvents[i]
    const joinEventActiveLinkClickIds = activeLinkClicksByJoinEvent.get(i) || new Set()

    // Создаём строку матрицы с фиксированным количеством столбцов (по количеству всех уникальных LinkClicks)
    const row: number[] = new Array(allActiveLinkClickIds.length).fill(1e10) // По умолчанию высокая стоимость

    // Заполняем строку cost-ами только для активных LinkClicks этого JoinEvent
    for (const linkClickId of joinEventActiveLinkClickIds) {
      const colIndex = linkClickIdToColumnIndex.get(linkClickId)
      if (colIndex === undefined) {
        Debug.warn(
          ctx,
          `[batch-attribution] LinkClick ID ${linkClickId} не найден в глобальной карте, пропускаем`
        )
        continue
      }

      const linkClick = linkClickById.get(linkClickId)
      if (!linkClick) {
        Debug.warn(
          ctx,
          `[batch-attribution] LinkClick объект не найден для ID ${linkClickId}, пропускаем`
        )
        continue
      }

      try {
        const scoreValue = await getScoreValue(linkClick, joinEvent)

        // Преобразуем score в cost: -log(score)
        // Используем небольшое epsilon чтобы избежать log(0)
        const epsilon = 1e-10
        const cost = -Math.log(Math.max(scoreValue, epsilon))
        row[colIndex] = cost
      } catch (error: any) {
        Debug.error(
          ctx,
          `[batch-attribution] Ошибка вычисления score для пары (joinEvent=${joinEvent.id}, linkClick=${linkClick.id}): ${error.message}`
        )
        // Используем высокую стоимость для ошибок (уже установлено по умолчанию)
      }
    }

    costMatrix.push(row)
  }

  Debug.info(
    ctx,
    `[batch-attribution] Построена матрица весов: ${costMatrix.length}x${allActiveLinkClickIds.length}`
  )

  // Запускаем венгерский алгоритм
  const assignment = solveAssignment(costMatrix)

  Debug.info(
    ctx,
    `[batch-attribution] Венгерский алгоритм завершён, назначений: ${assignment.filter((a) => a !== -1).length}`
  )

  // Применяем назначения используя глобальную карту столбцов
  let attributed = 0
  let errors = 0

  for (let i = 0; i < validJoinEvents.length; i++) {
    const joinEvent = validJoinEvents[i]
    const assignedColumnIndex = assignment[i]

    if (assignedColumnIndex === -1 || assignedColumnIndex >= allActiveLinkClickIds.length) {
      // Нет назначения или индекс выходит за пределы глобальной карты
      continue
    }

    // Получаем LinkClick по глобальному индексу столбца
    const assignedLinkClickId = columnIndexToLinkClickId.get(assignedColumnIndex)
    if (!assignedLinkClickId) {
      Debug.warn(
        ctx,
        `[batch-attribution] LinkClick ID не найден для индекса столбца ${assignedColumnIndex}, пропускаем`
      )
      continue
    }

    const assignedLinkClick = linkClickById.get(assignedLinkClickId)
    if (!assignedLinkClick) {
      Debug.warn(
        ctx,
        `[batch-attribution] LinkClick объект не найден для ID ${assignedLinkClickId}, пропускаем`
      )
      continue
    }

    // Проверяем, что этот LinkClick действительно активен для данного JoinEvent
    // Это дополнительная защита (хотя венгерский алгоритм уже гарантирует оптимальность)
    const joinEventActiveLinkClickIds = activeLinkClicksByJoinEvent.get(i) || new Set()
    if (!joinEventActiveLinkClickIds.has(assignedLinkClickId)) {
      // Венгерский алгоритм назначил неактивный LinkClick (маловероятно, но возможно из-за выравнивания матрицы)
      Debug.warn(
        ctx,
        `[batch-attribution] Назначенный LinkClick ${assignedLinkClickId} не активен для JoinEvent ${joinEvent.id}, пропускаем`
      )
      continue
    }

    try {
      // Получаем TrackingLink для получения trackingLinkId
      const trackingLink = trackingLinksMap.get(assignedLinkClick.linkId)
      if (!trackingLink) {
        Debug.warn(
          ctx,
          `[batch-attribution] TrackingLink не найден для linkId=${assignedLinkClick.linkId}`
        )
        errors++
        continue
      }

      // Вычисляем confidence на основе score
      const scoreValue = await getScoreValue(assignedLinkClick, joinEvent)

      // Обновляем JoinEvent
      await JoinEvents.update(ctx, {
        id: joinEvent.id,
        status: 'attributed',
        attributionMethod: 'probabilistic',
        confidence: scoreValue,
        attributedToLinkClickId: assignedLinkClick.id,
        attributedToTrackingLinkId: trackingLink.id
      })

      // Атомарно обновляем LinkClick с эксклюзивной блокировкой
      // Это предотвращает race condition при параллельном выполнении job
      const lockKey = `batch-attribution-linkclick-${assignedLinkClick.id}`
      let wasAttributed = false

      await runWithExclusiveLock(ctx, lockKey, {}, async () => {
        // Проверяем, что LinkClick ещё не атрибутирован
        const currentLinkClick = await LinkClicks.findById(ctx, assignedLinkClick.id)
        if (!currentLinkClick || currentLinkClick.subscribedAt) {
          Debug.warn(
            ctx,
            `[batch-attribution] LinkClick ${assignedLinkClick.id} уже атрибутирован другим процессом`
          )
          return
        }

        // Обновляем LinkClick
        await LinkClicks.update(ctx, {
          id: assignedLinkClick.id,
          subscribedAt:
            typeof joinEvent.joinedAt === 'string'
              ? new Date(joinEvent.joinedAt)
              : joinEvent.joinedAt,
          subscriberTgId: joinEvent.userId,
          subscriberName: joinEvent.userName,
          status: 'subscribed'
        })

        wasAttributed = true
      })

      // Если LinkClick уже был атрибутирован другим процессом, откатываем JoinEvent
      if (!wasAttributed) {
        Debug.warn(
          ctx,
          `[batch-attribution] Откатываем JoinEvent ${joinEvent.id}, так как LinkClick уже атрибутирован`
        )
        await JoinEvents.update(ctx, {
          id: joinEvent.id,
          status: 'pending',
          attributionMethod: 'probabilistic',
          confidence: undefined,
          attributedToLinkClickId: undefined,
          attributedToTrackingLinkId: undefined
        })
        continue
      }

      attributed++

      Debug.info(
        ctx,
        `[batch-attribution] ✅ Атрибутировано: joinEvent=${joinEvent.id} → linkClick=${assignedLinkClick.id}, confidence=${scoreValue.toFixed(4)}`
      )
    } catch (error: any) {
      Debug.error(
        ctx,
        `[batch-attribution] Ошибка применения назначения (joinEvent=${joinEvent.id}, linkClick=${assignedLinkClick?.id}): ${error.message}`
      )
      errors++
    }
  }

  return { attributed, errors }
}

/**
 * Помечает истёкшие LinkClicks (expiresAt < now)
 * LinkClick истёк если inviteLinkCreatedAt + окно активности < now
 */
async function markExpiredLinkClicks(ctx: RichUgcCtx): Promise<void> {
  const now = new Date()

  // Получаем все LinkClicks без subscribedAt
  const unsubscribedLinkClicks = await LinkClicks.findAll(ctx, {
    where: {
      subscribedAt: null,
      $or: [{ status: null }, { status: 'active' }]
    },
    limit: 10000
  })

  Debug.info(
    ctx,
    `[batch-attribution] Проверка истёкших LinkClicks: найдено ${unsubscribedLinkClicks.length} без подписки`
  )

  let expiredCount = 0

  const linkIds = Array.from(new Set(unsubscribedLinkClicks.map((click) => click.linkId)))
  const trackingLinks =
    linkIds.length > 0
      ? await TrackingLinks.findAll(ctx, { where: { id: linkIds }, limit: linkIds.length })
      : []
  const trackingLinksMap = new Map(trackingLinks.map((tl) => [tl.id, tl]))
  const activityWindowCache = new Map<string, number>()

  for (const linkClick of unsubscribedLinkClicks) {
    try {
      // Получаем TrackingLink для вычисления expiresAt
      const trackingLink = trackingLinksMap.get(linkClick.linkId)

      if (!trackingLink || !trackingLink.inviteLinkCreatedAt) {
        continue
      }

      const inviteLinkCreatedAt =
        typeof trackingLink.inviteLinkCreatedAt === 'string'
          ? new Date(trackingLink.inviteLinkCreatedAt)
          : trackingLink.inviteLinkCreatedAt

      const activityWindowKey = `${trackingLink.projectId}:${trackingLink.channelId}`
      let activityWindowMs = activityWindowCache.get(activityWindowKey)
      if (activityWindowMs === undefined) {
        activityWindowMs = await getActivityWindowMs(
          ctx,
          trackingLink.projectId,
          trackingLink.channelId
        )
        activityWindowCache.set(activityWindowKey, activityWindowMs)
      }

      // expiresAt = min(inviteLinkCreatedAt + окно активности, revokedAt)
      let expiresAt = new Date(inviteLinkCreatedAt.getTime() + activityWindowMs)
      if (trackingLink.revokedAt) {
        const revokedAt =
          typeof trackingLink.revokedAt === 'string'
            ? new Date(trackingLink.revokedAt)
            : trackingLink.revokedAt
        expiresAt = new Date(Math.min(expiresAt.getTime(), revokedAt.getTime()))
      }

      if (expiresAt < now) {
        expiredCount++
        await LinkClicks.update(ctx, {
          id: linkClick.id,
          status: 'expired'
        })
        Debug.info(
          ctx,
          `[batch-attribution] LinkClick ${linkClick.id} истёк (expiresAt=${expiresAt.toISOString()}, revokedAt=${trackingLink.revokedAt ? 'yes' : 'no'})`
        )
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[batch-attribution] Ошибка проверки истечения LinkClick ${linkClick.id}: ${error.message}`
      )
    }
  }

  Debug.info(ctx, `[batch-attribution] Найдено истёкших LinkClicks: ${expiredCount}`)
}

/**
 * Планирует следующее выполнение job через 30-60 секунд
 */
async function scheduleNextRun(ctx: RichUgcCtx): Promise<void> {
  await runWithExclusiveLock(ctx, 'batch-attribution-schedule', {}, async () => {
    const state = await getOrCreateJobState(ctx)
    const now = new Date()

    if (state?.nextRunAt && state?.nextTaskId) {
      const nextRunAtDate = new Date(state.nextRunAt)
      if (nextRunAtDate > now) {
        Debug.info(
          ctx,
          `[batch-attribution] Следующий запуск уже запланирован на: ${nextRunAtDate.toISOString()}`
        )
        return
      }
    }

    if (state?.nextTaskId) {
      const taskIdNumber = parseInt(state.nextTaskId, 10)
      if (!Number.isNaN(taskIdNumber)) {
        try {
          await cancelScheduledJob(ctx, taskIdNumber)
          Debug.info(ctx, `[batch-attribution] Отменён устаревший taskId=${state.nextTaskId}`)
        } catch (error: any) {
          Debug.warn(
            ctx,
            `[batch-attribution] Не удалось отменить taskId=${state.nextTaskId}: ${error.message}`
          )
        }
      }
    }

    const taskId = await batchAttributionJob.scheduleJobAfter(
      ctx,
      JOB_SCHEDULE_DELAY_SECONDS,
      'seconds',
      {}
    )
    const nextRunAt = new Date(now.getTime() + JOB_SCHEDULE_DELAY_SECONDS * 1000)
    await updateJobState(ctx, {
      nextRunAt,
      nextTaskId: String(taskId)
    })

    Debug.info(
      ctx,
      `[batch-attribution] Следующее выполнение запланировано на: ${nextRunAt.toISOString()}`
    )
  })
}
