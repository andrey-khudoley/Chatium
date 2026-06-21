/**
 * GET /v1/operations — каталог операций gateway. Без проверки `X-Lava-Apikey` (исходящего
 * вызова к Lava.Top нет). Возвращает `data: { catalogSchemaVersion, operations[] }`.
 */

import * as loggerLib from '../../lib/logger.lib'
import { generateRequestId } from '../../lib/gateway/requestId'
import { buildOkResponse, buildErrorResponse } from '../../lib/gateway/gatewayResponse'
import { CATALOG_SCHEMA_VERSION, toOperationSummaries } from '../../lib/gateway/operationsCatalog'

const LOG_PATH = 'api/v1/operations'

export const operationsRoute = app.get('/', async (ctx) => {
  const requestId = generateRequestId()

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] request_init`,
    payload: { requestId }
  })

  try {
    const operations = toOperationSummaries()
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] operations_served`,
      payload: { requestId, operationsCount: operations.length }
    })
    return buildOkResponse(requestId, {
      catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
      operations
    })
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] operations_internal_error`,
      payload: { requestId, error: String(error) }
    })
    return buildErrorResponse(requestId, 'INVOKE_INTERNAL_ERROR')
  }
})

export default operationsRoute
