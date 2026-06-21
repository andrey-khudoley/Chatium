// @shared-route
import { requireAccountRole } from '@app/auth'
import {
  registerGetCourseBrokerModule,
  registerGetCourseBrokerSubscription
} from '../lib/coreBrokerClient.lib'

export const getCourseInterfaceRegisterRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  const moduleResult = await registerGetCourseBrokerModule(ctx)
  const subscriptionResult = await registerGetCourseBrokerSubscription(ctx)
  return {
    success: moduleResult.success && subscriptionResult.success,
    moduleResult,
    subscriptionResult
  }
})
