import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeNewGcApi } from '../../lib/gateway/newGcApiClient'

/** POST /v1/addUserGroups — контур new, POST /user/add-groups. */
export const addUserGroupsHandler: V1GcHandler = async (_ctx, a) => {
  const gc = await invokeNewGcApi({
    schoolHostTrimmed: a.schoolHost,
    resolvedPath: a.resolvedPath,
    httpMethod: 'POST',
    developerKey: a.devKey,
    schoolApiKey: a.schoolApiKey,
    args: a.restArgs
  })
  return { kind: 'gc_result', gc }
}

export const addUserGroupsRoute = app.post('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'addUserGroups', addUserGroupsHandler)
)

export default addUserGroupsRoute
