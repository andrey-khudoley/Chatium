import { BrokerModules } from '../../tables/modules.table'
import { BrokerDeliveries } from '../../tables/deliveries.table'
import { type BrokerResult, runOperation } from './result'
import { authenticateModule } from './auth'
import { publishSystemEvent } from './audit'
import { writeServerLog } from '../log/logger'

export type DeleteModuleParams = { moduleKey: string; authToken: string }
export type DeleteModuleResult = { deletedDeliveries: number }

/**
 * Удаление регистрации модуля (§5.5). Порядок обязателен: доставки удаляются
 * первыми, строка модуля — последней, чтобы moduleKey оставался занятым, пока
 * хвост не убран (иначе новый владелец ключа получил бы чужую очередь).
 * Контракт: таймаут не значит провал — повтор на уже удалённой строке
 * вернёт AccessDeniedError = успех предыдущей попытки (см. §5.5).
 */
export async function deleteModuleCore(
  ctx: RichUgcCtx,
  params: DeleteModuleParams
): Promise<BrokerResult<DeleteModuleResult>> {
  return runOperation(ctx, async () => {
    const row = await authenticateModule(ctx, params.moduleKey, params.authToken)

    const deletedDeliveries = await BrokerDeliveries.deleteAll(ctx, {
      where: { subscriberModuleKey: row.moduleKey },
      limit: null,
      hard: true
    })

    // Hard-удаление (фикс-раунда 1, п.1) — без него строка модуля soft-удаляется:
    // копится мусор с authTokenHash, свип тестов ($ilike 'test-%') её не видит.
    await BrokerModules.delete(ctx, row.id, true)

    await publishSystemEvent(ctx, 'broker.module.deleted', {
      moduleKey: row.moduleKey,
      deletedDeliveries
    })
    await writeServerLog(ctx, {
      level: 'info',
      message: `broker: module "${row.moduleKey}" deleted (cascade: ${deletedDeliveries} deliveries)`,
      marks: { moduleKey: row.moduleKey, deletedDeliveries }
    })

    return { deletedDeliveries }
  })
}
