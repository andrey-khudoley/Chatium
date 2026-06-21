// @shared-route
import { requireAnyUser } from '@app/auth'
import * as scriptsLib from '../../lib/scripts.lib'
import * as repo from '../../repos/scripts.repo'

export const getScriptRoute = app.get('/', async (ctx, req) => {
  try {
    requireAnyUser(ctx)
    const id = (req.query?.id as string) ?? ''
    if (!id.trim()) {
      return { success: false, error: 'Параметр id обязателен' }
    }
    const script = await repo.findById(ctx, id)
    if (!script) {
      return { success: false, error: 'Скрипт не найден' }
    }
    const url = scriptsLib.getServeUrl(ctx, script.name, script.type)
    return { success: true, script, url }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})
