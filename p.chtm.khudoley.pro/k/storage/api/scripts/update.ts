// @shared-route
import { requireAnyUser } from '@app/auth'
import * as scriptsLib from '../../lib/scripts.lib'

export const updateScriptRoute = app.post('/', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    const body = req.body as { id?: string; name?: string; description?: string; type?: string; content?: string }
    const updated = await scriptsLib.updateScript(ctx, {
      id: body.id ?? '',
      name: body.name,
      description: body.description,
      type: body.type,
      content: body.content
    })
    const url = scriptsLib.getServeUrl(ctx, updated.name, updated.type)
    return { success: true, script: updated, url }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})
