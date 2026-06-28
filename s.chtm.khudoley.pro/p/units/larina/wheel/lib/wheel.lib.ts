/**
 * Бизнес-логика колеса удачи (§16.1, §16.3, §16.4).
 * Загрузка сегментов, правило чётности, взвешенный выбор, проверка лимита.
 */

import * as segmentsRepo from '../repos/segments.repo'
import * as spinsRepo from '../repos/spins.repo'
import * as spinGrantsRepo from '../repos/spinGrants.repo'
import * as settingsLib from './settings.lib'
import * as loggerLib from './logger.lib'

const LOG_MODULE = 'lib/wheel.lib'

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

/**
 * Серверный тип сегмента (§16.1): несёт все поля нужные для выбора и записи победы.
 * Используется только на сервере — НЕ передаётся клиенту.
 * id для авто-retry сектора отсутствует.
 */
export type LoadedSegment = {
  id?: string
  order: number
  label: string
  weight: number
  maxWins: number | null
  full: string
  prizeOfferID?: string
  redirectUrl?: string
  isAutoRetry?: true
}

/** Публичный тип сегмента для клиента (§11.5): без id, maxWins, full, prizeOfferID. */
export type EffectiveSegment = {
  order: number
  label: string
  weight: number
  isAutoRetry?: true
  redirectUrl?: string
}

/** Результат loadEffectiveSegments. */
export type LoadSegmentsResult =
  | { success: true; segments: LoadedSegment[]; nEff: number }
  | { success: false; error: string }

/** Результат selectTarget. */
export type SelectTargetResult =
  | { success: true; segment: LoadedSegment; targetIdx: number }
  | { success: false; error: string }

/** Результат checkSpinLimit. */
export type SpinLimitResult = {
  used: number
  maxAllowed: number
  allowed: boolean
}

// ---------------------------------------------------------------------------
// Валидация email
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Нормализует email: trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Проверяет формат email после нормализации. */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

// ---------------------------------------------------------------------------
// §16.10 Маскировка email для публичного отображения
// ---------------------------------------------------------------------------

/**
 * Маскирует email перед публичным отображением (§16.10).
 * Чистая функция — без ctx и Heap.
 *
 * Алгоритм:
 * 1. Разбить по @: local и domain. Нет @ → '***'.
 * 2. local: первые 2 символа + '***'. local.length <= 2 → первый символ + '*'.
 * 3. domain: разбить по ПОСЛЕДНЕЙ точке на name+tld.
 *    name.length <= 2 → '**'; иначе '***' + последние 2 символа name.
 *    Точки нет → '***' + последние 2 символа домена.
 * 4. Вернуть <maskedLocal>@<maskedDomain>.
 *
 * Пример: tester@khudoley.pro → te***@***ey.pro
 */
export function maskEmail(email: string): string {
  const atIdx = email.indexOf('@')
  if (atIdx === -1) return '***'

  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)

  // Маскируем local
  const maskedLocal = local.length <= 2 ? local.slice(0, 1) + '*' : local.slice(0, 2) + '***'

  // Маскируем domain
  const dotIdx = domain.lastIndexOf('.')
  let maskedDomain: string
  if (dotIdx === -1) {
    // Нет точки — берём последние 2 символа домена
    maskedDomain = '***' + domain.slice(-2)
  } else {
    const name = domain.slice(0, dotIdx)
    const tld = domain.slice(dotIdx + 1)
    const maskedName = name.length <= 2 ? '**' : '***' + name.slice(-2)
    maskedDomain = maskedName + '.' + tld
  }

  return maskedLocal + '@' + maskedDomain
}

// ---------------------------------------------------------------------------
// §16.1 Загрузка сегментов и правило чётности
// ---------------------------------------------------------------------------

/**
 * Загружает enabled-сегменты, применяет ограничение диапазона 2..8
 * и правило чётности (нечётный N → добавить авто-retry сектор).
 * Возвращает серверный тип LoadedSegment с maxWins/full/prizeOfferID — без повторных findById (§16.1, §16.3).
 */
export async function loadEffectiveSegments(ctx: app.Ctx): Promise<LoadSegmentsResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] loadEffectiveSegments: вход`,
    payload: {}
  })

  let rows: Awaited<ReturnType<typeof segmentsRepo.findAllEnabled>>
  try {
    rows = await segmentsRepo.findAllEnabled(ctx)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] loadEffectiveSegments: ошибка загрузки сегментов`,
        payload: { error: msg }
      })
    } catch (_) {}
    return { success: false, error: 'Колесо настроено некорректно' }
  }

  const N = rows.length
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] loadEffectiveSegments: загружено`,
    payload: { N }
  })

  // Ограничение диапазона
  if (N < 2 || N > 8) {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] loadEffectiveSegments: N вне диапазона 2..8`,
      payload: { N }
    })
    return { success: false, error: 'Колесо настроено некорректно' }
  }

  // Преобразуем в LoadedSegment — несём maxWins/full/prizeOfferID за один проход (§16.1)
  const segments: LoadedSegment[] = rows.map((row) => {
    const seg: LoadedSegment = {
      id: row.id,
      order: row.order,
      label: row.label,
      weight: row.weight,
      maxWins: row.maxWins ?? null,
      full: row.full ?? ''
    }
    if (row.prizeOfferID) {
      seg.prizeOfferID = row.prizeOfferID
    }
    if (row.redirectUrl) {
      seg.redirectUrl = row.redirectUrl
    }
    return seg
  })

  // Правило чётности (§16.1)
  if (N % 2 !== 0) {
    segments.push({
      order: N,
      label: 'Ещё попытка',
      weight: 0,
      maxWins: null,
      full: '',
      isAutoRetry: true
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] loadEffectiveSegments: добавлен авто-retry сектор (нечётный N)`,
      payload: { N }
    })
  }

  const nEff = segments.length
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] loadEffectiveSegments: выход`,
    payload: { N, nEff }
  })

  return { success: true, segments, nEff }
}

// ---------------------------------------------------------------------------
// §16.3 Алгоритм выбора (серверный)
// ---------------------------------------------------------------------------

/**
 * Взвешенный выбор целевого сегмента из LoadedSegment[].
 * maxWins берётся из самого сегмента (НЕ findById!) — §16.3.
 * Авто-retry никогда не выбирается.
 */
export async function selectTarget(
  ctx: app.Ctx,
  segments: LoadedSegment[]
): Promise<SelectTargetResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] selectTarget: вход`,
    payload: { count: segments.length }
  })

  // Берём сегменты с weight > 0, исключая авто-retry
  const candidates: Array<{ segment: LoadedSegment; idx: number; effectiveWeight: number }> = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    if (seg.isAutoRetry) continue
    if (seg.weight <= 0) continue

    let effectiveWeight = seg.weight

    // maxWins берётся из LoadedSegment (уже загружен за один проход findAllEnabled, §16.3)
    if (seg.maxWins != null && seg.id) {
      try {
        const winsCount = await spinsRepo.countBySegment(ctx, seg.id)
        if (winsCount >= seg.maxWins) {
          effectiveWeight = 0
          await loggerLib.writeServerLog(ctx, {
            severity: 6,
            message: `[${LOG_MODULE}] selectTarget: maxWins исчерпан для сегмента`,
            payload: { order: seg.order, maxWins: seg.maxWins, winsCount }
          })
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        try {
          await loggerLib.writeServerLog(ctx, {
            severity: 3,
            message: `[${LOG_MODULE}] selectTarget: ошибка проверки maxWins`,
            payload: { error: msg }
          })
        } catch (_) {}
        // fail-closed при ошибке проверки
        effectiveWeight = 0
      }
    }

    if (effectiveWeight > 0) {
      candidates.push({ segment: seg, idx: i, effectiveWeight })
    }
  }

  // Проверяем Σweight > 0
  const totalWeight = candidates.reduce((sum, c) => sum + c.effectiveWeight, 0)
  if (totalWeight === 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_MODULE}] selectTarget: все призы разыграны (Σweight=0)`,
      payload: {}
    })
    return { success: false, error: 'Все призы разыграны' }
  }

  // Взвешенный случайный выбор
  let rand = Math.random() * totalWeight
  let chosen: (typeof candidates)[number] | null = null
  for (const c of candidates) {
    rand -= c.effectiveWeight
    if (rand <= 0) {
      chosen = c
      break
    }
  }
  // Фоллбэк на последний (защита от float погрешности)
  if (!chosen) {
    chosen = candidates[candidates.length - 1]!
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] selectTarget: выбран сегмент`,
    payload: { order: chosen.segment.order, targetIdx: chosen.idx }
  })

  return { success: true, segment: chosen.segment, targetIdx: chosen.idx }
}

// ---------------------------------------------------------------------------
// §16.4 Проверка лимита попыток
// ---------------------------------------------------------------------------

/**
 * Проверяет, не превышен ли лимит спинов для данного email.
 * email должен быть уже нормализован (trim + lowercase).
 */
export async function checkSpinLimit(ctx: app.Ctx, email: string): Promise<SpinLimitResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] checkSpinLimit: вход`,
    payload: { hasEmail: true }
  })

  const [spinsUsed, spinsGranted, wheelMaxSpins] = await Promise.all([
    spinsRepo.countByEmail(ctx, email),
    spinGrantsRepo.sumByEmail(ctx, email),
    settingsLib.getWheelMaxSpins(ctx)
  ])

  const maxAllowed = wheelMaxSpins + spinsGranted
  const allowed = spinsUsed < maxAllowed

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] checkSpinLimit: результат`,
    payload: { spinsUsed, spinsGranted, wheelMaxSpins, maxAllowed, allowed }
  })

  return { used: spinsUsed, maxAllowed, allowed }
}
