/**
 * Раннер интеграционного сьюита /v1/{op} (gateway-testing-strategy.md §3, §6).
 *
 * Запускает реальные HTTP-вызовы к GetCourse через `handleV1OpRouteWithGcDiagnostic`
 * (как если бы платформа вызвала `app.post('/v1/{op}')` или `app.get('/v1/{op}')`), чтобы
 * в результат попадало сырое тело ответа школы для страницы тестов.
 * Между исходящими вызовами — пауза ≥ 1000 мс (1 rps на процесс), чтобы не превышать
 * лимиты школы. Возвращает полный распарсенный ответ для отображения на странице тестов.
 *
 * Движок прогона (чтение Heap, исполнение сценариев, троттлинг, цепочка зависимостей)
 * вынесен в `v1OpsRunEngine` ради лимита размера файла; здесь — только публичные
 * `runAllV1Ops` / `runSingleV1Op` и реэкспорт типов результата.
 */
import { V1_OPS_EXECUTION_ORDER, V1_OPS_SCENARIOS } from './v1OpsScenarios'
import {
  type V1OpsRunSummary,
  readRunSettings,
  makeFreshRunContext,
  runScenariosSequentially,
  collectDependencyChain
} from './v1OpsRunEngine'

export type { V1OpRunResult, V1OpsRunSettings, V1OpsRunSummary } from './v1OpsRunEngine'

/** Полный прогон всех 59 op с фазовым порядком (gateway-testing-strategy.md §3.1). */
export async function runAllV1Ops(ctx: app.Ctx): Promise<V1OpsRunSummary> {
  const startedAt = Date.now()
  const { settings, heap, fatalError } = await readRunSettings(ctx)

  if (!settings) {
    return {
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      fatalError: fatalError ?? 'Тестовая школа не сконфигурирована'
    }
  }

  const runCtx = makeFreshRunContext(settings.schoolHost, settings.schoolApiKey)
  const results = await runScenariosSequentially(ctx, V1_OPS_EXECUTION_ORDER, runCtx, heap)

  const finishedAt = Date.now()
  return {
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results
  }
}

/** Прогон одного op и его транзитивных зависимостей. */
export async function runSingleV1Op(ctx: app.Ctx, opId: string): Promise<V1OpsRunSummary> {
  const startedAt = Date.now()
  const { settings, heap, fatalError } = await readRunSettings(ctx)

  if (!settings) {
    return {
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      fatalError: fatalError ?? 'Тестовая школа не сконфигурирована'
    }
  }

  if (!V1_OPS_SCENARIOS.has(opId)) {
    return {
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      fatalError: `Неизвестный op: ${opId}`
    }
  }

  const chain = collectDependencyChain(opId)
  const runCtx = makeFreshRunContext(settings.schoolHost, settings.schoolApiKey)
  const results = await runScenariosSequentially(ctx, chain, runCtx, heap)

  const finishedAt = Date.now()
  return {
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results
  }
}
