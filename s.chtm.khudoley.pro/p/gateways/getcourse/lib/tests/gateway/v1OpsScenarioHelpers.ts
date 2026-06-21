/**
 * Типы и чистые помощники сценариев /v1/{op} (вынесены из v1OpsScenarios ради
 * лимита размера файла). Сами сценарии разнесены по фазам в v1OpsScenariosPhaseN.
 */
import { type V1OpsRunContext } from './v1OpsRunContext'

/** Поля настроек Heap, прочитанные перед прогоном (`gc_itest_*`). */
export type V1OpsHeapBag = {
  offerId?: string | number
  lessonId?: string | number
  dialogId?: string | number
  telegramChatId?: string
  departmentId?: string | number
  diplomaTemplateId?: string | number
  moderatorId?: string | number
  webinarCommentId?: string | number
  webhookEventId?: string | number
  webhookEventObjectId?: string | number
  webhookUri?: string
}

export type ScenarioBuildResult = { skip: string } | { args: Record<string, unknown> }

export type ScenarioBuildCtx = {
  runCtx: V1OpsRunContext
  heap: V1OpsHeapBag
}

export type V1OpScenario = {
  /** Имя `op` (совпадает с `operationsCatalog[].op`). */
  op: string
  /** Фаза §3.1 стратегии: 1 — каталог/Heap, 2 — производитель, 3 — потребитель, 4 — деструктор. */
  phase: 1 | 2 | 3 | 4
  /** Список op-ов, которые должны успешно отработать в этом сьюите (по §3.4). */
  dependsOn?: readonly string[]
  /** Список Heap-ключей `gc_itest_*` (§5.8 manual), без которых `build` обязан вернуть `skip`. */
  heapKeys?: readonly string[]
  /** Сборка args из контекста и Heap. Возвращает `skip` при недостаточных данных. */
  build: (ctx: ScenarioBuildCtx) => ScenarioBuildResult
  /** Захват полезных id из распарсенного ответа gateway в `runCtx` для последующих сценариев. */
  capture?: (parsedData: unknown, runCtx: V1OpsRunContext) => void
  /** Краткая подсказка для UI: что именно делает сценарий. */
  hint?: string
}

/** Безопасное чтение поля по пути типа "result.user_id". */
export function pickPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined
    if (typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export function asNumberLike(v: unknown): number | string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.length > 0) return v
  return undefined
}

export function firstItem(arr: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
    return arr[0] as Record<string, unknown>
  }
  return undefined
}
