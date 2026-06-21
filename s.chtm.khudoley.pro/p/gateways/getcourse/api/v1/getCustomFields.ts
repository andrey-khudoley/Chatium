import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeLegacyGcExportGet } from '../../lib/gateway/legacyGcExportGet'

/** GET /v1/getCustomFields — контур legacy (export), GET /account/fields. */
export const getCustomFieldsHandler: V1GcHandler = async (_ctx, a) => {
  const gc = await invokeLegacyGcExportGet({
    schoolHostTrimmed: a.schoolHost,
    resolvedPath: a.resolvedPath,
    schoolApiKey: a.schoolApiKey,
    queryArgs: a.restArgs
  })
  return { kind: 'gc_result', gc }
}

export const getCustomFieldsRoute = app.get('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'getCustomFields', getCustomFieldsHandler)
)

export default getCustomFieldsRoute
