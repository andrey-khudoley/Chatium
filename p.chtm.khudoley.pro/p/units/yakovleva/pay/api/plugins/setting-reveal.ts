// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'
import { revealPluginSetting } from '../../lib/plugins/pluginSettings.lib'
import type {
  PluginSettingRevealRequest,
  PluginSettingRevealResponse
} from '../../shared/pluginManifestTypes'

const LOG_PATH = 'api/plugins/setting-reveal'

export const pluginSettingRevealRoute = app.post(
  '/',
  async (ctx, req): Promise<PluginSettingRevealResponse> => {
    requireAccountRole(ctx, 'Admin')

    const body = (req.body ?? {}) as PluginSettingRevealRequest
    const pluginId = typeof body.pluginId === 'string' ? body.pluginId : ''
    const key = typeof body.key === 'string' ? body.key : ''

    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_PATH}] entry`,
      payload: { pluginId, key }
    })

    try {
      const revealed = await revealPluginSetting(ctx, body.pluginId, body.key)
      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] revealed`,
        payload: { pluginId, key, hasValue: !!revealed.value }
      })
      return {
        success: true,
        key: revealed.key,
        value: revealed.value
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
