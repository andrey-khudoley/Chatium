/**
 * Интеграционные проверки API-роутов админки (требуют роли Admin). Вынесены из
 * integrationSuite ради лимита размера файла; вызываются из runTemplateIntegrationChecks.
 */
import { listSettingsRoute } from '../../api/settings/list'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { getRecentLogsRoute } from '../../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../../api/admin/logs/before'
import { getDashboardCountsRoute } from '../../api/admin/dashboard/counts'
import { listTestsRoute } from '../../api/tests/list'
import { type TemplateIntegrationTestResult, push, tryAsync } from './integrationSuiteHelpers'

/**
 * Дописывает в `results` проверки API-роутов админки. При отсутствии роли Admin
 * помечает их как непройденные (с пояснением).
 */
export async function runIntegrationApiChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[],
  admin: boolean
): Promise<void> {
  const skipAdmin = 'нужна роль Admin (ctx.user.is("Admin"))'

  if (admin) {
    await tryAsync(results, 'api_settings_list', 'settings/list', async () => {
      const r = (await listSettingsRoute.run(ctx)) as { success?: boolean }
      return r.success === true
    })

    await tryAsync(results, 'api_settings_get', 'settings/get', async () => {
      const r = (await getSettingRoute.query({ key: 'project_name' }).run(ctx)) as {
        success?: boolean
      }
      return r.success === true
    })

    await tryAsync(
      results,
      'api_settings_save_validation',
      'settings/save пустой key',
      async () => {
        const r = (await saveSettingRoute.run(ctx, { key: '', value: 'x' })) as {
          success?: boolean
        }
        return r.success === false
      }
    )

    await tryAsync(results, 'api_admin_logs_recent', 'admin/logs/recent', async () => {
      const r = (await getRecentLogsRoute.query({ limit: '5' }).run(ctx)) as {
        success?: boolean
        entries?: unknown[]
      }
      return r.success === true && Array.isArray(r.entries)
    })

    await tryAsync(results, 'api_admin_logs_before', 'admin/logs/before', async () => {
      const r = (await getLogsBeforeRoute
        .query({ beforeTimestamp: String(Date.now()), limit: '2' })
        .run(ctx)) as { success?: boolean }
      return r.success === true
    })

    await tryAsync(results, 'api_admin_dashboard_counts', 'dashboard/counts', async () => {
      const r = (await getDashboardCountsRoute.run(ctx)) as {
        success?: boolean
        errorCount?: number
      }
      return r.success === true && typeof r.errorCount === 'number'
    })

    await tryAsync(results, 'api_tests_list_shape', 'tests/list', async () => {
      const r = (await listTestsRoute.run(ctx)) as { success?: boolean; categories?: unknown[] }
      return r.success === true && Array.isArray(r.categories) && r.categories.length >= 3
    })
  } else {
    push(results, 'api_settings_list', 'settings/list', false, skipAdmin)
    push(results, 'api_settings_get', 'settings/get', false, skipAdmin)
    push(results, 'api_settings_save_validation', 'settings/save', false, skipAdmin)
    push(results, 'api_admin_logs_recent', 'admin/logs/recent', false, skipAdmin)
    push(results, 'api_admin_logs_before', 'admin/logs/before', false, skipAdmin)
    push(results, 'api_admin_dashboard_counts', 'dashboard/counts', false, skipAdmin)
    push(results, 'api_tests_list_shape', 'tests/list', false, skipAdmin)
  }
}
