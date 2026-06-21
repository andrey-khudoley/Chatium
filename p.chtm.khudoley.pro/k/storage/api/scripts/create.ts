// @shared-route
import { requireAnyUser } from '@app/auth'
import * as scriptsLib from '../../lib/scripts.lib'

export const createScriptRoute = app.post('/', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    const body = req.body as { name?: string; description?: string; type?: string; content?: string }
    const script = await scriptsLib.createScript(ctx, {
      name: body.name ?? '',
      description: body.description,
      type: body.type ?? '',
      content: body.content ?? ''
    })
    const url = scriptsLib.getServeUrl(ctx, script.name, script.type)
    return { success: true, script, url }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})
