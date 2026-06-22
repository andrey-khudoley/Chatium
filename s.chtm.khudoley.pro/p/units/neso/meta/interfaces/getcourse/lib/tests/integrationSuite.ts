/**
 * Интеграционные проверки с реальным ctx (вызывается из GET /api/tests/integration).
 */
import * as settingsLib from '../settings.lib'
import * as settingsRepo from '../../repos/settings.repo'
import * as logsRepo from '../../repos/logs.repo'
import * as dashboardLib from '../admin/dashboard.lib'
import * as loggerLib from '../logger.lib'
import { runIntegrationApiChecks } from './integrationApiSuite'
import { runGetCourseIntegrationChecks } from './getcourseIntegrationSuite'
import { type TemplateIntegrationTestResult, tryAsync, isAdmin } from './integrationSuiteHelpers'

export type { TemplateIntegrationTestResult } from './integrationSuiteHelpers'

export async function runTemplateIntegrationChecks(
  ctx: app.Ctx
): Promise<TemplateIntegrationTestResult[]> {
  const results: TemplateIntegrationTestResult[] = []
  const admin = isAdmin(ctx)

  await tryAsync(
    results,
    'settings_get_project_name',
    'getSettingString(PROJECT_NAME)',
    async () => {
      const name = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
      return typeof name === 'string'
    }
  )

  await tryAsync(results, 'settings_get_log_level', 'getLogLevel валиден', async () => {
    const level = await settingsLib.getLogLevel(ctx)
    return (
      typeof level === 'string' && settingsLib.LOG_LEVELS.includes(level as settingsLib.LogLevel)
    )
  })

  await tryAsync(results, 'settings_repo_findAll', 'settings.repo findAll', async () => {
    const rows = await settingsRepo.findAll(ctx)
    return Array.isArray(rows)
  })

  await tryAsync(results, 'settings_repo_findByKey', 'settings.repo findByKey', async () => {
    await settingsRepo.findByKey(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
    return true
  })

  await tryAsync(results, 'logs_repo_findAll', 'logs.repo findAll', async () => {
    const rows = await logsRepo.findAll(ctx, { limit: 1, offset: 0 })
    return Array.isArray(rows)
  })

  await tryAsync(results, 'dashboard_get_counts', 'getDashboardCounts', async () => {
    const c = await dashboardLib.getDashboardCounts(ctx)
    return (
      typeof c.errorCount === 'number' &&
      typeof c.warnCount === 'number' &&
      typeof c.resetAt === 'number'
    )
  })

  await tryAsync(results, 'logger_admin_socket', 'getAdminLogsSocketId(ctx)', async () => {
    const socketId = loggerLib.getAdminLogsSocketId(ctx)
    return typeof socketId === 'string' && socketId.length > 0
  })

  await tryAsync(
    results,
    'settings_getSetting_branches',
    'getSetting неизвестный ключ → null',
    async () => {
      const v = await settingsLib.getSetting(ctx, 'totally_unknown_key_xyz')
      return v === null
    }
  )

  await tryAsync(results, 'settings_getLogsLimit_parse', 'getLogsLimit', async () => {
    const n = await settingsLib.getLogsLimit(ctx)
    return typeof n === 'number' && n >= 1 && n <= 10000
  })

  await tryAsync(results, 'settings_getLogWebhook', 'getLogWebhook', async () => {
    const w = await settingsLib.getLogWebhook(ctx)
    return typeof w.enable === 'boolean' && typeof w.url === 'string'
  })

  await tryAsync(results, 'settings_getDashboardResetAt', 'getDashboardResetAt', async () => {
    const t = await settingsLib.getDashboardResetAt(ctx)
    return typeof t === 'number' && t >= 0
  })

  await tryAsync(results, 'settings_getAllSettings', 'getAllSettings', async () => {
    const all = await settingsLib.getAllSettings(ctx)
    return Object.keys(settingsLib.DEFAULTS).every((k) => k in all)
  })

  await tryAsync(results, 'settings_setSetting_log_level', 'setSetting LOG_LEVEL', async () => {
    const prev = await settingsLib.getLogLevel(ctx)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, 'Debug')
    const v = await settingsLib.getLogLevel(ctx)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, prev)
    return v === 'Debug'
  })

  await tryAsync(results, 'settings_setSetting_logs_limit', 'setSetting LOGS_LIMIT', async () => {
    const prev = await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.LOGS_LIMIT)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOGS_LIMIT, '100')
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOGS_LIMIT, prev)
    return true
  })

  await tryAsync(
    results,
    'settings_setSetting_project_fields',
    'setSetting PROJECT_NAME trim',
    async () => {
      const prev = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
      await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME, '  x  ')
      const v = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
      await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME, prev)
      return v === 'x'
    }
  )

  await tryAsync(results, 'settings_setSetting_webhook', 'setSetting LOG_WEBHOOK', async () => {
    const prev = await settingsLib.getLogWebhook(ctx)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_WEBHOOK, {
      enable: false,
      url: ''
    })
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_WEBHOOK, prev)
    return true
  })

  await tryAsync(
    results,
    'settings_setSetting_dashboard_reset',
    'setSetting DASHBOARD_RESET_AT',
    async () => {
      const prev = await settingsLib.getDashboardResetAt(ctx)
      await settingsLib.setSetting(
        ctx,
        settingsLib.SETTING_KEYS.DASHBOARD_RESET_AT,
        Math.floor(prev) + 0
      )
      return true
    }
  )

  await tryAsync(
    results,
    'settings_setSetting_unknown_key',
    'неизвестный ключ upsert',
    async () => {
      const k = '__tpl_unknown_' + Date.now()
      await settingsLib.setSetting(ctx, k, { a: 1 })
      const v = await settingsLib.getSetting(ctx, k)
      await settingsRepo.deleteByKey(ctx, k)
      return v !== null && typeof v === 'object'
    }
  )

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

  const gcResults = await runGetCourseIntegrationChecks(ctx)
  results.push(...gcResults)

  return results
}
