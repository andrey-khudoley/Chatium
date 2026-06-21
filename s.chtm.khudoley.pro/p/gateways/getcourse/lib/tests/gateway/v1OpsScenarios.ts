/**
 * Реестр сценариев интеграционного прогона /v1/{op} (gateway-testing-strategy.md §3.4).
 *
 * Каждая запись описывает: фазу прогона (1-каталог/Heap, 2-производитель, 3-потребитель,
 * 4-деструктор), зависимости от других op в этом же сьюите, требуемые Heap-ключи
 * `gc_itest_*` (§5.8 manual), сборку args из контекста и захват id из ответа в контекст.
 *
 * Цель — чтобы UI на странице `/web/tests` видел статус и сырой ответ GetCourse для
 * каждого роута `api/v1/*`. Если для op нет производителя или нет Heap-ключа,
 * соответствующий запуск помечается `skip` с человеческим объяснением.
 *
 * Типы и чистые помощники — в v1OpsScenarioHelpers; сами сценарии разнесены по фазам
 * в v1OpsScenariosPhaseN ради лимита размера файла. Здесь — сборка в общий реестр с
 * сохранением исходного порядка фаз и элементов внутри фазы.
 */
import { type V1OpScenario } from './v1OpsScenarioHelpers'
import { v1OpsScenariosPhase1 } from './v1OpsScenariosPhase1'
import { v1OpsScenariosPhase2 } from './v1OpsScenariosPhase2'
import { v1OpsScenariosPhase3a } from './v1OpsScenariosPhase3a'
import { v1OpsScenariosPhase3b } from './v1OpsScenariosPhase3b'
import { v1OpsScenariosPhase4 } from './v1OpsScenariosPhase4'

export type {
  V1OpScenario,
  V1OpsHeapBag,
  ScenarioBuildResult,
  ScenarioBuildCtx
} from './v1OpsScenarioHelpers'

/** Сценарии в исходном порядке (фаза → порядок внутри фазы). */
const SCENARIOS_RAW: V1OpScenario[] = [
  ...v1OpsScenariosPhase1,
  ...v1OpsScenariosPhase2,
  ...v1OpsScenariosPhase3a,
  ...v1OpsScenariosPhase3b,
  ...v1OpsScenariosPhase4
]

/** Реестр сценариев по op (Map для O(1) поиска). */
export const V1_OPS_SCENARIOS: ReadonlyMap<string, V1OpScenario> = new Map(
  SCENARIOS_RAW.map((s) => [s.op, s])
)

/** Линейный порядок исполнения: фаза → исходный порядок внутри фазы. */
export const V1_OPS_EXECUTION_ORDER: readonly V1OpScenario[] = [...SCENARIOS_RAW].sort((a, b) => {
  if (a.phase !== b.phase) return a.phase - b.phase
  return SCENARIOS_RAW.indexOf(a) - SCENARIOS_RAW.indexOf(b)
})
