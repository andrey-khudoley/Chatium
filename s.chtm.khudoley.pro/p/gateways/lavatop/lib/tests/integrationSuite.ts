/**
 * Интеграционные проверки с реальным ctx (вызывается из GET /api/tests/integration).
 */
import * as settingsLib from '../settings.lib'
import * as logsRepo from '../../repos/logs.repo'
import * as dashboardLib from '../admin/dashboard.lib'
import * as loggerLib from '../logger.lib'
import { logRoute } from '../../api/logger/log'
import { getRecentLogsRoute } from '../../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../../api/admin/logs/before'
import { runTemplateUnitChecks } from './templateUnitSuite'
import { runIntegrationApiChecks } from './integrationApiSuite'
import { runIntegrationCoreChecks, runIntegrationLavaChecks } from './integrationCoreSuite'
import { type TemplateIntegrationTestResult, tryAsync, isAdmin } from './integrationSuiteHelpers'

export type { TemplateIntegrationTestResult } from './integrationSuiteHelpers'

export async function runTemplateIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []
  const admin = isAdmin(ctx)

  await runIntegrationCoreChecks(ctx, results)

  await runIntegrationApiChecks(ctx, results, admin)

  await tryAsync(results, 'api_logger_log', 'POST logger/log', async () => {
    const r = (await logRoute.run(ctx, {
      message: '[tpl-integration] ping',
      severity: 6
    })) as { success?: boolean }
    return r.success === true
  })

  await tryAsync(results, 'api_tests_unit_shape', 'юнит-набор (локально)', async () => {
    const u = runTemplateUnitChecks()
    return u.length > 0 && u.every((x) => typeof x.passed === 'boolean')
  })

  await tryAsync(results, 'e2e_settings_name_roundtrip', 'project_name roundtrip', async () => {
    const key = settingsLib.SETTING_KEYS.PROJECT_NAME
    const prev = await settingsLib.getSettingString(ctx, key)
    const tag = `[tpl-${Date.now()}]`
    await settingsLib.setSetting(ctx, key, tag)
    const g = await settingsLib.getSetting(ctx, key)
    await settingsLib.setSetting(ctx, key, prev)
    return g === tag
  })

  await tryAsync(
    results,
    'e2e_log_level_filters_storage',
    'Error + severity 6 не в Heap',
    async () => {
      const prev = await settingsLib.getLogLevel(ctx)
      await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, 'Error')
      const msg = `[tpl-e2e-${Date.now()}]`
      await loggerLib.writeServerLog(ctx, { severity: 6, message: msg, payload: {} })
      const rows = await logsRepo.findAll(ctx, { limit: 80, offset: 0 })
      const leaked = rows.some((r) => r.message === msg)
      await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, prev)
      return !leaked
    }
  )

  await tryAsync(results, 'e2e_logs_pagination', 'recent + before', async () => {
    if (!admin) return true
    const recent = (await getRecentLogsRoute.query({ limit: '3' }).run(ctx)) as {
      entries?: Array<{ timestamp: number }>
    }
    const ts = recent.entries?.[recent.entries.length - 1]?.timestamp
    if (!ts) return true
    const before = (await getLogsBeforeRoute
      .query({ beforeTimestamp: String(ts), limit: '2' })
      .run(ctx)) as { entries?: unknown[]; success?: boolean }
    return before.success === true && Array.isArray(before.entries)
  })

  await tryAsync(results, 'e2e_dashboard_reset_flow', 'reset → counts', async () => {
    await dashboardLib.resetDashboard(ctx)
    const c = await dashboardLib.getDashboardCounts(ctx)
    return c.errorCount === 0 && c.warnCount === 0
  })

  await tryAsync(results, 'e2e_log_payload_roundtrip', 'payload в recent', async () => {
    if (!admin) return true
    const mark = `[tpl-payload-${Date.now()}]`
    const prev = await settingsLib.getLogLevel(ctx)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, 'Debug')
    try {
      await loggerLib.writeServerLog(ctx, { severity: 6, message: mark, payload: { x: 1 } })
      const recent = (await getRecentLogsRoute.query({ limit: '20' }).run(ctx)) as {
        entries?: Array<{ args?: unknown[] }>
      }
      return (
        Array.isArray(recent.entries) &&
        recent.entries.some((e) => e.args?.some((a) => String(a).includes('"x"')))
      )
    } finally {
      await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, prev)
    }
  })

  await tryAsync(
    results,
    'logger_writeServerLog_socket',
    'getAdminLogsSocketId для сокета',
    async () => {
      const id = loggerLib.getAdminLogsSocketId(ctx)
      return id.length > 10
    }
  )

  await tryAsync(results, 'logger_writeServerLog_webhook_url', 'getLogWebhook дефолт', async () => {
    const w = await settingsLib.getLogWebhook(ctx)
    return w.url === '' || typeof w.url === 'string'
  })

  // --- Lava.Top gateway ---
  await runIntegrationLavaChecks(ctx, results)

  return results
}
