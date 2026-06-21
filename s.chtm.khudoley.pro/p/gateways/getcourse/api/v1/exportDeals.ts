import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeLegacyGcExportGet } from '../../lib/gateway/legacyGcExportGet'

/** GET /v1/exportDeals — контур legacy (export), GET /account/deals. */
export const exportDealsHandler: V1GcHandler = async (_ctx, a) => {
  const gc = await invokeLegacyGcExportGet({
    schoolHostTrimmed: a.schoolHost,
    resolvedPath: a.resolvedPath,
    schoolApiKey: a.schoolApiKey,
    queryArgs: a.restArgs
  })
  return { kind: 'gc_result', gc }
}

export const exportDealsRoute = app.get('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'exportDeals', exportDealsHandler)
)

export default exportDealsRoute
