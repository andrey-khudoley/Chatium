// @shared
import { AttributionWeights } from '../tables/attribution-weights.table'
import { JoinEvents } from '../tables/join-events.table'
import { LinkClicks } from '../tables/link-clicks.table'
import { TrackingLinks } from '../tables/tracking-links.table'
import { Debug } from '../shared/debug'

/**
 * Дефолтные значения параметров для системы атрибуции
 */
const DEFAULT_LAMBDA = 0.8
const DEFAULT_TAU_FAST = 60 // секунды
const DEFAULT_TAU_SLOW = 600 // секунды (10 минут)
const DEFAULT_ALPHA = 1
const DEFAULT_BETA = 20

/**
 * Период для анализа данных при обновлении весов (в часах)
 */
const ANALYSIS_PERIOD_HOURS = 24

/**
 * Минимальное количество образцов для обновления весов
 */
const MIN_SAMPLES_FOR_UPDATE = 5

/**
 * Инициализирует веса для проекта/канала с дефолтными значениями
 *
 * Создаёт записи в AttributionWeights с дефолтными значениями, если их ещё нет.
 *
 * @param ctx - контекст
 * @param projectId - ID проекта
 * @param channelId - ID канала (опционально)
 */
export async function initializeWeights(
  ctx: RichUgcCtx,
  projectId: string,
  channelId?: string
): Promise<void> {
  Debug.info(
    ctx,
    `[update-weights] Инициализация весов для проекта ${projectId}${channelId ? `, канал ${channelId}` : ''}`
  )

  const parameters: Array<{
    name: 'lambda' | 'tau_fast' | 'tau_slow' | 'alpha' | 'beta' | 'avg_conversion_time'
    value: number
  }> = [
    { name: 'lambda', value: DEFAULT_LAMBDA },
    { name: 'tau_fast', value: DEFAULT_TAU_FAST },
    { name: 'tau_slow', value: DEFAULT_TAU_SLOW },
    { name: 'alpha', value: DEFAULT_ALPHA },
    { name: 'beta', value: DEFAULT_BETA },
    { name: 'avg_conversion_time', value: 0 }
  ]

  for (const param of parameters) {
    // Проверяем, существует ли уже запись для этого параметра
    const existingWeights = await AttributionWeights.findAll(ctx, {
      where: {
        projectId,
        parameter: param.name
      }
    })

    // Ищем запись с нужным channelId (или без channelId для проектных весов)
    const existing = existingWeights.find((w) => {
      if (channelId) {
        return w.channelId === channelId
      } else {
        return w.channelId === null || w.channelId === undefined
      }
    })

    if (!existing) {
      // Создаём новую запись с дефолтным значением
      await AttributionWeights.create(ctx, {
        projectId,
        channelId: channelId || undefined,
        parameter: param.name,
        value: param.value,
        samplesCount: 0,
        lastUpdatedAt: new Date()
      })
      Debug.info(ctx, `[update-weights] ✅ Создан вес для параметра ${param.name}: ${param.value}`)
    } else {
      Debug.info(
        ctx,
        `[update-weights] ℹ️ Вес для параметра ${param.name} уже существует, пропускаем`
      )
    }
  }
}

/**
 * Вычисляет среднее время конверсии для набора данных
 *
 * @param conversionTimes - массив времён конверсии в секундах
 * @returns среднее время конверсии в секундах
 */
function calculateAverageConversionTime(conversionTimes: number[]): number {
  if (conversionTimes.length === 0) {
    return 0
  }
  const sum = conversionTimes.reduce((acc, time) => acc + time, 0)
  return sum / conversionTimes.length
}

/**
 * Оценивает параметры likelihood (lambda, tau_fast, tau_slow) на основе времени конверсии
 *
 * Использует метод моментов для оценки параметров смеси двух экспонент:
 * - tau_fast оценивается как медиана быстрых конверсий (< 2 минуты)
 * - tau_slow оценивается как медиана медленных конверсий (>= 2 минуты)
 * - lambda - доля быстрых конверсий
 *
 * @param conversionTimes - массив времён конверсии в секундах
 * @returns объект с оценками параметров
 */
function estimateLikelihoodParameters(conversionTimes: number[]): {
  lambda: number
  tauFast: number
  tauSlow: number
} {
  if (conversionTimes.length === 0) {
    return {
      lambda: DEFAULT_LAMBDA,
      tauFast: DEFAULT_TAU_FAST,
      tauSlow: DEFAULT_TAU_SLOW
    }
  }

  // Разделяем на быстрые (< 2 минуты) и медленные (>= 2 минуты) конверсии
  const fastThreshold = 120 // 2 минуты в секундах
  const fastConversions = conversionTimes.filter((t) => t < fastThreshold)
  const slowConversions = conversionTimes.filter((t) => t >= fastThreshold)

  // Оцениваем lambda как долю быстрых конверсий
  const lambda = fastConversions.length / conversionTimes.length

  // Оцениваем tau_fast как медиану быстрых конверсий
  // Если нет быстрых конверсий, используем дефолт
  let tauFast = DEFAULT_TAU_FAST
  if (fastConversions.length > 0) {
    const sorted = [...fastConversions].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    tauFast = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    // Ограничиваем минимальное значение
    tauFast = Math.max(10, tauFast)
  }

  // Оцениваем tau_slow как медиану медленных конверсий
  // Если нет медленных конверсий, используем дефолт
  let tauSlow = DEFAULT_TAU_SLOW
  if (slowConversions.length > 0) {
    const sorted = [...slowConversions].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    tauSlow = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    // Ограничиваем минимальное значение
    tauSlow = Math.max(60, tauSlow)
  }

  return {
    lambda: Math.max(0, Math.min(1, lambda)),
    tauFast: Math.max(10, tauFast),
    tauSlow: Math.max(60, tauSlow)
  }
}

/**
 * Оценивает параметры prior (alpha, beta) на основе реальной конверсии
 *
 * Использует бэйесовское обновление: если реальная конверсия выше ожидаемой,
 * увеличиваем alpha, если ниже - увеличиваем beta.
 *
 * @param totalClicks - общее количество кликов
 * @param totalJoins - общее количество подписок
 * @param currentAlpha - текущее значение alpha
 * @param currentBeta - текущее значение beta
 * @returns объект с оценками параметров
 */
function estimatePriorParameters(
  totalClicks: number,
  totalJoins: number,
  currentAlpha: number,
  currentBeta: number
): {
  alpha: number
  beta: number
} {
  if (totalClicks === 0) {
    return {
      alpha: currentAlpha,
      beta: currentBeta
    }
  }

  // Реальная конверсия
  const actualConversionRate = totalJoins / totalClicks
  // Ожидаемая конверсия с текущими параметрами
  const expectedConversionRate = currentAlpha / (currentAlpha + currentBeta)

  // Если данных достаточно, корректируем параметры
  if (totalClicks >= MIN_SAMPLES_FOR_UPDATE) {
    // Адаптивный шаг: чем больше разница, тем сильнее корректировка
    const rateDiff = actualConversionRate - expectedConversionRate
    const adjustmentFactor = Math.min(0.3, Math.abs(rateDiff)) // Максимум 30% корректировки за раз

    let newAlpha = currentAlpha
    let newBeta = currentBeta

    if (rateDiff > 0) {
      // Конверсия выше ожидаемой - увеличиваем alpha
      newAlpha = currentAlpha * (1 + adjustmentFactor)
    } else if (rateDiff < 0) {
      // Конверсия ниже ожидаемой - увеличиваем beta
      newBeta = currentBeta * (1 + adjustmentFactor)
    }

    // Ограничиваем минимальные значения
    newAlpha = Math.max(0.1, newAlpha)
    newBeta = Math.max(1, newBeta)

    return {
      alpha: newAlpha,
      beta: newBeta
    }
  }

  // Если данных недостаточно, возвращаем текущие значения
  return {
    alpha: currentAlpha,
    beta: currentBeta
  }
}

/**
 * Обновляет веса для проекта/канала на основе обратной связи
 *
 * Анализирует все атрибутированные JoinEvents за последний период и обновляет:
 * - avg_conversion_time - среднее время конверсии
 * - lambda, tau_fast, tau_slow - параметры likelihood
 * - alpha, beta - параметры prior
 *
 * @param ctx - контекст
 * @param projectId - ID проекта
 * @param channelId - ID канала (опционально, для канало-специфичных весов)
 */
export async function updateWeightsForProject(
  ctx: RichUgcCtx,
  projectId: string,
  channelId?: string
): Promise<void> {
  Debug.info(
    ctx,
    `[update-weights] Начало обновления весов для проекта ${projectId}${channelId ? `, канал ${channelId}` : ''}`
  )

  // Вычисляем дату начала периода анализа
  const analysisStartDate = new Date(Date.now() - ANALYSIS_PERIOD_HOURS * 60 * 60 * 1000)

  // Получаем все атрибутированные JoinEvents за период анализа
  const whereCondition: any = {
    projectId,
    status: 'attributed',
    joinedAt: { $gte: analysisStartDate }
  }
  if (channelId) {
    whereCondition.chatId = channelId
  }

  const attributedJoins = await JoinEvents.findAll(ctx, {
    where: whereCondition,
    limit: 10000 // Практический лимит для анализа
  })

  Debug.info(
    ctx,
    `[update-weights] Найдено атрибутированных подписок за период: ${attributedJoins.length}`
  )

  if (attributedJoins.length < MIN_SAMPLES_FOR_UPDATE) {
    Debug.info(
      ctx,
      `[update-weights] Недостаточно данных для обновления весов (${attributedJoins.length} < ${MIN_SAMPLES_FOR_UPDATE}), пропускаем`
    )
    return
  }

  // Собираем данные для анализа
  const conversionTimes: number[] = [] // Времена конверсии в секундах
  const trackingLinkStats = new Map<string, { clicks: number; joins: number }>() // Статистика по TrackingLink

  // Собираем уникальные ID LinkClicks для оптимизации запросов
  const linkClickIds = new Set<string>()
  for (const joinEvent of attributedJoins) {
    if (joinEvent.attributedToLinkClickId) {
      linkClickIds.add(joinEvent.attributedToLinkClickId)
    }
    // Собираем статистику по TrackingLink
    if (joinEvent.attributedToTrackingLinkId) {
      const stats = trackingLinkStats.get(joinEvent.attributedToTrackingLinkId) || {
        clicks: 0,
        joins: 0
      }
      stats.joins++
      trackingLinkStats.set(joinEvent.attributedToTrackingLinkId, stats)
    }
  }

  // Загружаем все необходимые LinkClicks одним запросом (оптимизация)
  const linkClicksMap = new Map<string, any>()
  if (linkClickIds.size > 0) {
    // Загружаем по батчам, так как Heap может иметь ограничения на размер WHERE IN
    const linkClickIdsArray = Array.from(linkClickIds)
    const BATCH_SIZE = 100
    for (let i = 0; i < linkClickIdsArray.length; i += BATCH_SIZE) {
      const batch = linkClickIdsArray.slice(i, i + BATCH_SIZE)
      // Для каждого ID делаем отдельный запрос, так как Heap не поддерживает WHERE id IN [array]
      // Но мы кэшируем результаты в Map, чтобы не делать повторные запросы
      for (const linkClickId of batch) {
        const linkClick = await LinkClicks.findById(ctx, linkClickId)
        if (linkClick) {
          linkClicksMap.set(linkClickId, linkClick)
        }
      }
    }
  }

  // Вычисляем времена конверсии
  for (const joinEvent of attributedJoins) {
    if (joinEvent.attributedToLinkClickId) {
      const linkClick = linkClicksMap.get(joinEvent.attributedToLinkClickId)
      if (linkClick && linkClick.clickedAt && joinEvent.joinedAt) {
        const deltaTMs = joinEvent.joinedAt.getTime() - linkClick.clickedAt.getTime()
        const deltaTSeconds = deltaTMs / 1000
        if (deltaTSeconds >= 0) {
          // Только неотрицательные значения
          conversionTimes.push(deltaTSeconds)
        }
      }
    }
  }

  // Получаем статистику по кликам для каждого TrackingLink
  // Загружаем клики для каждого TrackingLink отдельно
  const trackingLinkIds = Array.from(trackingLinkStats.keys())

  for (const trackingLinkId of trackingLinkIds) {
    // Получаем все клики для этого TrackingLink за период анализа
    const clicks = await LinkClicks.findAll(ctx, {
      where: {
        linkId: trackingLinkId,
        clickedAt: { $gte: analysisStartDate }
      }
    })

    const stats = trackingLinkStats.get(trackingLinkId)!
    stats.clicks = clicks.length
    trackingLinkStats.set(trackingLinkId, stats)
  }

  Debug.info(
    ctx,
    `[update-weights] Собрано данных: conversionTimes=${conversionTimes.length}, trackingLinks=${trackingLinkStats.size}`
  )

  // Обновляем avg_conversion_time
  if (conversionTimes.length > 0) {
    const avgConversionTime = calculateAverageConversionTime(conversionTimes)
    await updateWeightParameter(
      ctx,
      projectId,
      channelId,
      'avg_conversion_time',
      avgConversionTime,
      conversionTimes.length
    )
    Debug.info(
      ctx,
      `[update-weights] ✅ Обновлён avg_conversion_time: ${avgConversionTime.toFixed(2)} сек (образцов: ${conversionTimes.length})`
    )
  }

  // Обновляем параметры likelihood (lambda, tau_fast, tau_slow)
  if (conversionTimes.length >= MIN_SAMPLES_FOR_UPDATE) {
    const likelihoodParams = estimateLikelihoodParameters(conversionTimes)

    await updateWeightParameter(
      ctx,
      projectId,
      channelId,
      'lambda',
      likelihoodParams.lambda,
      conversionTimes.length
    )
    await updateWeightParameter(
      ctx,
      projectId,
      channelId,
      'tau_fast',
      likelihoodParams.tauFast,
      conversionTimes.length
    )
    await updateWeightParameter(
      ctx,
      projectId,
      channelId,
      'tau_slow',
      likelihoodParams.tauSlow,
      conversionTimes.length
    )

    Debug.info(
      ctx,
      `[update-weights] ✅ Обновлены параметры likelihood: lambda=${likelihoodParams.lambda.toFixed(3)}, tau_fast=${likelihoodParams.tauFast.toFixed(2)}, tau_slow=${likelihoodParams.tauSlow.toFixed(2)}`
    )
  }

  // Обновляем параметры prior (alpha, beta)
  if (trackingLinkStats.size > 0) {
    // Агрегируем статистику по всем TrackingLink
    let totalClicks = 0
    let totalJoins = 0
    for (const stats of trackingLinkStats.values()) {
      totalClicks += stats.clicks
      totalJoins += stats.joins
    }

    if (totalClicks > 0) {
      // Получаем текущие значения alpha и beta
      const currentAlpha = await getWeightParameter(ctx, projectId, 'alpha', channelId)
      const currentBeta = await getWeightParameter(ctx, projectId, 'beta', channelId)

      const priorParams = estimatePriorParameters(
        totalClicks,
        totalJoins,
        currentAlpha,
        currentBeta
      )

      await updateWeightParameter(
        ctx,
        projectId,
        channelId,
        'alpha',
        priorParams.alpha,
        totalClicks
      )
      await updateWeightParameter(ctx, projectId, channelId, 'beta', priorParams.beta, totalClicks)

      Debug.info(
        ctx,
        `[update-weights] ✅ Обновлены параметры prior: alpha=${priorParams.alpha.toFixed(3)}, beta=${priorParams.beta.toFixed(3)} (клики: ${totalClicks}, подписки: ${totalJoins})`
      )
    }
  }

  Debug.info(
    ctx,
    `[update-weights] ✅ Обновление весов завершено для проекта ${projectId}${channelId ? `, канал ${channelId}` : ''}`
  )
}

/**
 * Получает значение параметра из таблицы AttributionWeights с дефолтным значением
 *
 * @param ctx - контекст
 * @param projectId - ID проекта
 * @param parameter - название параметра
 * @param channelId - ID канала (опционально)
 * @returns значение параметра или дефолтное значение
 */
async function getWeightParameter(
  ctx: RichUgcCtx,
  projectId: string,
  parameter: 'lambda' | 'tau_fast' | 'tau_slow' | 'alpha' | 'beta' | 'avg_conversion_time',
  channelId?: string
): Promise<number> {
  // Сначала пытаемся найти канало-специфичный вес
  if (channelId) {
    const channelWeight = await AttributionWeights.findOneBy(ctx, {
      projectId,
      channelId,
      parameter
    })
    if (channelWeight) {
      return channelWeight.value
    }
  }

  // Если канало-специфичного веса нет, ищем проектный вес
  const projectWeights = await AttributionWeights.findAll(ctx, {
    where: {
      projectId,
      parameter
    }
  })
  const projectWeight = projectWeights.find(
    (w) => w.channelId === null || w.channelId === undefined
  )

  if (projectWeight) {
    return projectWeight.value
  }

  // Возвращаем дефолтное значение
  switch (parameter) {
    case 'lambda':
      return DEFAULT_LAMBDA
    case 'tau_fast':
      return DEFAULT_TAU_FAST
    case 'tau_slow':
      return DEFAULT_TAU_SLOW
    case 'alpha':
      return DEFAULT_ALPHA
    case 'beta':
      return DEFAULT_BETA
    case 'avg_conversion_time':
      return 0
    default:
      return 0
  }
}

/**
 * Обновляет или создаёт параметр веса в таблице AttributionWeights
 *
 * Использует взвешенное среднее для сглаживания обновлений и инкремент samplesCount.
 *
 * @param ctx - контекст
 * @param projectId - ID проекта
 * @param channelId - ID канала (опционально)
 * @param parameter - название параметра
 * @param value - новое значение параметра
 * @param newSamplesCount - количество новых образцов для добавления к samplesCount
 */
async function updateWeightParameter(
  ctx: RichUgcCtx,
  projectId: string,
  channelId: string | undefined,
  parameter: 'lambda' | 'tau_fast' | 'tau_slow' | 'alpha' | 'beta' | 'avg_conversion_time',
  value: number,
  newSamplesCount: number
): Promise<void> {
  // Находим существующую запись
  const existingWeights = await AttributionWeights.findAll(ctx, {
    where: {
      projectId,
      parameter
    }
  })

  // Ищем запись с нужным channelId
  // Для проектных весов (без channelId) ищем запись где channelId === null или undefined
  // Для канало-специфичных весов ищем точное совпадение
  const existing = existingWeights.find((w) => {
    if (channelId) {
      return w.channelId === channelId
    } else {
      // Для проектных весов channelId должен быть null или undefined
      return w.channelId === null || w.channelId === undefined
    }
  })

  if (existing) {
    // Обновляем существующую запись
    // Для сглаживания используем взвешенное среднее с учётом текущего количества образцов
    const currentSamples = existing.samplesCount || 0
    const totalSamples = currentSamples + newSamplesCount

    // Используем экспоненциальное скользящее среднее для сглаживания
    // Вес для текущего значения зависит от соотношения новых и старых образцов
    const weight = currentSamples > 0 ? currentSamples / totalSamples : 0.5
    const smoothedValue = weight * existing.value + (1 - weight) * value

    await AttributionWeights.update(ctx, {
      id: existing.id,
      value: smoothedValue,
      samplesCount: totalSamples,
      lastUpdatedAt: new Date()
    })

    Debug.info(
      ctx,
      `[update-weights] Обновлён параметр ${parameter}${channelId ? ` для канала ${channelId}` : ''}: ${existing.value.toFixed(3)} → ${smoothedValue.toFixed(3)} (образцов: ${currentSamples} → ${totalSamples})`
    )
  } else {
    // Создаём новую запись
    await AttributionWeights.create(ctx, {
      projectId,
      channelId: channelId || undefined,
      parameter,
      value,
      samplesCount: newSamplesCount,
      lastUpdatedAt: new Date()
    })

    Debug.info(
      ctx,
      `[update-weights] Создан новый параметр ${parameter}${channelId ? ` для канала ${channelId}` : ''}: ${value.toFixed(3)} (образцов: ${newSamplesCount})`
    )
  }
}
