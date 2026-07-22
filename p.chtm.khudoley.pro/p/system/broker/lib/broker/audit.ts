import { BrokerEvents } from '../../tables/events.table'
import { fanoutDrainerJob } from '../../jobs/fanout-drainer'
import { BROKER_SENTINEL } from '../../config/constants'

/**
 * Системные события истории операций (§3.2, ADR-0009). Изменения состояния
 * модулей и решения по типам фиксируются не отдельной таблицей, а обычными
 * событиями журнала под сентинел-продюсером 'broker'.
 */
export type BrokerAuditEventType =
  | 'broker.module.registered'
  | 'broker.module.status-changed'
  | 'broker.module.deleted'
  | 'broker.publish-types.changed'
  | 'broker.subscribe-types.changed'

/**
 * Публикация системного broker.* события в обход токена/assertCanPublish (§3.2):
 * брокер — хозяин namespace, не участник обмена, поэтому идёт прямым create,
 * а не через publishEventCore. Ошибку записи не глотать — пробрасывается
 * вызывающему (runOperation залогирует и вернёт платформенную 500).
 */
export async function publishSystemEvent(
  ctx: RichUgcCtx,
  eventType: BrokerAuditEventType,
  payload: unknown
): Promise<void> {
  await BrokerEvents.create(ctx, {
    eventType,
    schemaVersion: 1,
    producerModuleKey: BROKER_SENTINEL,
    payload: payload ?? null,
    dispatchedAt: null
  })
  await fanoutDrainerJob.scheduleJobAsap(ctx, {})
}
