import { registerBrokerModule } from '../../../lib/broker/internalApi.lib'
import type { RegisterBrokerModuleRequest } from '../../../lib/broker/types.lib'

export const brokerRegisterModuleFunction = app.function(
  '/broker/modules/register',
  async (
    ctx,
    params: { moduleKey: string; authToken?: string; request: RegisterBrokerModuleRequest },
    callerInfo
  ) => {
    return registerBrokerModule(
      ctx,
      params.moduleKey,
      params.request,
      callerInfo as any,
      params.authToken
    )
  }
)
