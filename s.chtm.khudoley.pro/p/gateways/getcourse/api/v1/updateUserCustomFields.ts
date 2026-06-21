import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeNewGcApi } from '../../lib/gateway/newGcApiClient'

/** POST /v1/updateUserCustomFields — контур new, POST /user/update-custom-fields. */
export const updateUserCustomFieldsHandler: V1GcHandler = async (_ctx, a) => {
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

export const updateUserCustomFieldsRoute = app.post('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'updateUserCustomFields', updateUserCustomFieldsHandler)
)

export default updateUserCustomFieldsRoute
