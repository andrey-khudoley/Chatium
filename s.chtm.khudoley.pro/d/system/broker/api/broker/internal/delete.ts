import { deleteModuleCore, type DeleteModuleParams } from '../../../lib/broker/delete-module'

/** Internal-удаление регистрации модуля (§5.5). */
export const brokerDeleteFn = app.function('/', async (ctx, params: DeleteModuleParams) => {
  return deleteModuleCore(ctx, params)
})
