import { registerModuleCore, type RegisterModuleParams } from '../../../lib/broker/register'

/** Internal-регистрация модуля (§5.2) — вызов через app.function, source='internal'. */
export const brokerRegisterFn = app.function('/', async (ctx, params: RegisterModuleParams) => {
  return registerModuleCore(ctx, params, 'internal')
})
