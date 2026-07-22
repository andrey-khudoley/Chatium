import { registerModuleCore } from '../../lib/broker/register'

/** External-регистрация модуля (§5.2) — HTTP-роут, source='external' проставляется каналом. */
export const brokerRegisterRoute = app
  .post('/')
  .body((s) => ({
    moduleKey: s.string(),
    allowedPublishTypes: s.array(s.string()),
    allowedSubscribeTypes: s.array(s.string()),
    claimTimeoutMs: s.number().optional(),
    displayName: s.string().optional(),
    metadata: s.any().optional()
  }))
  .handle(async (ctx, req) => {
    return registerModuleCore(ctx, req.body, 'external')
  })
