// @shared-route
import { requireAccountRole } from '@app/auth'
import { registerCoreBrokerModule } from '../../lib/broker/coreBrokerClient.lib'

export const getcourseModuleRegisterRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  const moduleResult = await registerCoreBrokerModule(ctx)
  return {
    success: moduleResult.success,
    moduleResult
  }
})
