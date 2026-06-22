import * as loggerLib from '../../lib/logger.lib'
import * as checkoutRequestsRepo from '../../repos/checkoutRequests.repo'
import { processOrderCreatedDeliveries } from '../../lib/checkout/processOrderCreated.lib'
import {
  POLL_BATCH_LIMIT,
  FALLBACK_MAX_ITERATIONS,
  FALLBACK_RESCHEDULE_STEP,
  TERMINAL_STATUSES
} from '../../lib/checkout/constants'

const LOG_MODULE = 'jobs/broker/poll'

type BrokerPollJobParams = {
  requestKey: string
  iteration: number
}

const brokerPollJob = app.job('/broker/poll', async (ctx, params: BrokerPollJobParams) => {
  const { requestKey, iteration } = params

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] вход`,
    payload: { requestKey, iteration }
  })

  // Drain одного батча доставок
  await processOrderCreatedDeliveries(ctx, { limit: POLL_BATCH_LIMIT, maxBatches: 1 })

  // Проверяем строку checkout request
  const row = await checkoutRequestsRepo.findByRequestKey(ctx, requestKey)
  if (row == null) {
    // Строки нет — нечего обрабатывать, останавливаемся
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] строка не найдена — останавливаем джобу`,
      payload: { requestKey, iteration }
    })
    return
  }

  // Терминальный статус — обработка завершена
  if (TERMINAL_STATUSES.includes(row.status)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] статус терминальный — останавливаем джобу`,
      payload: { requestKey, status: row.status, iteration }
    })
    return
  }

  // Исчерпан лимит итераций
  if (iteration + 1 >= FALLBACK_MAX_ITERATIONS) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] исчерпан лимит итераций — останавливаем джобу`,
      payload: { requestKey, iteration, maxIterations: FALLBACK_MAX_ITERATIONS }
    })
    return
  }

  // Перепланируем следующую итерацию (scheduleJobAfter требует await — §005-jobs.md, НЕТ setTimeout)
  await brokerPollJob.scheduleJobAfter(
    ctx,
    FALLBACK_RESCHEDULE_STEP.amount,
    FALLBACK_RESCHEDULE_STEP.unit,
    { requestKey, iteration: iteration + 1 }
  )

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] следующая итерация запланирована`,
    payload: { requestKey, nextIteration: iteration + 1 }
  })
})

export default brokerPollJob
