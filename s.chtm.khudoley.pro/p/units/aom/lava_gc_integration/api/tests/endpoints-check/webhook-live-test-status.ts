import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as appPublicUrl from '../../../lib/app-public-url.lib'
import { getWebhookLiveTestState } from '../../../lib/webhook-live-test.lib'

const LOG_PATH = 'api/tests/endpoints-check/webhook-live-test-status'

/**
 * GET …/webhook-live-test-status — состояние лайв-проверки webhook и абсолютный URL эндпоинта POST для Lava.
 */
export const webhookLiveTestStatusRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const state = await getWebhookLiveTestState(ctx)
  const webhookUrl = appPublicUrl.getAbsoluteUrlForAppPath(ctx, 'api/integrations/lava/webhook')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] status`,
    payload: {
      hasState: Boolean(state),
      status: state?.status,
      webhookUrlEmpty: !webhookUrl
    }
  })

  return {
    success: true,
    test: 'webhook-live-test-status',
    webhookUrl: webhookUrl || null,
    state
  }
})
