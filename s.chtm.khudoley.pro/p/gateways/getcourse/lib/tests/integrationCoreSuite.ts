/**
 * «Ядро» интеграционных проверок (settings/repos/dashboard/logger + живой
 * вызов /v1/addUser). Вынесено из integrationSuite ради лимита размера файла;
 * дописывает результаты в общий массив через runTemplateIntegrationChecks.
 */
import * as settingsLib from '../settings.lib'
import * as settingsRepo from '../../repos/settings.repo'
import * as logsRepo from '../../repos/logs.repo'
import * as dashboardLib from '../admin/dashboard.lib'
import * as loggerLib from '../logger.lib'
import { handleV1AddUserPost } from '../gateway/v1AddUserHandler'
import {
  GW_HEADER_GATEWAY_REQUEST_ID,
  GW_HEADER_SCHOOL_API_KEY,
  GW_HEADER_SCHOOL_HOST
} from '../../shared/gatewayHttpHeaders'
import { validateGcSchoolHostTrimmed } from '../../shared/gcSchoolHostValidation'
import {
  type TemplateIntegrationTestResult,
  GC_INTEGRATION_TESTER_EMAIL,
  tryAsync
} from './integrationSuiteHelpers'
export async function runIntegrationCoreChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[]
): Promise<void> {
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

  await tryAsync(
    results,
    'settings_setSetting_gc_dev_rejects_whitespace',
    'gc_developer_api_key пробелы',
    async () => {
      let threw = false
      try {
        await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.GC_DEVELOPER_API_KEY, ' \t ')
      } catch {
        threw = true
      }
      return threw
    }
  )

  await tryAsync(
    results,
    'settings_setSetting_gc_host_trim',
    'gc_test_school_host trim',
    async () => {
      const key = settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_HOST
      const prev = await settingsLib.getSetting(ctx, key)
      try {
        await settingsLib.setSetting(ctx, key, '  integ-test-host.getcourse.ru  ')
        const v = await settingsLib.getSetting(ctx, key)
        return v === 'integ-test-host.getcourse.ru'
      } finally {
        if (typeof prev === 'string' && prev.trim()) {
          await settingsLib.setSetting(ctx, key, prev)
        } else {
          await settingsRepo.deleteByKey(ctx, key)
        }
      }
    }
  )

  await tryAsync(
    results,
    'settings_setSetting_gc_host_rejects_https',
    'gc_test_school_host без https',
    async () => {
      let threw = false
      try {
        await settingsLib.setSetting(
          ctx,
          settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_HOST,
          'https://x.getcourse.ru'
        )
      } catch {
        threw = true
      }
      return threw
    }
  )

  await tryAsync(
    results,
    'gateway_v1_addUser_live',
    'POST /v1/addUser → GetCourse (Heap уровня A)',
    async () => {
      const rawDev = await settingsLib.getSetting(
        ctx,
        settingsLib.SETTING_KEYS.GC_DEVELOPER_API_KEY
      )
      const rawSchoolKey = await settingsLib.getSetting(
        ctx,
        settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_API_KEY
      )
      const rawHost = await settingsLib.getSetting(
        ctx,
        settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_HOST
      )
      const devKey = typeof rawDev === 'string' ? rawDev.trim() : ''
      const schoolKey = typeof rawSchoolKey === 'string' ? rawSchoolKey.trim() : ''
      const hostStr = typeof rawHost === 'string' ? rawHost.trim() : ''
      if (!devKey || !schoolKey || !hostStr) {
        throw new Error(
          'В Heap нужны непустые gc_developer_api_key, gc_test_school_api_key, gc_test_school_host (gateway-testing-strategy §1.1).'
        )
      }
      const hostErr = validateGcSchoolHostTrimmed(hostStr)
      if (hostErr) {
        throw new Error(`gc_test_school_host: ${hostErr}`)
      }
      const res = await handleV1AddUserPost(ctx, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          [GW_HEADER_SCHOOL_HOST]: hostStr,
          [GW_HEADER_SCHOOL_API_KEY]: schoolKey
        },
        body: {
          params: {
            user: { email: GC_INTEGRATION_TESTER_EMAIL }
          }
        }
      })
      if (res.statusCode !== 200) {
        let detail = `HTTP ${res.statusCode}`
        try {
          const j = JSON.parse(res.rawHttpBody) as { error?: { code?: string } }
          if (j?.error?.code) {
            detail += ` (${j.error.code})`
          }
        } catch {
          /* ignore */
        }
        throw new Error(detail)
      }
      const parsed = JSON.parse(res.rawHttpBody) as {
        ok?: unknown
        requestId?: unknown
        data?: unknown
      }
      if (parsed.ok !== true) {
        throw new Error('В теле ответа нет ok: true')
      }
      const rid = parsed.requestId
      if (typeof rid !== 'string' || rid.length < 8) {
        throw new Error('В теле ответа нет валидного requestId')
      }
      if (res.headers[GW_HEADER_GATEWAY_REQUEST_ID] !== rid) {
        throw new Error('Заголовок X-Gateway-Request-Id не совпадает с requestId в JSON')
      }
      if (parsed.data === undefined) {
        throw new Error('В теле ответа нет поля data')
      }
      return true
    }
  )
}
