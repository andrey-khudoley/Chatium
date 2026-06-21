// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { getOperationsCatalog } from '../../lib/gateway/gatewayClient'

const LOG_PATH = 'api/gateway/operations'

/**
 * GET /api/gateway/operations — серверный фасад над `GET /v1/operations` gateway
 * (manual §3.3, §3.4). Возвращает результат `getOperationsCatalog()`:
 *   `{ ok: true, catalog: { catalogSchemaVersion, operations: [...] }, requestId, gatewayHttpStatus }`
 *   либо `{ ok: false, error: { code, message, details? }, requestId, gatewayHttpStatus }`.
 *
 * Заголовки школы (`X-Gc-School-*`) на эндпоинт gateway `/v1/operations` не передаются
 * (manual §3.3) — соответственно и тонкий клиент при чтении каталога обходится
 * только `gateway_url`.
 */
export const gatewayOperationsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  try {
    const result = await getOperationsCatalog(ctx)
    const operationsCount =
      result.ok === true
        ? (result as { catalog: { operations: unknown[] } }).catalog.operations.length
        : 0
    const errorCode: string | null =
      result.ok === false ? (result as { error: { code: string } }).error.code : null
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] exit`,
      payload: {
        ok: result.ok,
        gatewayHttpStatus: result.gatewayHttpStatus,
        requestId: result.requestId,
        operationsCount,
        errorCode
      }
    })
    return result
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] internal`,
      payload: { error: msg }
    })
    return {
      ok: false,
      error: {
        code: 'SDK_INTERNAL_ERROR',
        message: 'Внутренняя ошибка тонкого клиента.',
        details: { error: msg }
      },
      requestId: null,
      gatewayHttpStatus: 0
    }
  }
})
