/**
 * Интеграционные проверки с реальным ctx (вызывается из GET /api/tests/integration).
 */
import * as settingsLib from '../settings.lib'
import * as settingsRepo from '../../repos/settings.repo'
import * as logsRepo from '../../repos/logs.repo'
import * as dashboardLib from '../admin/dashboard.lib'
import * as loggerLib from '../logger.lib'
import { logRoute } from '../../api/logger/log'
import { getRecentLogsRoute } from '../../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../../api/admin/logs/before'
import { runTemplateUnitChecks } from './templateUnitSuite'
import { runIntegrationApiChecks } from './integrationApiSuite'
import { runIntegrationCoreChecks } from './integrationCoreSuite'
import { type TemplateIntegrationTestResult, tryAsync, isAdmin } from './integrationSuiteHelpers'

export type { TemplateIntegrationTestResult } from './integrationSuiteHelpers'

export async function runTemplateIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []
  const admin = isAdmin(ctx)

  await runIntegrationCoreChecks(ctx, results)

  await tryAsync(results, 'regression_getLogLevel_no_recursion', 'getLogLevel x50', async () => {
    for (let i = 0; i < 50; i++) {
      await settingsLib.getLogLevel(ctx)
    }
    return true
  })

  await tryAsync(results, 'regression_getSetting_no_recursion', 'getSetting x50', async () => {
    for (let i = 0; i < 50; i++) {
      await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL)
    }
    return true
  })

  await tryAsync(results, 'settings_repo_upsert_create_update', 'settings upsert', async () => {
    const key = '__tpl_test_key_' + Date.now()
    await settingsRepo.upsert(ctx, key, 'a')
    const r1 = await settingsRepo.findByKey(ctx, key)
    await settingsRepo.upsert(ctx, key, 'b')
    const r2 = await settingsRepo.findByKey(ctx, key)
    await settingsRepo.deleteByKey(ctx, key)
    return r1?.value === 'a' && r2?.value === 'b'
  })

  await tryAsync(results, 'settings_repo_deleteByKey', 'deleteByKey idempotent', async () => {
    await settingsRepo.deleteByKey(ctx, '__no_such_key_tpl__')
    return true
  })

  await tryAsync(results, 'logs_repo_create_and_read', 'logs create + findById', async () => {
    const ts = Date.now()
    const row = await logsRepo.create(ctx, {
      message: '[tpl-test] integration create',
      payload: null,
      severity: 6,
      level: 'debug',
      timestamp: ts
    })
    const again = await logsRepo.findById(ctx, row.id)
    return again !== null && again.id === row.id
  })

  await tryAsync(
    results,
    'logs_repo_findBeforeTimestamp_where',
    'findBeforeTimestamp $lt',
    async () => {
      const ts = Date.now()
      await logsRepo.create(ctx, {
        message: '[tpl-test] before',
        payload: 'null',
        severity: 6,
        level: 'info',
        timestamp: ts - 10
      })
      const rows = await logsRepo.findBeforeTimestamp(ctx, ts, 5)
      return Array.isArray(rows) && rows.every((r) => r.timestamp < ts)
    }
  )

  await tryAsync(results, 'logs_repo_count_severities', 'count helpers', async () => {
    const since = 0
    const e = await logsRepo.countErrorsAfter(ctx, since)
    const w = await logsRepo.countWarningsAfter(ctx, since)
    const n = await logsRepo.countBySeverityAfter(ctx, since, 6)
    return typeof e === 'number' && typeof w === 'number' && typeof n === 'number'
  })

  await tryAsync(results, 'regression_logs_create_no_recursion', 'logsRepo.create x3', async () => {
    const ts = Date.now()
    for (let i = 0; i < 3; i++) {
      await logsRepo.create(ctx, {
        message: `[tpl-test] stack ${i}`,
        payload: null,
        severity: 6,
        level: 'debug',
        timestamp: ts + i
      })
    }
    return true
  })

  await tryAsync(
    results,
    'regression_payload_not_object_object',
    'payload JSON в Heap',
    async () => {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: '[tpl] payload obj',
        payload: { a: 1 }
      })
      const rows = await logsRepo.findAll(ctx, { limit: 30, offset: 0 })
      const hit = rows.find((r) => r.message === '[tpl] payload obj')
      return hit != null && typeof hit.payload === 'string' && hit.payload.includes('"a"')
    }
  )

  await tryAsync(results, 'logger_writeServerLog_filter', 'Error отсекает severity 6', async () => {
    const prev = await settingsLib.getLogLevel(ctx)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, 'Error')
    const msg = `[tpl-filter-${Date.now()}]`
    await loggerLib.writeServerLog(ctx, { severity: 6, message: msg, payload: {} })
    const rows = await logsRepo.findAll(ctx, { limit: 50, offset: 0 })
    const hit = rows.find((r) => r.message === msg)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, prev)
    return !hit
  })

  await tryAsync(results, 'dashboard_reset', 'resetDashboard', async () => {
    const r = await dashboardLib.resetDashboard(ctx)
    return r.errorCount === 0 && r.warnCount === 0 && typeof r.resetAt === 'number'
  })

  await tryAsync(results, 'dashboard_flow_logs', 'после reset счётчики 0', async () => {
    const c = await dashboardLib.getDashboardCounts(ctx)
    return c.errorCount === 0 && c.warnCount === 0
  })

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
    await loggerLib.writeServerLog(ctx, { severity: 6, message: mark, payload: { x: 1 } })
    const recent = (await getRecentLogsRoute.query({ limit: '20' }).run(ctx)) as {
      entries?: Array<{ args?: unknown[] }>
    }
    return (
      Array.isArray(recent.entries) &&
      recent.entries.some((e) => e.args?.some((a) => String(a).includes('"x"')))
    )
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

  return results
}
