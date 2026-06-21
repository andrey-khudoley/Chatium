// @shared
import { AttributionWeights } from '../tables/attribution-weights.table'
import { LinkClicks } from '../tables/link-clicks.table'
import { JoinEvents } from '../tables/join-events.table'

/**
 * Дефолтные значения параметров для системы атрибуции
 */
const DEFAULT_LAMBDA = 0.8
const DEFAULT_TAU_FAST = 60 // секунды
const DEFAULT_TAU_SLOW = 600 // секунды
const DEFAULT_ALPHA = 1
const DEFAULT_BETA = 20

/**
 * Типы параметров для AttributionWeights
 */
type WeightParameter = 'lambda' | 'tau_fast' | 'tau_slow' | 'alpha' | 'beta' | 'avg_conversion_time'

export type WeightParameters = {
  lambda: number
  tauFast: number
  tauSlow: number
  alpha: number
  beta: number
  avgConversionTime: number
}

/**
 * Получает значение параметра из таблицы AttributionWeights с дефолтным значением
 *
 * @param ctx - контекст
 * @param projectId - ID проекта
 * @param parameter - название параметра
 * @param channelId - ID канала (опционально, для канало-специфичных весов)
 * @returns значение параметра или дефолтное значение
 */
async function getWeightParameter(
  ctx: RichUgcCtx,
  projectId: string,
  parameter: WeightParameter,
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
  // Для проектных весов channelId не указывается (undefined или null)
  // Используем findAll и фильтруем вручную, так как findOneBy не поддерживает поиск по отсутствию опционального поля
  const projectWeights = await AttributionWeights.findAll(ctx, {
    where: {
      projectId,
      parameter
    }
  })
  // Явная проверка на null/undefined, чтобы не обрабатывать 0 или "" как отсутствие channelId
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
      return 0 // Для avg_conversion_time дефолт 0
    default:
      return 0
  }
}

/**
 * Получает все параметры весов для проекта/канала одним набором
 */
export async function getWeightParameters(
  ctx: RichUgcCtx,
  projectId: string,
  channelId?: string
): Promise<WeightParameters> {
  const [lambda, tauFast, tauSlow, alpha, beta, avgConversionTime] = await Promise.all([
    getWeightParameter(ctx, projectId, 'lambda', channelId),
    getWeightParameter(ctx, projectId, 'tau_fast', channelId),
    getWeightParameter(ctx, projectId, 'tau_slow', channelId),
    getWeightParameter(ctx, projectId, 'alpha', channelId),
    getWeightParameter(ctx, projectId, 'beta', channelId),
    getWeightParameter(ctx, projectId, 'avg_conversion_time', channelId)
  ])

  return {
    lambda,
    tauFast,
    tauSlow,
    alpha,
    beta,
    avgConversionTime
  }
}

/**
 * Вычисляет likelihood с заранее известными параметрами
 */
export function likelihoodWithParameters(
  deltaTSeconds: number,
  params: Pick<WeightParameters, 'lambda' | 'tauFast' | 'tauSlow'>
): number {
  if (deltaTSeconds < 0) {
    return 0
  }

  const fastComponent = params.lambda * Math.exp(-deltaTSeconds / params.tauFast)
  const slowComponent = (1 - params.lambda) * Math.exp(-deltaTSeconds / params.tauSlow)
  const likelihoodValue = fastComponent + slowComponent

  return Math.max(0, Math.min(1, likelihoodValue))
}

/**
 * Вычисляет prior по готовым счётчикам и параметрам сглаживания
 */
export function priorWithParameters(
  clicksCount: number,
  joinsCount: number,
  params: Pick<WeightParameters, 'alpha' | 'beta'>
): number {
  const denominator = clicksCount + params.alpha + params.beta
  if (denominator === 0) {
    if (params.alpha + params.beta > 0) {
      return params.alpha / (params.alpha + params.beta)
    }
    return 0.5
  }

  const priorValue = (joinsCount + params.alpha) / denominator
  return Math.max(0, Math.min(1, priorValue))
}

/**
 * Период анализа данных для prior (30 дней)
 * Это обеспечивает актуальность статистики и учитывает сезонность
 */
const PRIOR_ANALYSIS_WINDOW_DAYS = 30

/**
 * Вычисляет prior вероятность для TrackingLink на основе бэйесовского сглаживания
 *
 * Формула: prior = (joins + α) / (clicks + α + β)
 *
 * УЛУЧШЕНИЕ: Учитывает только данные за последние 30 дней для актуальности статистики
 *
 * @param ctx - контекст
 * @param trackingLinkId - ID TrackingLink
 * @param projectId - ID проекта
 * @param channelId - ID канала (опционально, для канало-специфичных весов)
 * @returns prior вероятность (0-1)
 */
export async function prior(
  ctx: RichUgcCtx,
  trackingLinkId: string,
  projectId: string,
  channelId?: string
): Promise<number> {
  // Получаем параметры alpha и beta
  const alpha = await getWeightParameter(ctx, projectId, 'alpha', channelId)
  const beta = await getWeightParameter(ctx, projectId, 'beta', channelId)

  // Временное окно для анализа (последние 30 дней)
  const windowStartDate = new Date(Date.now() - PRIOR_ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  // Считаем количество переходов (clicks) для данного TrackingLink за последние 30 дней
  const clicks = await LinkClicks.findAll(ctx, {
    where: {
      linkId: trackingLinkId,
      clickedAt: { $gte: windowStartDate }
    }
  })
  const clicksCount = clicks.length

  // Считаем количество подписок (joins) для данного TrackingLink за последние 30 дней
  // Подписки - это JoinEvents, которые уже атрибутированы к данному TrackingLink
  const joins = await JoinEvents.findAll(ctx, {
    where: {
      attributedToTrackingLinkId: trackingLinkId,
      status: 'attributed',
      joinedAt: { $gte: windowStartDate }
    }
  })
  const joinsCount = joins.length

  // Применяем бэйесовское сглаживание
  const denominator = clicksCount + alpha + beta
  if (denominator === 0) {
    // Если нет данных, возвращаем нейтральную вероятность
    // Проверяем, что (alpha + beta) > 0, чтобы избежать деления на ноль
    if (alpha + beta > 0) {
      return alpha / (alpha + beta)
    }
    // Если alpha и beta оба равны нулю, возвращаем нейтральную вероятность 0.5
    return 0.5
  }

  const priorValue = (joinsCount + alpha) / denominator
  return Math.max(0, Math.min(1, priorValue)) // Ограничиваем диапазон [0, 1]
}

/**
 * Вычисляет likelihood вероятность на основе времени между кликом и подпиской
 *
 * Формула: likelihood = λ * exp(-Δt/τ_fast) + (1-λ) * exp(-Δt/τ_slow)
 *
 * @param ctx - контекст
 * @param deltaTSeconds - разница времени между кликом и подпиской в секундах
 * @param projectId - ID проекта
 * @param channelId - ID канала (опционально, для канало-специфичных весов)
 * @returns likelihood вероятность (0-1)
 */
export async function likelihood(
  ctx: RichUgcCtx,
  deltaTSeconds: number,
  projectId: string,
  channelId?: string
): Promise<number> {
  // Получаем параметры lambda, tau_fast, tau_slow
  const lambda = await getWeightParameter(ctx, projectId, 'lambda', channelId)
  const tauFast = await getWeightParameter(ctx, projectId, 'tau_fast', channelId)
  const tauSlow = await getWeightParameter(ctx, projectId, 'tau_slow', channelId)

  // Если deltaT отрицательное (подписка раньше клика), возвращаем 0
  if (deltaTSeconds < 0) {
    return 0
  }

  // Вычисляем смесь двух экспонент
  const fastComponent = lambda * Math.exp(-deltaTSeconds / tauFast)
  const slowComponent = (1 - lambda) * Math.exp(-deltaTSeconds / tauSlow)
  const likelihoodValue = fastComponent + slowComponent

  return Math.max(0, Math.min(1, likelihoodValue)) // Ограничиваем диапазон [0, 1]
}

/**
 * Вычисляет quality score для LinkClick на основе query параметров
 *
 * Качество повышается при наличии UTM-меток:
 * - utm_source: +0.1
 * - utm_medium: +0.05
 * - utm_campaign: +0.05
 *
 * Базовое качество: 0.8
 * Максимальное качество: 1.0
 *
 * @param queryParams - JSON строка с query параметрами или null
 * @returns quality score (0.8 - 1.0)
 */
export function quality(queryParams: string | null | undefined): number {
  const BASE_QUALITY = 0.8
  const UTM_SOURCE_BONUS = 0.1
  const UTM_MEDIUM_BONUS = 0.05
  const UTM_CAMPAIGN_BONUS = 0.05

  if (!queryParams) {
    return BASE_QUALITY
  }

  let qualityScore = BASE_QUALITY

  try {
    const params = JSON.parse(queryParams)

    // Проверяем наличие UTM-меток
    if (params.utm_source) {
      qualityScore += UTM_SOURCE_BONUS
    }
    if (params.utm_medium) {
      qualityScore += UTM_MEDIUM_BONUS
    }
    if (params.utm_campaign) {
      qualityScore += UTM_CAMPAIGN_BONUS
    }
  } catch (error) {
    // Если не удалось распарсить JSON, возвращаем базовое качество
    return BASE_QUALITY
  }

  return Math.min(1.0, qualityScore)
}

/**
 * Вычисляет комбинированный score для пары (linkClick, joinEvent)
 *
 * Формула: score = prior(trackingLink) * likelihood(Δt) * quality(linkClick)
 *
 * УЛУЧШЕНИЕ: quality теперь учитывает наличие UTM-параметров в query
 *
 * @param ctx - контекст
 * @param linkClick - объект LinkClick (или его ID и данные)
 * @param joinEvent - объект JoinEvent (или его ID и данные)
 * @param projectId - ID проекта
 * @param channelId - ID канала (опционально, для канало-специфичных весов)
 * @returns score (0-1)
 */
export async function score(
  ctx: RichUgcCtx,
  linkClick: { id: string; linkId: string; clickedAt: Date; queryParams?: string | null },
  joinEvent: { id: string; joinedAt: Date },
  projectId: string,
  channelId?: string
): Promise<number> {
  // Получаем prior для TrackingLink
  const priorValue = await prior(ctx, linkClick.linkId, projectId, channelId)

  // Вычисляем deltaT в секундах
  const deltaTMs = joinEvent.joinedAt.getTime() - linkClick.clickedAt.getTime()
  const deltaTSeconds = deltaTMs / 1000

  // Получаем likelihood
  const likelihoodValue = await likelihood(ctx, deltaTSeconds, projectId, channelId)

  // Вычисляем quality на основе query параметров
  const qualityValue = quality(linkClick.queryParams)

  // Комбинируем score
  const scoreValue = priorValue * likelihoodValue * qualityValue

  return Math.max(0, Math.min(1, scoreValue)) // Ограничиваем диапазон [0, 1]
}

/**
 * Нормализует массив scores в вероятности (сумма = 1)
 *
 * Формула: p_i = score_i / Σ score_j
 *
 * @param scores - массив scores
 * @returns массив нормализованных вероятностей
 */
export function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) {
    return []
  }

  // Вычисляем сумму всех scores
  const sum = scores.reduce((acc, score) => acc + score, 0)

  // Если сумма равна 0, возвращаем равномерное распределение
  if (sum === 0) {
    return new Array(scores.length).fill(1 / scores.length)
  }

  // Нормализуем: делим каждый score на сумму
  return scores.map((score) => score / sum)
}
