import { runWithExclusiveLock } from '@app/sync'
import { BrokerEvents } from '../../tables/events.table'
import { type BrokerResult, assertCondition, runOperation } from './result'
import { authenticateModule, assertActive } from './auth'
import { isValidEventType, moduleCanPublish } from './glob'
import { writeServerLog } from '../log/logger'
import { fanoutDrainerJob } from '../../jobs/fanout-drainer'
import { lockKey } from '../../config/env'
import { PAYLOAD_MAX_CHARS, RESERVED_EVENT_PREFIX } from '../../config/constants'

export type PublishEventParams = {
  moduleKey: string
  authToken: string
  eventType: string
  payload?: unknown
  schemaVersion?: number
  idempotencyKey?: string
}

export type PublishEventResult = { eventId: string; deduplicated: boolean }

/**
 * Публикация события (§5.8, фаза 1) — синхронно, минимум работы: auth →
 * проверки → запись строки BrokerEvents (dispatchedAt=null) → триггер
 * fan-out-дренера asap. Материализация доставок — асинхронная фаза 2 (fanout.ts).
 */
export async function publishEventCore(
  ctx: RichUgcCtx,
  params: PublishEventParams
): Promise<BrokerResult<PublishEventResult>> {
  return runOperation(ctx, async () => {
    const row = await authenticateModule(ctx, params.moduleKey, params.authToken)
    assertActive(row)

    // Даже '*' в allowedPublishTypes не даёт права публиковать в системный namespace.
    assertCondition(
      !params.eventType.startsWith(RESERVED_EVENT_PREFIX),
      'reserved_namespace',
      `broker: event type must not use reserved "${RESERVED_EVENT_PREFIX}" namespace`
    )
    assertCondition(
      isValidEventType(params.eventType),
      'invalid_pattern',
      `broker: invalid event type "${params.eventType}"`
    )
    assertCondition(
      moduleCanPublish(row.allowedPublishTypes, params.eventType),
      'publish_not_allowed',
      `broker: module "${params.moduleKey}" is not allowed to publish "${params.eventType}"`
    )

    // '?? null' — guard: JSON.stringify(undefined) возвращает undefined, .length бросил бы мимо конверта.
    const payloadSize = JSON.stringify(params.payload ?? null).length
    assertCondition(
      payloadSize <= PAYLOAD_MAX_CHARS,
      'payload_too_large',
      `broker: payload exceeds ${PAYLOAD_MAX_CHARS} chars (${payloadSize})`
    )

    const schemaVersion = params.schemaVersion ?? 1

    let eventId: string
    let deduplicated = false

    if (params.idempotencyKey) {
      const idempotencyKey = params.idempotencyKey
      const lockResult = await runWithExclusiveLock(
        ctx,
        lockKey('dedup', params.moduleKey, idempotencyKey),
        async () => {
          const existing = await BrokerEvents.findOneBy(ctx, {
            producerModuleKey: params.moduleKey,
            idempotencyKey
          })
          if (existing) {
            return { eventId: existing.id, deduplicated: true }
          }
          const created = await BrokerEvents.create(ctx, {
            eventType: params.eventType,
            schemaVersion,
            producerModuleKey: params.moduleKey,
            payload: params.payload,
            idempotencyKey,
            dispatchedAt: null
          })
          return { eventId: created.id, deduplicated: false }
        }
      )
      eventId = lockResult.eventId
      deduplicated = lockResult.deduplicated
    } else {
      const created = await BrokerEvents.create(ctx, {
        eventType: params.eventType,
        schemaVersion,
        producerModuleKey: params.moduleKey,
        payload: params.payload,
        dispatchedAt: null
      })
      eventId = created.id
    }

    // Хвост после точки невозврата (фикс-раунда 1, п.9): событие уже создано —
    // сбой планирования дренера/лога не должен провалить публикацию. Событие
    // durable (dispatchedAt=null) — следующий publish/фикс перепланирует дренер;
    // лог самой ошибки хвоста — тоже в try/catch.
    try {
      await fanoutDrainerJob.scheduleJobAsap(ctx, {})
      await writeServerLog(ctx, {
        level: 'info',
        message: `broker: event "${params.eventType}" published by "${params.moduleKey}" (eventId=${eventId}, dedup=${deduplicated})`,
        marks: {
          moduleKey: params.moduleKey,
          eventType: params.eventType,
          eventId,
          deduplicated: String(deduplicated)
        }
      })
    } catch (e) {
      try {
        await writeServerLog(ctx, {
          level: 'error',
          message: `broker: сбой хвоста публикации "${eventId}" (планирование дренера/лог)`,
          payload: { eventId, error: e instanceof Error ? e.message : String(e) }
        })
      } catch {
        // best-effort — не мешаем возврату eventId, даже если сам лог ошибки не прошёл
      }
    }

    return { eventId, deduplicated }
  })
}
