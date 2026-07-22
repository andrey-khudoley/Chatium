import { tryRunWithExclusiveLock } from '@app/sync'
import { BrokerEvents } from '../tables/events.table'
import { runFanoutPass } from '../lib/broker/fanout'
import { writeServerLog } from '../lib/log/logger'
import { lockKey } from '../config/env'

/**
 * Fan-out-дренер (§5.8 фаза 2). Единственный замок lockKey('drainer')
 * (tryRunWithExclusiveLock — если проход уже идёт, выходим; корректность и так
 * держит идемпотентный ключ доставки, §3.3).
 *
 * ⚠️ Перепланирование — ВНУТРИ замка и ДО тяжёлой части (два урока разом):
 * 1. До тяжёлой части — проход, переросший бюджет джоба (60с), обрывается, код
 *    за тяжёлой операцией не исполняется (005-jobs.md); преемник к этому
 *    моменту уже запланирован — цепочка выживает.
 * 2. Внутри замка — цепочку ведёт ТОЛЬКО держатель. Перепланирование до/вне
 *    замка (RV 22-07-2026) даёт шторм: каждый publish планирует джоб, каждый
 *    проснувшийся при backlog>0 плодит преемника и 5с ждёт занятый замок —
 *    популяция джобов не сходится, сервис замков насыщается, чужие
 *    runWithExclusiveLock (регистрация) начинают падать по таймауту.
 * Skip-путь преемника НЕ планирует и ждёт замок коротко (250мс): занято =
 * держатель жив и его цепочка продолжится; умер держатель без преемника —
 * события останутся dispatchedAt=null и их подберёт триггер следующего publish
 * (recovery by design, §5.8).
 */
export const fanoutDrainerJob = app.job('/', async (ctx) => {
  await writeServerLog(ctx, { level: 'debug', message: 'broker: drainer wake' })

  const lockResult = await tryRunWithExclusiveLock(ctx, lockKey('drainer'), 250, async () => {
    const backlog = await BrokerEvents.countBy(ctx, { dispatchedAt: null })
    if (backlog > 0) {
      // Страховка цепочки держателя — до тяжёлой части (см. шапку, урок 1).
      await fanoutDrainerJob.scheduleJobAsap(ctx, {})
    }
    return runFanoutPass(ctx)
  })

  if (lockResult.success) {
    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: drainer pass done (events=${lockResult.result.eventsProcessed}, deliveries=${lockResult.result.deliveriesCreated}, backlog=${lockResult.result.backlogRemaining})`,
      marks: {
        eventsProcessed: lockResult.result.eventsProcessed,
        deliveriesCreated: lockResult.result.deliveriesCreated,
        backlogRemaining: lockResult.result.backlogRemaining
      }
    })
  } else {
    // Проход уже идёт в другом инстансе — его цепочка и продолжит дренаж;
    // преемника не планируем (иначе шторм, см. шапку, урок 2).
    await writeServerLog(ctx, { level: 'debug', message: 'broker: drainer skip — lock busy' })
  }
})
