// @shared-route
import { requireAnyUser } from '@app/auth'
import * as scriptsLib from '../../lib/scripts.lib'

export const uploadScriptRoute = app.post('/', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    const body = req.body as { filename?: string; content?: string }
    const script = await scriptsLib.uploadFromFile(
      ctx,
      body.filename ?? '',
      body.content ?? ''
    )
    const url = scriptsLib.getServeUrl(ctx, script.name, script.type)
    return { success: true, script, url }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})
