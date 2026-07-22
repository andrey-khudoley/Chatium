import { publishEventCore } from '../../lib/broker/publish'

/** External-публикация события (§5.8) — токен обязателен. */
export const brokerPublishRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    authToken: s.string(),
    eventType: s.string(),
    payload: s.any().optional(),
    schemaVersion: s.number().optional(),
    idempotencyKey: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    return publishEventCore(ctx, req.body)
  })
