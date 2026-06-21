/**
 * Preflight интеграционного сьюита /v1/{op}: статичный анализ возможности запуска
 * без реальных HTTP-вызовов к GetCourse (gateway-testing-strategy.md §1.1, §1.3, §9).
 *
 * Возвращает по каждому op:
 *  - текущий `availability` из каталога (manual §2.11);
 *  - перечень `dependsOn` по сценарию (стратегия §3.4);
 *  - перечень `gc_itest_*` Heap-ключей, которых не хватает (стратегия §1.2, §5.8 manual);
 *  - вычислимый `runStatus`:
 *      * `ready` — можно запускать (availability ∈ {enabled, beta} И все Heap-ключи заданы И все
 *        транзитивные зависимости тоже `ready`);
 *      * `blocked-availability` — availability ∈ {disabled, unsupported} (§9.1: кнопка Run отключена);
 *      * `warn-heap` — нужный `gc_itest_*` не задан в Heap (§9.3: жёлтый фон, подсказка про §5.9 manual);
 *      * `warn-deps` — зависимый op не `ready` (например `getDealFields` ждёт `createDeal`,
 *        который сам в `warn-heap`).
 *
 * Дополнительно — состояние «уровень A» (§1.1 стратегии): три обязательных ключа Heap,
 * без которых сьюит вообще не имеет права обращаться к /v1/{op}.
 */
import * as loggerLib from '../../logger.lib'
import * as settingsLib from '../../settings.lib'
import { findOperationCatalogEntry } from '../../gateway/operationsCatalog'
import { V1_OPS_HEAP_KEYS, V1_OPS_TESTER_EMAIL, type V1OpsRunContext } from './v1OpsRunContext'
import {
  V1_OPS_EXECUTION_ORDER,
  V1_OPS_SCENARIOS,
  type V1OpScenario,
  type V1OpsHeapBag
} from './v1OpsScenarios'

const LOG_MODULE = 'lib/tests/gateway/v1OpsPreflight'

export type V1OpRunStatus = 'ready' | 'blocked-availability' | 'warn-heap' | 'warn-deps'

export type V1OpPreflight = {
  op: string
  phase: 1 | 2 | 3 | 4
  contour?: 'new' | 'legacy'
  httpMethod?: 'GET' | 'POST'
  availability?: 'enabled' | 'beta' | 'disabled' | 'unsupported'
  dependsOn: readonly string[]
  /** Все Heap-ключи, которых требует сценарий (стратегия §3.4). */
  heapKeys: readonly string[]
  /** Подмножество `heapKeys`, которые ещё не заполнены в Heap. */
  missingHeapKeys: readonly string[]
  /** Подмножество `dependsOn`, которые сами не `ready` (транзитивно). */
  blockedDependencies: readonly string[]
  runStatus: V1OpRunStatus
  /** Готовая фраза для UI (§9.3): что и где задать. */
  blockReason?: string
  hint?: string
}

export type V1OpsPreflightSnapshot = {
  /** Уровень A (§1.1 стратегии, §5.8 manual). */
  levelA: {
    schoolHostSet: boolean
    schoolApiKeySet: boolean
    developerKeySet: boolean
    /** True, если все три обязательных ключа уровня A заданы. */
    ready: boolean
  }
  /** Имена `gc_itest_*` Heap-ключей, реально заполненных в Heap (без значений, §5.7 manual). */
  setHeapKeys: readonly string[]
  /** Имена `gc_itest_*` Heap-ключей, которые сценарии могут потребовать. */
  knownHeapKeys: readonly string[]
  /** Тестовый email пользователя (§2.5 стратегии) — для напоминания администратору. */
  testerEmail: string
  /** Готовность по op'ам в порядке исполнения (фаза → внутри-фазовый порядок). */
  ops: V1OpPreflight[]
  summary: {
    total: number
    ready: number
    blockedAvailability: number
    warnHeap: number
    warnDeps: number
  }
}

const ALL_KNOWN_HEAP_KEYS: readonly string[] = Object.values(V1_OPS_HEAP_KEYS)

async function readLevelA(ctx: app.Ctx): Promise<{
  schoolHost: string
  schoolApiKey: string
  developerKey: string
}> {
  const schoolHost = (
    await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_HOST)
  ).trim()
  const schoolApiKey = (
    await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_API_KEY)
  ).trim()
  const developerKey = (
    await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.GC_DEVELOPER_API_KEY)
  ).trim()
  return { schoolHost, schoolApiKey, developerKey }
}

async function readHeapBag(ctx: app.Ctx): Promise<{ heap: V1OpsHeapBag; setKeys: string[] }> {
  const setKeys: string[] = []
  async function readKey(key: string): Promise<string | undefined> {
    const v = (await settingsLib.getSettingString(ctx, key)).trim()
    if (v.length === 0) return undefined
    setKeys.push(key)
    return v
  }
  const heap: V1OpsHeapBag = {
    offerId: await readKey(V1_OPS_HEAP_KEYS.OFFER_ID),
    lessonId: await readKey(V1_OPS_HEAP_KEYS.LESSON_ID),
    dialogId: await readKey(V1_OPS_HEAP_KEYS.DIALOG_ID),
    telegramChatId: await readKey(V1_OPS_HEAP_KEYS.TELEGRAM_CHAT_ID),
    departmentId: await readKey(V1_OPS_HEAP_KEYS.DEPARTMENT_ID),
    diplomaTemplateId: await readKey(V1_OPS_HEAP_KEYS.DIPLOMA_TEMPLATE_ID),
    moderatorId: await readKey(V1_OPS_HEAP_KEYS.MODERATOR_ID),
    webinarCommentId: await readKey(V1_OPS_HEAP_KEYS.WEBINAR_COMMENT_ID),
    webhookEventId: await readKey(V1_OPS_HEAP_KEYS.WEBHOOK_EVENT_ID),
    webhookEventObjectId: await readKey(V1_OPS_HEAP_KEYS.WEBHOOK_EVENT_OBJECT_ID),
    webhookUri: await readKey(V1_OPS_HEAP_KEYS.WEBHOOK_URI)
  }
  return { heap, setKeys }
}

/** Создаёт «псевдо-runCtx» c заполненными производителями, чтобы проверить только доступность Heap. */
function makePreflightRunCtx(): V1OpsRunContext {
  return {
    schoolHost: '',
    schoolApiKey: '',
    testerEmail: V1_OPS_TESTER_EMAIL,
    completedOps: new Set<string>(),
    skippedOps: new Set<string>()
  }
}

function classifyAvailability(scenario: V1OpScenario): {
  availability?: V1OpPreflight['availability']
  contour?: 'new' | 'legacy'
  httpMethod?: 'GET' | 'POST'
  isBlockedAvailability: boolean
} {
  const entry = findOperationCatalogEntry(scenario.op)
  const availability = entry?.availability
  const isBlockedAvailability = availability === 'disabled' || availability === 'unsupported'
  return {
    availability,
    contour: entry?.contour,
    httpMethod: entry?.httpMethod,
    isBlockedAvailability
  }
}

/** Сборка `args` сценария на пустом контексте — только чтобы понять, не вернёт ли build skip из-за Heap. */
function probeScenarioBuild(scenario: V1OpScenario, heap: V1OpsHeapBag): { skipReason?: string } {
  try {
    const probeCtx = makePreflightRunCtx()
    // Эвристика: для целей префлайта мы заполняем «фантомы» производителей, чтобы вычленить
    // именно Heap-блокировку. Если сценарий зависит от dependsOn, это выяснится отдельно.
    probeCtx.userId = 'preflight'
    probeCtx.dealId = 'preflight'
    probeCtx.groupId = 'preflight'
    probeCtx.webinarId = 'preflight'
    probeCtx.webinarIds = ['preflight']
    probeCtx.managerId = 'preflight'
    probeCtx.lessonAnswerId = 'preflight'
    probeCtx.exportId = 'preflight'
    probeCtx.moderatorId = 'preflight'
    const built = scenario.build({ runCtx: probeCtx, heap })
    if ('skip' in built) return { skipReason: built.skip }
    return {}
  } catch (e) {
    return { skipReason: e instanceof Error ? e.message : String(e) }
  }
}

function computeMissingHeapKeys(scenario: V1OpScenario, setHeapKeys: Set<string>): string[] {
  const required = scenario.heapKeys ?? []
  return required.filter((key) => !setHeapKeys.has(key))
}

/** Транзитивная классификация: ready вычисляется по топологическому порядку фаз. */
function buildPreflightForScenarios(
  setHeapKeys: Set<string>,
  heap: V1OpsHeapBag,
  levelAReady: boolean
): V1OpPreflight[] {
  const byOp = new Map<string, V1OpPreflight>()

  for (const scenario of V1_OPS_EXECUTION_ORDER) {
    const { availability, contour, httpMethod, isBlockedAvailability } =
      classifyAvailability(scenario)

    const missingHeapKeys = computeMissingHeapKeys(scenario, setHeapKeys)
    const blockedDependencies: string[] = []
    if (scenario.dependsOn) {
      for (const dep of scenario.dependsOn) {
        const depPreflight = byOp.get(dep)
        if (!depPreflight || depPreflight.runStatus !== 'ready') {
          blockedDependencies.push(dep)
        }
      }
    }

    let runStatus: V1OpRunStatus
    let blockReason: string | undefined

    if (isBlockedAvailability) {
      runStatus = 'blocked-availability'
      blockReason = `availability=${availability} (manual §2.11). Запуск интеграционного сценария запрещён (стратегия §1.3, §9.1).`
    } else if (!levelAReady) {
      runStatus = 'warn-heap'
      blockReason =
        'Не задан уровень A в Heap: gc_developer_api_key, gc_test_school_api_key, gc_test_school_host (manual §5.8, стратегия §1.1).'
    } else if (missingHeapKeys.length > 0) {
      runStatus = 'warn-heap'
      blockReason = `Нужно задать в админке (manual §5.9): ${missingHeapKeys.join(', ')}.`
    } else {
      const probe = probeScenarioBuild(scenario, heap)
      if (probe.skipReason && blockedDependencies.length === 0) {
        runStatus = 'warn-heap'
        blockReason = probe.skipReason
      } else if (blockedDependencies.length > 0) {
        runStatus = 'warn-deps'
        blockReason = `Транзитивно ждёт: ${blockedDependencies.join(', ')}.`
      } else {
        runStatus = 'ready'
      }
    }

    const preflight: V1OpPreflight = {
      op: scenario.op,
      phase: scenario.phase,
      contour,
      httpMethod,
      availability,
      dependsOn: scenario.dependsOn ?? [],
      heapKeys: scenario.heapKeys ?? [],
      missingHeapKeys,
      blockedDependencies,
      runStatus,
      blockReason,
      hint: scenario.hint
    }
    byOp.set(scenario.op, preflight)
  }

  return [...byOp.values()]
}

export async function buildV1OpsPreflight(ctx: app.Ctx): Promise<V1OpsPreflightSnapshot> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] buildV1OpsPreflight entry`,
    payload: {}
  })

  const levelA = await readLevelA(ctx)
  const { heap, setKeys } = await readHeapBag(ctx)
  const setHeapKeys = new Set(setKeys)
  const levelAReady =
    levelA.schoolHost.length > 0 && levelA.schoolApiKey.length > 0 && levelA.developerKey.length > 0

  const ops = buildPreflightForScenarios(setHeapKeys, heap, levelAReady)

  const summary = {
    total: ops.length,
    ready: ops.filter((o) => o.runStatus === 'ready').length,
    blockedAvailability: ops.filter((o) => o.runStatus === 'blocked-availability').length,
    warnHeap: ops.filter((o) => o.runStatus === 'warn-heap').length,
    warnDeps: ops.filter((o) => o.runStatus === 'warn-deps').length
  }

  const snapshot: V1OpsPreflightSnapshot = {
    levelA: {
      schoolHostSet: levelA.schoolHost.length > 0,
      schoolApiKeySet: levelA.schoolApiKey.length > 0,
      developerKeySet: levelA.developerKey.length > 0,
      ready: levelAReady
    },
    setHeapKeys: setKeys,
    knownHeapKeys: ALL_KNOWN_HEAP_KEYS,
    testerEmail: V1_OPS_TESTER_EMAIL,
    ops,
    summary
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] buildV1OpsPreflight exit`,
    payload: {
      levelAReady,
      setHeapKeysCount: setKeys.length,
      summary
    }
  })

  return snapshot
}

/** Вспомогательная функция для UI: проверка, что op можно запускать (ready). */
export function isV1OpRunnable(preflight: V1OpPreflight): boolean {
  return preflight.runStatus === 'ready'
}

export const _internal_test_helpers_v1OpsPreflight = {
  buildPreflightForScenarios,
  V1_OPS_SCENARIOS
}
