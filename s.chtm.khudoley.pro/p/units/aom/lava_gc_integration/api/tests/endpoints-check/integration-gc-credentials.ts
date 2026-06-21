// @shared-route
import { requireAnyUser } from '@app/auth'
import * as integrationCreds from '../../../lib/integration-credentials.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/integration-gc-credentials'

/**
 * GET …/integration-gc-credentials — проверка GetCourse PL API по `gc_api_key` + `gc_account_domain` из Heap (`runGcCredentialCheckFromSettings`).
 */
export const integrationGcCredentialsTestRoute = app.get('/', async (ctx, _req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос`,
    payload: {}
  })

  const gc = await integrationCreds.runGcCredentialCheckFromSettings(ctx)

  if (gc.kind === 'skipped') {
    return {
      success: true,
      skipped: true,
      test: 'integration-gc-credentials',
      message: gc.detail,
      at: Date.now()
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: gc.ok ? 6 : 4,
    message: `[${LOG_PATH}] ${gc.ok ? 'успех' : 'отказ'}`,
    payload: {}
  })

  return {
    success: gc.ok,
    skipped: false,
    test: 'integration-gc-credentials',
    message: gc.message,
    error: gc.ok ? undefined : gc.message,
    at: Date.now()
  }
})
