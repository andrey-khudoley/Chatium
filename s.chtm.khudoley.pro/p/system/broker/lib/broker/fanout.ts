import { runWithExclusiveLock } from '@app/sync'
import { BrokerEvents } from '../../tables/events.table'
import { BrokerModules } from '../../tables/modules.table'
import { BrokerDeliveries } from '../../tables/deliveries.table'
import { expandAncestors } from './glob'
import { writeServerLog } from '../log/logger'
import { lockKey } from '../../config/env'
import { DRAIN_BATCH } from '../../config/constants'

export type FanoutPassResult = {
  eventsProcessed: number
  deliveriesCreated: number
  backlogRemaining: number
}

/**
 * Один проход fan-out (§5.8 фаза 2): события с dispatchedAt=null → материализация
 * доставок активным подписчикам, идемпотентно по (eventId, subscriberModuleKey)
 * под замком на событие. dispatchedAt проставляется ПОСЛЕ создания всех доставок.
 * Джоб здесь не планируется — планирует вызывающий (publish/audit/дренер, §5.8).
 *
 * Per-event изоляция (фикс-раунда 1, п.11): одно «ядовитое» событие не должно
 * останавливать весь проход — ошибка логируется, проход продолжается со
 * следующего события (событие остаётся dispatchedAt=null и будет подхвачено
 * следующим проходом).
 */
export async function runFanoutPass(ctx: RichUgcCtx): Promise<FanoutPassResult> {
  const events = await BrokerEvents.findAll(ctx, {
    where: { dispatchedAt: null },
    order: [{ createdAt: 'asc' }],
    limit: DRAIN_BATCH
  })

  let eventsProcessed = 0
  let deliveriesCreated = 0

  for (const ev of events) {
    try {
      const ancestors = expandAncestors(ev.eventType)

      // Резолв подписчиков (§5.8, §3 «Одно осознанное исключение») — один запрос
      // $includes/$any по реестру участников (ограничен числом модулей, не растёт).
      // Fallback: findAll active + сверка в коде тем же набором предков — на случай,
      // если форма $includes/$any на этой паре поведёт себя иначе, чем в типах.
      let subscriberKeys: string[]
      try {
        const rows = await BrokerModules.findAll(ctx, {
          where: { status: 'active', allowedSubscribeTypes: { $includes: { $any: ancestors } } },
          limit: 1000
        })
        subscriberKeys = rows.map((m) => m.moduleKey)
      } catch (e) {
        // Молчаливый фолбэк — риск, отмеченный ревью (фикс-раунда 1, п.6):
        // без лога расхождение формы $includes/$any с типами прошло бы незамеченным.
        await writeServerLog(ctx, {
          level: 'warn',
          message: 'broker: $includes/$any резолв упал, фолбэк на скан',
          payload: { eventId: ev.id, eventType: ev.eventType, error: String(e) }
        })
        const rows = await BrokerModules.findAll(ctx, { where: { status: 'active' }, limit: 1000 })
        subscriberKeys = rows
          .filter((m) => m.allowedSubscribeTypes.some((p) => ancestors.includes(p)))
          .map((m) => m.moduleKey)
      }

      await runWithExclusiveLock(ctx, lockKey('fanout', ev.id), async () => {
        for (const subscriberModuleKey of subscriberKeys) {
          // Перепроверка существования/активности подписчика ВНУТРИ замка
          // (фикс-раунда 1, п.2б) — сужает окно гонки «fan-out × deleteModule»:
          // резолв подписчиков — снапшот, сделанный до захвата замка; подписчик
          // мог быть удалён/выключен между снапшотом и этой точкой.
          const stillSubscriber = await BrokerModules.findOneBy(ctx, {
            moduleKey: subscriberModuleKey,
            status: 'active'
          })
          if (!stillSubscriber) continue

          const exists = await BrokerDeliveries.findOneBy(ctx, {
            eventId: ev.id,
            subscriberModuleKey
          })
          if (!exists) {
            await BrokerDeliveries.create(ctx, {
              eventId: ev.id,
              eventType: ev.eventType,
              schemaVersion: ev.schemaVersion,
              payload: ev.payload,
              subscriberModuleKey,
              status: 'pending',
              claimCount: 0
            })
            deliveriesCreated++
          }
        }
      })

      await BrokerEvents.update(ctx, { id: ev.id, dispatchedAt: Date.now() })
      eventsProcessed++
    } catch (e) {
      await writeServerLog(ctx, {
        level: 'error',
        message: `broker: fan-out — обработка события "${ev.id}" провалилась, пропуск (событие останется в очереди)`,
        payload: {
          eventId: ev.id,
          eventType: ev.eventType,
          error: e instanceof Error ? e.message : String(e)
        }
      })
      continue
    }
  }

  // Push-триггер подписчикам (§5.8 фаза 2) — пропускается в волне 2: контракта
  // адресата ещё нет (§0.1, ADR-0004), потеря push штатна, pull подберёт.
  // Один лог на проход, не на событие (фикс-раунда 1, п.16в — горячий цикл).
  if (eventsProcessed > 0) {
    await writeServerLog(ctx, {
      level: 'debug',
      message: `broker: push-триггер пропущен для ${eventsProcessed} событий за проход (волна 2, нет контракта адресата)`
    })
  }

  const backlogRemaining = await BrokerEvents.countBy(ctx, { dispatchedAt: null })

  await writeServerLog(ctx, {
    level: 'info',
    message: `broker: fan-out pass done (events=${eventsProcessed}, deliveries=${deliveriesCreated}, backlog=${backlogRemaining})`,
    marks: { eventsProcessed, deliveriesCreated, backlogRemaining }
  })

  return { eventsProcessed, deliveriesCreated, backlogRemaining }
}
