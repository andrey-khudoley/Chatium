import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeLegacyGcImportPost } from '../../lib/gateway/legacyGcImportClient'

/** POST /v1/addUser — контур legacy (import), POST /users, action=add. */
export const addUserHandler: V1GcHandler = async (_ctx, a) => {
  const paramsPayload = (a.args as { params?: Record<string, unknown> }).params ?? {}
  const gc = await invokeLegacyGcImportPost({
    schoolHostTrimmed: a.schoolHost,
    resolvedPath: a.resolvedPath,
    schoolApiKey: a.schoolApiKey,
    legacyImportAction: 'add',
    paramsPayload
  })
  return { kind: 'gc_result', gc }
}

export const addUserRoute = app.post('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'addUser', addUserHandler)
)

export default addUserRoute
