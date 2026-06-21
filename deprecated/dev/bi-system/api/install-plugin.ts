import { installSupportedApp } from '@store/sdk'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

// @shared-route
export const installPluginRoute = app.post('/install-plugin', async (ctx, req) => {
  await applyDebugLevel(ctx, 'install-plugin')

  try {
    Debug.info(ctx, '[install-plugin] запускаем установку gc-mcp-server')
    const result = await installSupportedApp(ctx, 'gc-mcp-server')
    Debug.info(ctx, '[install-plugin] установка завершена')
    return { success: true, result }
  } catch (error: any) {
    Debug.error(ctx, `Plugin installation failed: ${error?.message || error}`)
    return { success: false, error: error.message }
  }
})
