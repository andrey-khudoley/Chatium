import { getBrokerDiagnostics } from '../../lib/broker/internalApi.lib'

export const brokerDiagnosticsFunction = app.function(
  '/broker/diagnostics',
  async (ctx, params: Parameters<typeof getBrokerDiagnostics>[1] = {}) => {
    return getBrokerDiagnostics(ctx, params)
  }
)
