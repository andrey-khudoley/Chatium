/**
 * Интеграционные проверки с реальным ctx (вызывается из GET /api/tests/integration).
 *
 * Тонкий оркестратор: фактические проверки разнесены по фазам в соседние файлы
 * (integrationCoreSuite, integrationApiSuite, integrationE2eSuite,
 * integrationDateFilterSuite, integrationAccessSuite). Публичный API
 * (`runTemplateIntegrationChecks`, `TemplateIntegrationTestResult`) сохранён.
 */
import { runIntegrationCoreChecks } from './integrationCoreSuite'
import { runIntegrationApiChecks } from './integrationApiSuite'
import { runIntegrationE2eChecks } from './integrationE2eSuite'
import { runDateFilterIntegrationChecks } from './integrationDateFilterSuite'
import { runAccessIntegrationChecks } from './integrationAccessSuite'
import { type TemplateIntegrationTestResult, isAdmin } from './integrationSuiteHelpers'

export type { TemplateIntegrationTestResult } from './integrationSuiteHelpers'

export async function runTemplateIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []
  const admin = isAdmin(ctx)

  await runIntegrationCoreChecks(ctx, results)
  await runIntegrationApiChecks(ctx, results, admin)
  await runIntegrationE2eChecks(ctx, results, admin)
  await runDateFilterIntegrationChecks(ctx, results)
  await runAccessIntegrationChecks(ctx, results, admin)

  return results
}
