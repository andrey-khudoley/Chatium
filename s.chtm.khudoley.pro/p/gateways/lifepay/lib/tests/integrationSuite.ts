/**
 * Интеграционные проверки с реальным ctx (вызывается из GET /api/tests/integration).
 *
 * Группы проверок вынесены в integrationCoreSuite.ts (lib/repos без Admin) и
 * integrationApiSuite.ts (API-роуты + e2e); хелперы — в integrationSuiteHelpers.ts.
 */
import { type TemplateIntegrationTestResult, isAdmin } from './integrationSuiteHelpers'
import { runIntegrationCoreChecks } from './integrationCoreSuite'
import { runIntegrationApiChecks } from './integrationApiSuite'

export type { TemplateIntegrationTestResult } from './integrationSuiteHelpers'

export async function runTemplateIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []
  const admin = isAdmin(ctx)

  await runIntegrationCoreChecks(ctx, results)
  await runIntegrationApiChecks(ctx, results, admin)

  return results
}
