import { fetchDeliveriesCore, type FetchDeliveriesParams } from '../../../lib/broker/pull'

/** Internal fetchDeliveries (§5.9.2). */
export const brokerFetchDeliveriesFn = app.function(
  '/',
  async (ctx, params: FetchDeliveriesParams) => {
    return fetchDeliveriesCore(ctx, params)
  }
)
