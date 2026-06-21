// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { invoke, type GatewayHttpMethod } from '../../lib/gateway/gatewayClient'

const LOG_PATH = 'api/gateway/invoke'

/**
 * POST /api/gateway/invoke — серверный фасад для вызова `op` через тонкого клиента.
 * Body: `{ op: string, args?: object, httpMethod?: 'GET' | 'POST' }`.
 *
 * Возвращает ровно тот же контракт, что `invoke()` из `lib/gateway/gatewayClient.ts`:
 *   `{ ok, data | error, requestId, warnings, gatewayHttpStatus }`.
 *
 * Доступ — только Admin: эндпоинт удобно использовать из админки тонкого клиента
 * для ручной проверки конфигурации gateway. Прикладные сценарии (App A/B и т.п.)
 * по решению manual §12.1 вызывают тонкого клиента **по обычному HTTP**, а внутри
 * делают тот же вызов `invoke()`; этот роут — точка входа того же поведения через
 * сетевой канал.
 */
export const invokeGatewayRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = (req.body ?? {}) as { op?: unknown; args?: unknown; httpMethod?: unknown }
  const op = typeof body.op === 'string' ? body.op.trim() : ''
  const argsRaw = body.args
  const args =
    argsRaw && typeof argsRaw === 'object' && !Array.isArray(argsRaw)
      ? (argsRaw as Record<string, unknown>)
      : {}
  const httpMethodRaw = typeof body.httpMethod === 'string' ? body.httpMethod.toUpperCase() : ''
  const httpMethod: GatewayHttpMethod | undefined =
    httpMethodRaw === 'GET' || httpMethodRaw === 'POST'
      ? (httpMethodRaw as GatewayHttpMethod)
      : undefined

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] parsed`,
    payload: { op, argsKeys: Object.keys(args), httpMethod: httpMethod ?? null }
  })

  if (!op) {
    return {
      ok: false,
      error: {
        code: 'SDK_BAD_REQUEST',
        message: 'Поле op обязательно: укажите имя операции gateway.'
      },
      requestId: null,
      warnings: [],
      gatewayHttpStatus: 0
    }
  }

  try {
    const result = await invoke(ctx, { op, args, httpMethod })
    const errorCode: string | null =
      result.ok === false ? (result as { error: { code: string } }).error.code : null
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] exit`,
      payload: {
        op,
        ok: result.ok,
        gatewayHttpStatus: result.gatewayHttpStatus,
        requestId: result.requestId,
        errorCode
      }
    })
    return result
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] internal`,
      payload: { op, error: msg }
    })
    return {
      ok: false,
      error: {
        code: 'SDK_INTERNAL_ERROR',
        message: 'Внутренняя ошибка тонкого клиента.',
        details: { error: msg }
      },
      requestId: null,
      warnings: [],
      gatewayHttpStatus: 0
    }
  }
})
