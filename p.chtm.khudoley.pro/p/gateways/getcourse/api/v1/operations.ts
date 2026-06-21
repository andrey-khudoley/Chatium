/**
 * GET /v1/operations — каталог операций gateway без заголовков школы и без вызова GC (manual §3.3, §3.4).
 *
 * Источник — общий TS-модуль `lib/gateway/operationsCatalog.ts` (manual §3.1, §3.2);
 * тот же каталог использует обработчик `/v1/{op}` (manual §3.5), что гарантирует совпадение схем
 * валидации и выдачи. На клиент уходит wire-форма `toOperationSummaries()`
 * (`{ op, httpMethod, contour, availability, argsSchema.fields[] }`) — без рантайм-валидаторов.
 */

import * as loggerLib from '../../lib/logger.lib'
import { newGatewayRequestId } from '../../lib/gateway/requestId'
import { v1ErrorResponse, v1SuccessResponse } from '../../lib/gateway/v1TuneResponse'
import { CATALOG_SCHEMA_VERSION, toOperationSummaries } from '../../lib/gateway/operationsCatalog'

const LOG_PATH = 'api/v1/operations'

export const gatewayOperationsRoute = app.get('/', async (ctx) => {
  const requestId = newGatewayRequestId()
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] start`,
      payload: { requestId, logStage: 'operations_catalog_start' }
    })

    const operations = toOperationSummaries()

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] ok`,
      payload: {
        requestId,
        logStage: 'operations_catalog_ok',
        operationsCount: operations.length,
        catalogSchemaVersion: CATALOG_SCHEMA_VERSION
      }
    })

    return v1SuccessResponse(
      {
        catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
        operations
      },
      requestId
    )
  } catch (e: unknown) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] internal`,
      payload: {
        requestId,
        error: e instanceof Error ? e.message : String(e)
      }
    })
    return v1ErrorResponse('OPERATIONS_INTERNAL_ERROR', requestId)
  }
})

export default gatewayOperationsRoute
