import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeNewGcApi } from '../../lib/gateway/newGcApiClient'

/** GET /v1/getDealCustomFields — контур new, GET /deal/get-custom-fields. */
export const getDealCustomFieldsHandler: V1GcHandler = async (_ctx, a) => {
  const gc = await invokeNewGcApi({
    schoolHostTrimmed: a.schoolHost,
    resolvedPath: a.resolvedPath,
    httpMethod: 'GET',
    developerKey: a.devKey,
    schoolApiKey: a.schoolApiKey,
    args: a.restArgs
  })
  return { kind: 'gc_result', gc }
}

export const getDealCustomFieldsRoute = app.get('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'getDealCustomFields', getDealCustomFieldsHandler)
)

export default getDealCustomFieldsRoute
