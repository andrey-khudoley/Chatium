import { BrokerDeliveries, type BrokerDeliveriesRow } from '../../tables/deliveries.table'
import { type BrokerResult, BrokerOpError, runOperation } from './result'
import { authenticateModule, assertActive } from './auth'
import { newClaimToken } from './token'
import { retryRead } from './retry-read'
import { writeServerLog } from '../log/logger'
import {
  DEFAULT_CLAIM_TIMEOUT_MS,
  FETCH_LIMIT_DEFAULT,
  FETCH_LIMIT_MAX,
  LAST_ERROR_MAX
} from '../../config/constants'

export type FetchDeliveriesParams = { moduleKey: string; authToken: string; limit?: number }

export type DeliveryOut = {
  id: string
  eventId: string
  eventType: string
  schemaVersion: number
  payload: unknown
  claimToken: string
  claimExpiresAt: number
  claimCount: number
  createdAt: number
}

export type FetchDeliveriesResult = { deliveries: DeliveryOut[] }

/**
 * fetchDeliveries (§5.9.2, О1/О2/О3/О4) — атомарная poll+claim: выбирает
 * pending + просроченные claimed своего модуля, тут же столбит их построчным
 * CAS (ADR-0014). Возвращённое может быть меньше запрошенного — проигранные
 * гонки просто выпадают, это штатно.
 */
export async function fetchDeliveriesCore(
  ctx: RichUgcCtx,
  params: FetchDeliveriesParams
): Promise<BrokerResult<FetchDeliveriesResult>> {
  return runOperation(ctx, async () => {
    const startedAt = Date.now()
    const row = await authenticateModule(ctx, params.moduleKey, params.authToken)
    assertActive(row)

    // Клэмп с обеих сторон: снизу — минимум 1, сверху — отсечка до потолка (не отказ).
    const effLimit = Math.max(1, Math.min(params.limit ?? FETCH_LIMIT_DEFAULT, FETCH_LIMIT_MAX))
    const timeout = row.claimTimeoutMs ?? DEFAULT_CLAIM_TIMEOUT_MS
    const cutoff = Date.now() - timeout // тот же cutoff — и в выборке, и в CAS (О2)

    const candidates = await BrokerDeliveries.findAll(ctx, {
      where: {
        $and: [
          { subscriberModuleKey: params.moduleKey },
          { $or: [{ status: 'pending' }, { status: 'claimed', claimedAt: { $lt: cutoff } }] }
        ]
      },
      order: [{ createdAt: 'asc' }],
      limit: effLimit
    })

    const claimed: DeliveryOut[] = []
    let lostRaces = 0

    for (const candidate of candidates) {
      const claimToken = newClaimToken()
      const claimedAt = Date.now()
      const nextClaimCount = candidate.claimCount + 1
      const whereCondition =
        candidate.status === 'pending'
          ? { id: candidate.id, status: 'pending' as const }
          : { id: candidate.id, status: 'claimed' as const, claimedAt: { $lt: cutoff } }

      const won = await BrokerDeliveries.updateAll(ctx, {
        patch: { status: 'claimed', claimedAt, claimToken, claimCount: nextClaimCount },
        where: whereCondition,
        limit: 1
      })

      if (won === 1) {
        claimed.push({
          id: candidate.id,
          eventId: candidate.eventId,
          eventType: candidate.eventType,
          schemaVersion: candidate.schemaVersion,
          payload: candidate.payload,
          claimToken,
          claimExpiresAt: claimedAt + timeout,
          claimCount: nextClaimCount,
          createdAt: candidate.createdAt.getTime()
        })
      } else {
        lostRaces++
      }
    }

    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: fetchDeliveries "${params.moduleKey}" — requested=${candidates.length}, claimed=${claimed.length}, lostRaces=${lostRaces}`,
      marks: {
        moduleKey: params.moduleKey,
        durationMs: Date.now() - startedAt,
        requested: candidates.length,
        claimed: claimed.length,
        lostRaces
      }
    })

    return { deliveries: claimed }
  })
}

/**
 * Предикат «устаревшего чтения» read-back после проигранного CAS (О6, ADR-0015,
 * фикс-раунда 1, п.8): строка не найдена — читаем ещё (create/update может
 * отставать); строка найдена, но всё ещё показывает claimed с ПРЕДЪЯВЛЕННОЙ
 * меткой — противоречие проигрышу CAS (наш собственный updateAll должен был
 * перевести именно эту строку, если её реальное состояние было claimed+эта
 * метка) — тоже читаем ещё. Если противоречие переживает все ретраи —
 * трактуется как алиас «тот же токен уже закрыл строку параллельным повтором»
 * (см. вызывающих ниже), а не как ошибка.
 */
function isStaleAfterLostCas(
  row: BrokerDeliveriesRow | null,
  presentedClaimToken: string
): boolean {
  return !row || (row.status === 'claimed' && row.claimToken === presentedClaimToken)
}

export type AckDeliveryParams = {
  moduleKey: string
  authToken: string
  deliveryId: string
  claimToken: string
}
export type AckDeliveryResult = { result: 'acked' | 'alreadyAcked' }

/**
 * ackDelivery (§5.9.3, О6) — CAS-first: сразу пытаемся закрыть условным
 * updateAll. won===0 → классификация причины отказа с retry-read ×3 (read-lag,
 * ADR-0015, предикат isStaleAfterLostCas — фикс-раунда 1, п.8). Порядок проверок
 * §5.9.3: метка (claimToken) — РАНЬШЕ матрицы статусов, поэтому pending-строка
 * с любой предъявленной меткой (claimToken там всегда null) даёт
 * invalid_claim_token, а не delivery_not_claimed.
 */
export async function ackDeliveryCore(
  ctx: RichUgcCtx,
  params: AckDeliveryParams
): Promise<BrokerResult<AckDeliveryResult>> {
  return runOperation(ctx, async () => {
    const row = await authenticateModule(ctx, params.moduleKey, params.authToken)
    assertActive(row)

    const won = await BrokerDeliveries.updateAll(ctx, {
      patch: { status: 'acked' },
      where: {
        id: params.deliveryId,
        subscriberModuleKey: params.moduleKey,
        status: 'claimed',
        claimToken: params.claimToken
      },
      limit: 1
    })

    if (won === 1) {
      return { result: 'acked' as const }
    }

    const delivery = await retryRead(() => BrokerDeliveries.findById(ctx, params.deliveryId), {
      isStale: (d) => isStaleAfterLostCas(d, params.claimToken)
    })

    if (!delivery) {
      await writeServerLog(ctx, {
        level: 'warn',
        message: 'broker: ackDelivery — delivery not found',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      throw new BrokerOpError('delivery_unavailable', 'broker: delivery not found')
    }

    if (delivery.subscriberModuleKey !== params.moduleKey) {
      await writeServerLog(ctx, {
        level: 'error',
        message: 'broker: ackDelivery — foreign delivery access attempt',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      throw new BrokerOpError('delivery_unavailable', 'broker: delivery not available')
    }

    // Противоречие пережило все ретраи: тот же claimToken уже закрыл строку
    // параллельным повтором закрытия — повтор того же закрытия успешен (О6).
    // Warn: read-lag длиннее 3 ретраев — редкая рантайм-аномалия, полезно видеть.
    if (delivery.status === 'claimed' && delivery.claimToken === params.claimToken) {
      await writeServerLog(ctx, {
        level: 'warn',
        message: 'broker: ackDelivery — stale read survived retries, treating as alreadyAcked',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      return { result: 'alreadyAcked' as const }
    }

    if (delivery.claimToken !== params.claimToken) {
      await writeServerLog(ctx, {
        level: 'warn',
        message: 'broker: ackDelivery — invalid claim token',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      throw new BrokerOpError('invalid_claim_token', 'broker: claim token mismatch')
    }

    if (delivery.status === 'acked') {
      return { result: 'alreadyAcked' as const }
    }

    // dead или pending (с совпавшей — практически недостижимо для pending — меткой)
    await writeServerLog(ctx, {
      level: 'error',
      message: 'broker: ackDelivery — delivery not claimed',
      payload: {
        deliveryId: params.deliveryId,
        moduleKey: params.moduleKey,
        status: delivery.status
      }
    })
    throw new BrokerOpError('delivery_not_claimed', 'broker: delivery not claimed')
  })
}

export type DeadDeliveryParams = {
  moduleKey: string
  authToken: string
  deliveryId: string
  claimToken: string
  lastError?: string
}
export type DeadDeliveryResult = { result: 'dead' | 'alreadyDead' }

/** deadDelivery (§5.9.4, О6/О7) — зеркально ackDelivery, CAS-first + та же классификация. */
export async function deadDeliveryCore(
  ctx: RichUgcCtx,
  params: DeadDeliveryParams
): Promise<BrokerResult<DeadDeliveryResult>> {
  return runOperation(ctx, async () => {
    const row = await authenticateModule(ctx, params.moduleKey, params.authToken)
    assertActive(row)

    // Превышение длины не отклоняет вызов — обрезаем (О7).
    const lastError =
      params.lastError !== undefined ? params.lastError.slice(0, LAST_ERROR_MAX) : undefined

    const won = await BrokerDeliveries.updateAll(ctx, {
      patch: lastError !== undefined ? { status: 'dead', lastError } : { status: 'dead' },
      where: {
        id: params.deliveryId,
        subscriberModuleKey: params.moduleKey,
        status: 'claimed',
        claimToken: params.claimToken
      },
      limit: 1
    })

    if (won === 1) {
      return { result: 'dead' as const }
    }

    const delivery = await retryRead(() => BrokerDeliveries.findById(ctx, params.deliveryId), {
      isStale: (d) => isStaleAfterLostCas(d, params.claimToken)
    })

    if (!delivery) {
      await writeServerLog(ctx, {
        level: 'warn',
        message: 'broker: deadDelivery — delivery not found',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      throw new BrokerOpError('delivery_unavailable', 'broker: delivery not found')
    }

    if (delivery.subscriberModuleKey !== params.moduleKey) {
      await writeServerLog(ctx, {
        level: 'error',
        message: 'broker: deadDelivery — foreign delivery access attempt',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      throw new BrokerOpError('delivery_unavailable', 'broker: delivery not available')
    }

    // Противоречие пережило все ретраи: тот же claimToken уже закрыл строку
    // параллельным повтором закрытия — повтор того же закрытия успешен (О6).
    // Warn: read-lag длиннее 3 ретраев — редкая рантайм-аномалия, полезно видеть.
    if (delivery.status === 'claimed' && delivery.claimToken === params.claimToken) {
      await writeServerLog(ctx, {
        level: 'warn',
        message: 'broker: deadDelivery — stale read survived retries, treating as alreadyDead',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      return { result: 'alreadyDead' as const }
    }

    if (delivery.claimToken !== params.claimToken) {
      await writeServerLog(ctx, {
        level: 'warn',
        message: 'broker: deadDelivery — invalid claim token',
        payload: { deliveryId: params.deliveryId, moduleKey: params.moduleKey }
      })
      throw new BrokerOpError('invalid_claim_token', 'broker: claim token mismatch')
    }

    if (delivery.status === 'dead') {
      return { result: 'alreadyDead' as const }
    }

    // acked или pending (с совпавшей меткой) — отказ (О6)
    await writeServerLog(ctx, {
      level: 'error',
      message: 'broker: deadDelivery — delivery not claimed',
      payload: {
        deliveryId: params.deliveryId,
        moduleKey: params.moduleKey,
        status: delivery.status
      }
    })
    throw new BrokerOpError('delivery_not_claimed', 'broker: delivery not claimed')
  })
}
