import { fetchDeliveriesCore } from '../../../lib/broker/pull'

/** External fetchDeliveries (§5.9.2) — poll+claim атомарно, батч. */
export const brokerFetchDeliveriesRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string(),
    limit: s.number().optional()
  }))
  .handle(async (ctx, req) => {
    return fetchDeliveriesCore(ctx, req.body)
  })
