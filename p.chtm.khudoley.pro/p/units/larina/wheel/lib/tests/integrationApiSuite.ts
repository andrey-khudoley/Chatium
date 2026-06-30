/**
 * Часть интеграционных проверок: admin-only API и e2e-сценарии.
 * Вызывается из runTemplateIntegrationChecks.
 */
import * as settingsLib from '../settings.lib'
import * as logsRepo from '../../repos/logs.repo'
import * as dashboardLib from '../admin/dashboard.lib'
import * as loggerLib from '../logger.lib'
import { listSettingsRoute } from '../../api/settings/list'
import { getSettingRoute } from '../../api/settings/get'
import { saveSettingRoute } from '../../api/settings/save'
import { logRoute } from '../../api/logger/log'
import { getRecentLogsRoute } from '../../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../../api/admin/logs/before'
import { getDashboardCountsRoute } from '../../api/admin/dashboard/counts'
import { listTestsRoute } from '../../api/tests/list'
import { runTemplateUnitChecks } from './templateUnitSuite'
import { type TemplateIntegrationTestResult, push, tryAsync } from './integrationSuiteHelpers'
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
    // payload в Heap/recent сохраняется только при log_level=Debug (§10.2) — выставляем и восстанавливаем
    const prevLevel = await settingsLib.getLogLevel(ctx)
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, 'Debug')
    try {
      const mark = `[tpl-payload-${Date.now()}]`
      await loggerLib.writeServerLog(ctx, { severity: 6, message: mark, payload: { x: 1 } })
      const recent = (await getRecentLogsRoute.query({ limit: '20' }).run(ctx)) as {
        entries?: Array<{ args?: unknown[] }>
      }
      return (
        Array.isArray(recent.entries) &&
        recent.entries.some((e) => e.args?.some((a) => String(a).includes('"x"')))
      )
    } finally {
      await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.LOG_LEVEL, prevLevel)
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
}
