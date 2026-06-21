/**
 * Сценарии /v1/{op} — фаза 4 (деструктор). Вынесено из v1OpsScenarios ради лимита размера
 * файла; собирается в общий реестр в v1OpsScenarios (порядок сохранён).
 */
import { type V1OpScenario } from './v1OpsScenarioHelpers'

export const v1OpsScenariosPhase4: V1OpScenario[] = [
  {
    op: 'updateDealFields',
    phase: 4,
    dependsOn: ['createDeal'],
    hint: 'Деструктор фазы 4: status:"false" (false-сделка) — снимает артефакт createDeal.',
    build: ({ runCtx }) => {
      if (runCtx.dealId === undefined) return { skip: 'Нет dealId — createDeal не отработал' }
      return { args: { dealId: Number(runCtx.dealId), status: 'false' } }
    }
  }
]
