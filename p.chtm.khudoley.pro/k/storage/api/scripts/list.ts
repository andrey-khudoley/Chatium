// @shared-route
import { requireAnyUser } from '@app/auth'
import * as scriptsLib from '../../lib/scripts.lib'

export const listScriptsRoute = app.get('/', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    const scripts = await scriptsLib.listScripts(ctx)
    return { success: true, scripts }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})
