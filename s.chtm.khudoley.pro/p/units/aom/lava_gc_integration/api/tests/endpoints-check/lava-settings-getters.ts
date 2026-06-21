// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'

const LOG_PATH = 'api/tests/endpoints-check/lava-settings-getters'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/lava-settings-getters — геттеры настроек Lava и GetCourse (без секретов в ответе).
 */
export const lavaSettingsGettersTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки геттеров интеграции`,
    payload: {}
  })

  const results: TestResult[] = []

  const check = async (id: string, title: string, fn: () => Promise<boolean>) => {
    try {
      const passed = await fn()
      results.push({ id, title, passed })
    } catch (e) {
      results.push({
        id,
        title,
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  await check(
    'getLavaApiKey',
    'getLavaApiKey (string)',
    async () => typeof (await settingsLib.getLavaApiKey(ctx)) === 'string'
  )
  await check(
    'getLavaBaseUrl',
    'getLavaBaseUrl (string)',
    async () => typeof (await settingsLib.getLavaBaseUrl(ctx)) === 'string'
  )
  await check(
    'getLavaProductId',
    'getLavaProductId (string)',
    async () => typeof (await settingsLib.getLavaProductId(ctx)) === 'string'
  )
  await check(
    'getLavaOfferId',
    'getLavaOfferId (string)',
    async () => typeof (await settingsLib.getLavaOfferId(ctx)) === 'string'
  )
  await check(
    'getLavaWebhookSecret',
    'getLavaWebhookSecret (string)',
    async () => typeof (await settingsLib.getLavaWebhookSecret(ctx)) === 'string'
  )
  await check(
    'getGcApiKey',
    'getGcApiKey (string)',
    async () => typeof (await settingsLib.getGcApiKey(ctx)) === 'string'
  )
  await check(
    'getGcAccountDomain',
    'getGcAccountDomain (string)',
    async () => typeof (await settingsLib.getGcAccountDomain(ctx)) === 'string'
  )
  await check(
    'getGcOrderFlagAddfieldId',
    'getGcOrderFlagAddfieldId (string)',
    async () => typeof (await settingsLib.getGcOrderFlagAddfieldId(ctx)) === 'string'
  )

  return { success: true, test: 'lava-settings-getters', results, at: Date.now() }
})
