// @shared-route
import { requireAccountRole } from '@app/auth'
import { getPluginSettingsPublicDto } from '../../lib/plugins/pluginSettings.lib'
import type { PluginSettingsGetResponse } from '../../shared/pluginManifestTypes'

export const pluginSettingsGetRoute = app.get(
  '/',
  async (ctx): Promise<PluginSettingsGetResponse> => {
    requireAccountRole(ctx, 'Admin')

    return {
      plugins: await getPluginSettingsPublicDto(ctx)
    }
  }
)
