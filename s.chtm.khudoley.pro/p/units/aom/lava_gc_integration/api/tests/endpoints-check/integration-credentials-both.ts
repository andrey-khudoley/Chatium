// @shared-route
import { requireAnyUser } from '@app/auth'
import * as integrationCreds from '../../../lib/integration-credentials.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/integration-credentials-both'

/**
 * GET …/integration-credentials-both — обе живые проверки учётных данных из Heap (GetCourse + Lava) за один запрос.
 * Успех: для каждой стороны либо skipped (неполная пара в настройках), либо ran && ok.
 */
export const integrationCredentialsBothTestRoute = app.get('/', async (ctx, _req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос`,
    payload: {}
  })

  const { gc, lava } = await integrationCreds.runIntegrationCredentialChecksFromSettings(ctx)

  const gcPass = gc.kind === 'skipped' || (gc.kind === 'ran' && gc.ok)
  const lavaPass = lava.kind === 'skipped' || (lava.kind === 'ran' && lava.ok)
  const success = gcPass && lavaPass

  await loggerLib.writeServerLog(ctx, {
    severity: success ? 6 : 4,
    message: `[${LOG_PATH}] Итог`,
    payload: {
      gc: gc.kind,
      gcOk: gc.kind === 'ran' ? gc.ok : undefined,
      lava: lava.kind,
      lavaOk: lava.kind === 'ran' ? lava.ok : undefined
    }
  })

  return {
    success,
    test: 'integration-credentials-both',
    gc,
    lava,
    at: Date.now()
  }
})
