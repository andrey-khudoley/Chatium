// @shared-route
import { requireAccountRole } from '@app/auth'
import * as gcApi from '../../../../lib/getcourse-api.client'
import * as loggerLib from '../../../../lib/logger.lib'

const LOG_PATH = 'api/admin/getcourse/verify'

/**
 * POST /api/admin/getcourse/verify — проверка ключа PL API и домена GetCourse (без сохранения в Heap).
 * Body: { gcApiKey: string, gcAccountDomain: string }. Только Admin. Ключ в логах не пишется.
 */
export const getcourseVerifyRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const body = req.body as { gcApiKey?: unknown; gcAccountDomain?: unknown }
  const gcApiKey = typeof body.gcApiKey === 'string' ? body.gcApiKey : ''
  const gcAccountDomain = typeof body.gcAccountDomain === 'string' ? body.gcAccountDomain : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки GC`,
    payload: { hasKey: !!gcApiKey.trim(), hasDomain: !!gcAccountDomain.trim() }
  })

  const result = await gcApi.verifyGcPlApiAccess(ctx, {
    apiKey: gcApiKey,
    domain: gcAccountDomain
  })

  if (result.ok) {
    return { success: true, message: result.message }
  }
  return { success: false, errorCode: 'GC_VERIFY', message: result.message }
})
