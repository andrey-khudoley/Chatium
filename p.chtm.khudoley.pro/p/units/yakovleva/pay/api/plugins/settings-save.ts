// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { savePluginSetting } from '../../lib/plugins/pluginSettings.lib'
import type {
  PluginSettingsSaveRequest,
  PluginSettingsSaveResponse
} from '../../shared/pluginManifestTypes'

const LOG_PATH = 'api/plugins/settings-save'

export const pluginSettingsSaveRoute = app.post(
  '/',
  async (ctx, req): Promise<PluginSettingsSaveResponse> => {
    requireAccountRole(ctx, 'Admin')

    const body = (req.body ?? {}) as PluginSettingsSaveRequest
    const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
    const key = typeof body.key === 'string' ? body.key : ''

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] entry`,
      payload: { pluginId, key, valueType: typeof body.value }
    })

    try {
      const plugin = await savePluginSetting(ctx, body.pluginId, body.key, body.value)

      return {
        success: true,
        plugin
      }
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] rejected`,
        payload: { pluginId, key, error: String(e) }
      })
      return {
        success: false,
        error: String(e)
      }
    }
  }
)
