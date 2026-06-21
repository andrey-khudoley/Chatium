import { handleV1Op, type V1GcHandler } from '../../lib/gateway/handleV1Op'
import { invokeLegacyGcExportGet } from '../../lib/gateway/legacyGcExportGet'

/** GET /v1/exportUsers — контур legacy (export), GET /account/users. */
export const exportUsersHandler: V1GcHandler = async (_ctx, a) => {
  const gc = await invokeLegacyGcExportGet({
    schoolHostTrimmed: a.schoolHost,
    resolvedPath: a.resolvedPath,
    schoolApiKey: a.schoolApiKey,
    queryArgs: a.restArgs
  })
  return { kind: 'gc_result', gc }
}

export const exportUsersRoute = app.get('/', async (ctx, req) =>
  handleV1Op(ctx, req, 'exportUsers', exportUsersHandler)
)

export default exportUsersRoute
