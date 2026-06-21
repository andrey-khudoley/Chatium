/** Сервер-only: импорт `lavaWebhookRoute` тянет `app.body` со схемой — не помечать @shared-route. */
import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import {
  lavaWebhookInfoRoute,
  lavaWebhookRoute
} from '../../../api/integrations/lava/webhook/index'
import * as appPublicUrl from '../../../lib/app-public-url.lib'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'
import * as webhookService from '../../../lib/lava-webhook.service'
import type { LavaWebhookPayload } from '../../../lib/lava-types'

const LOG_PATH = 'api/tests/endpoints-check/lava-webhook-route'
const WEBHOOK_APP_PATH = 'api/integrations/lava/webhook'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

function samplePayload(overrides: Partial<LavaWebhookPayload> = {}): LavaWebhookPayload {
  return {
    eventType: 'payment.success',
    contractId: `route-wh-${Date.now()}`,
    amount: 100,
    currency: 'RUB',
    status: 'completed',
    timestamp: new Date().toISOString(),
    ...overrides
  }
}

/** Тело ответа HTTP webhook: см. `inner/docs/048-chatium-http-response-probes.md` (статус не всегда 401 на проводе). */
function httpIndicatesUnauthorized(statusCode: number, body: unknown): boolean {
  if (statusCode === 401) {
    return true
  }
  if (typeof body === 'string') {
    return /unauthorized/i.test(body)
  }
  if (body && typeof body === 'object' && (body as { success?: boolean }).success === false) {
    return true
  }
  const s = JSON.stringify(body ?? '')
  if (/"success"\s*:\s*false/.test(s)) {
    return true
  }
  if (/Unauthorized/i.test(s)) {
    return true
  }
  return false
}

function httpIndicatesSuccess(body: unknown): boolean {
  if (body && typeof body === 'object' && (body as { success?: boolean }).success === true) {
    return true
  }
  return /"success"\s*:\s*true/.test(JSON.stringify(body ?? ''))
}

async function postWebhookHttp(
  ctx: app.Ctx,
  json: Record<string, unknown>,
  headers: Record<string, string>
): Promise<{ url: string; statusCode: number; body: unknown } | null> {
  const url = appPublicUrl.getAbsoluteUrlForAppPath(
    ctx as { req?: { headers?: Record<string, string | string[] | undefined> } },
    WEBHOOK_APP_PATH
  )
  if (!url) {
    return null
  }
  const response = await request({
    url,
    method: 'post',
    json,
    headers,
    responseType: 'json',
    throwHttpErrors: false
  })
  return { url, statusCode: response.statusCode, body: response.body }
}

function isValidationRelatedFailure(caught: unknown, r: unknown): boolean {
  if (caught) {
    const m = caught instanceof Error ? caught.message : String(caught)
    if (/validat|schema|422|expected|enum|required/i.test(m)) {
      return true
    }
  }
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>
    if (o.statusCode === 422) {
      return true
    }
    const err = String(o.error ?? o.reason ?? '')
    if (/validat/i.test(err)) {
      return true
    }
  }
  return false
}

/**
 * GET /api/tests/endpoints-check/lava-webhook-route — GET-проба, POST через HTTP `request()` (как Lava: заголовок
 * `X-Api-Key`), валидация тела через `route.run`. Если абсолютный URL не собрать — POST-проверки авторизации/успеха
 * через `processWebhook` (тот же сценарий, что `lava-webhook-service`).
 * Query `testId` — выполнить только одну проверку (id из списка).
 */
export const lavaWebhookRouteTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Тесты роута webhook`,
    payload: {}
  })

  const testId =
    typeof req.query?.testId === 'string' && req.query.testId.trim()
      ? req.query.testId.trim()
      : null

  const results: TestResult[] = []
  const secret = (await settingsLib.getLavaWebhookSecret(ctx)).trim()

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

  const allChecks: Array<{ id: string; title: string; fn: () => Promise<boolean> }> = [
    {
      id: 'info_get',
      title: 'webhook GET: ok, status ready, webhookSecretConfigured boolean',
      fn: async () => {
        const res = (await lavaWebhookInfoRoute.run(ctx)) as Record<string, unknown>
        return (
          res.ok === true &&
          res.status === 'ready' &&
          typeof res.webhookSecretConfigured === 'boolean' &&
          res.expectedMethod === 'POST'
        )
      }
    },
    {
      id: 'post_wrong_api_key',
      title: 'webhook POST: неверный X-Api-Key → отказ (401-семантика)',
      fn: async () => {
        const json = { ...samplePayload() } as Record<string, unknown>
        const http = await postWebhookHttp(ctx, json, {
          'X-Api-Key': 'definitely-not-the-webhook-secret'
        })
        if (http) {
          await loggerLib.writeServerLog(ctx, {
            severity: 7,
            message: `[${LOG_PATH}] POST wrong key (HTTP)`,
            payload: { statusCode: http.statusCode, url: http.url }
          })
          return httpIndicatesUnauthorized(http.statusCode, http.body)
        }
        const r = await webhookService.processWebhook(
          ctx,
          samplePayload(),
          'definitely-not-the-webhook-secret'
        )
        return r.success === false && 'statusCode' in r && r.statusCode === 401
      }
    },
    {
      id: 'post_missing_api_key',
      title: 'webhook POST: без заголовка ключа при заданном секрете → отказ',
      fn: async () => {
        if (!secret) {
          return true
        }
        const json = { ...samplePayload() } as Record<string, unknown>
        const http = await postWebhookHttp(ctx, json, {})
        if (http) {
          await loggerLib.writeServerLog(ctx, {
            severity: 7,
            message: `[${LOG_PATH}] POST missing key (HTTP)`,
            payload: { statusCode: http.statusCode, url: http.url }
          })
          return httpIndicatesUnauthorized(http.statusCode, http.body)
        }
        const r = await webhookService.processWebhook(ctx, samplePayload(), '')
        return r.success === false && 'statusCode' in r && r.statusCode === 401
      }
    },
    {
      id: 'post_invalid_body',
      title: 'webhook POST: невалидное тело (eventType) → валидация',
      fn: async () => {
        let r: unknown
        let caught: unknown
        try {
          r = await lavaWebhookRoute.run(ctx, {
            ...samplePayload(),
            eventType: 'totally.invalid.event',
            headers: secret ? { 'X-Api-Key': secret } : { 'X-Api-Key': 'x' }
          })
        } catch (e) {
          caught = e
        }
        return isValidationRelatedFailure(caught, r)
      }
    },
    {
      id: 'post_success_contract_not_found',
      title: 'webhook POST: верный ключ + валидное тело → { success: true }',
      fn: async () => {
        if (!secret) {
          return true
        }
        const contractId = `missing-route-${Date.now()}`
        const json = { ...samplePayload({ contractId }) } as Record<string, unknown>
        const http = await postWebhookHttp(ctx, json, { 'X-Api-Key': secret })
        if (http) {
          await loggerLib.writeServerLog(ctx, {
            severity: 7,
            message: `[${LOG_PATH}] POST success contract_not_found (HTTP)`,
            payload: { statusCode: http.statusCode, url: http.url }
          })
          return httpIndicatesSuccess(http.body)
        }
        const r = await webhookService.processWebhook(ctx, samplePayload({ contractId }), secret)
        return r.success === true
      }
    }
  ]

  const checks = testId ? allChecks.filter((c) => c.id === testId) : allChecks
  if (testId && checks.length === 0) {
    return {
      success: false,
      test: 'lava-webhook-route',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }

  for (const c of checks) {
    await check(c.id, c.title, c.fn)
  }

  return { success: true, test: 'lava-webhook-route', results, at: Date.now() }
})
