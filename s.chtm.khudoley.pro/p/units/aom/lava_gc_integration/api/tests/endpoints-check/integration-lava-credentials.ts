// @shared-route
import { requireAnyUser } from '@app/auth'
import * as integrationCreds from '../../../lib/integration-credentials.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/integration-lava-credentials'

/**
 * GET …/integration-lava-credentials — проверка Lava по `lava_api_key` + `lava_base_url` из Heap (`runLavaCredentialCheckFromSettings`).
 */
export const integrationLavaCredentialsTestRoute = app.get('/', async (ctx, _req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос`,
    payload: {}
  })

  const lava = await integrationCreds.runLavaCredentialCheckFromSettings(ctx)

  if (lava.kind === 'skipped') {
    return {
      success: true,
      skipped: true,
      test: 'integration-lava-credentials',
      message: lava.detail,
      at: Date.now()
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: lava.ok ? 6 : 4,
    message: `[${LOG_PATH}] ${lava.ok ? 'успех' : 'отказ'}`,
    payload: { httpStatus: lava.httpStatus }
  })

  return {
    success: lava.ok,
    skipped: false,
    test: 'integration-lava-credentials',
    message: lava.message,
    error: lava.ok ? undefined : lava.message,
    httpStatus: lava.httpStatus,
    at: Date.now()
  }
})
