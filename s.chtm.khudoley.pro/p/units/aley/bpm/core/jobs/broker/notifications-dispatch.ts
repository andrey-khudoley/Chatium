import { dispatchBrokerNotifications } from '../../lib/broker/notify.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'jobs/broker/notifications-dispatch'

export const brokerNotificationsDispatchJob = app.job(
  '/broker/notifications-dispatch',
  async (ctx, _params: {}) => {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Dispatch broker notifications`,
      payload: {}
    })
    return dispatchBrokerNotifications(ctx)
  }
)
