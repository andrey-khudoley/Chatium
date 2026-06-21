/**
 * Общая цепочка обработки `/v1/{op}` Lava.Top-gateway. Адаптация
 * `p/gateways/lifepay/lib/gateway/handleV1Op.ts` под Lava.Top:
 *   1. Генерация `requestId`, лог `request_init`.
 *   2. Проверка `availability` по каталогу.
 *   3. Для POST — проверка Content-Type и размера тела.
 *   4. Извлечение/валидация заголовка `X-Lava-Apikey` (без логина).
 *   5. Валидация `args` через `argsValidator` из каталога.
 *   6. Вызов прикладного `handler` → `LavaClientResult` + семантика.
 *   7. Классификация транспорта Lava.Top: `rate_limited` (429) → `INVOKE_LAVA_RATE_LIMITED`,
 *      `timeout` / `network_error` / `upstream_status` / `upstream_parse_error`.
 *   8. Запись в `gatewayRequestLog` (всегда) + `gatewayUpstreamLog` (если был вызов) в `finally`.
 *
 * Вспомогательные типы/хелперы вынесены в `handleV1OpHelpers`, ядро — в `handleV1OpRun`
 * (ради лимита размера файла); публичный API файла не изменился.
 */

import * as loggerLib from '../logger.lib'
import { generateRequestId } from './requestId'
import { buildErrorResponse } from './gatewayResponse'
import type { GatewayHttpResponse } from './gatewayResponse'
import {
  LOG_PATH,
  type GatewayLogCtx,
  type V1OpHandler,
  writeGatewayLogs
} from './handleV1OpHelpers'
import { runHandleV1Op } from './handleV1OpRun'

export type { HandlerArgs, HandlerResult, V1OpHandler } from './handleV1OpHelpers'

export async function handleV1Op<A = Record<string, unknown>>(
  ctx: app.Ctx,
  req: app.Req,
  op: string,
  handler: V1OpHandler<A>
): Promise<GatewayHttpResponse> {
  const requestId = generateRequestId()
  const gwLog: GatewayLogCtx = {
    requestId,
    op,
    contour: '',
    method: '',
    requestStart: Date.now(),
    rawArgs: {},
    rawHeadersSafe: {},
    upstream: null
  }

  let response: GatewayHttpResponse | null = null
  try {
    response = await runHandleV1Op(ctx, req, op, handler, requestId, gwLog)
    return response
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] internal_error`,
        payload: { requestId, op, error: String(error) }
      })
    } catch {
      // глотаем — лог упал, ответ всё равно нужен
    }
    response = buildErrorResponse(requestId, 'INVOKE_INTERNAL_ERROR')
    return response
  } finally {
    await writeGatewayLogs(ctx, gwLog, response)
  }
}
