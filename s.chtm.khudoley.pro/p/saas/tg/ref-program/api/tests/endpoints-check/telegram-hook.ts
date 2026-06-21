// @shared-route
import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import * as loggerLib from '../../../lib/logger.lib'
import { getTelegramWebhookUrl } from '../../../config/routes'

const LOG_PATH = 'api/tests/endpoints-check/telegram-hook'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/telegram-hook — тесты webhook Telegram: неизвестный botId → 200 и { ok: true }.
 */
export const telegramHookTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки webhook Telegram`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const unknownBotId = 'unknown-bot-id-xyz-' + Date.now()
    const webhookUrl = getTelegramWebhookUrl(unknownBotId)
    const res = await request({
      url: webhookUrl,
      method: 'post',
      json: { update_id: 1 },
      responseType: 'json',
      throwHttpErrors: false
    })
    const body = res.body as { ok?: boolean }
    const statusOk = res.statusCode === 200
    const bodyOk = body?.ok === true
    const passed = statusOk && bodyOk
    results.push({
      id: 'hook-unknown-botId-200',
      title: 'POST hook/telegram?botId= — неизвестный botId → 200 и { ok: true }',
      passed
    })
    if (!passed) {
      results[results.length - 1].error = !statusOk
        ? `ожидался 200, получен ${res.statusCode}`
        : !bodyOk
          ? `ожидался body.ok: true, получено: ${JSON.stringify(body)}`
          : undefined
    }
  } catch (e) {
    results.push({
      id: 'hook-unknown-botId-200',
      title: 'POST hook/telegram?botId= — неизвестный botId → 200 и { ok: true }',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'telegram-hook', results, at: Date.now() }
})
