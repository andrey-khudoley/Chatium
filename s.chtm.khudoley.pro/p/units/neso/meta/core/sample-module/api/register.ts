// @shared-route
import { requireAccountRole } from '@app/auth'
import {
  registerSampleBrokerModule,
  registerSampleBrokerSubscription
} from '../lib/coreBrokerClient.lib'

export const sampleModuleRegisterRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  const moduleResult = await registerSampleBrokerModule(ctx)
  const subscriptionResult = await registerSampleBrokerSubscription(ctx)
  return {
    success: moduleResult.success && subscriptionResult.success,
    moduleResult,
    subscriptionResult
  }
})
