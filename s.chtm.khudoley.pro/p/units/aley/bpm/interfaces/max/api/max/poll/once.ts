// @shared-route
import { requireAccountRole } from '@app/auth'
import { runWithExclusiveLock } from '@app/sync'
import * as settingsLib from '../../../lib/settings.lib'
import { getMaxUpdates } from '../../../lib/max/apiClient.lib'
import { acceptMaxUpdate } from '../../../lib/maxRawUpdates.lib'

export const maxPollOnceRoute = app.post('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')
  return runWithExclusiveLock(ctx, 'max:poll:once', async () => {
    const mode = await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_RECEIVE_MODE)
    if (mode !== 'long_polling')
      return { success: false, error: 'MAX receive mode is not long_polling' }
    const token = await settingsLib.getRawSecretSettingString(
      ctx,
      settingsLib.SETTING_KEYS.MAX_BOT_ACCESS_TOKEN
    )
    if (!token) return { success: false, error: 'MAX bot token is not configured' }
    const limit = Number(
      await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_POLLING_LIMIT)
    )
    const timeout = Number(
      await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.MAX_POLLING_TIMEOUT_SEC)
    )
    const marker = (await settingsLib.getSetting(
      ctx,
      settingsLib.SETTING_KEYS.MAX_POLLING_MARKER
    )) as number | null
    const types = (await settingsLib.getSetting(
      ctx,
      settingsLib.SETTING_KEYS.MAX_UPDATE_TYPES
    )) as string[]
    const response = await getMaxUpdates(ctx, { limit, timeout, marker, types })
    let accepted = 0
    let skipped = 0
    for (const update of response.updates ?? []) {
      const result = await acceptMaxUpdate(ctx, {
        source: 'long_polling',
        update,
        marker: response.marker
      })
      if (result.skipped) skipped++
      else accepted++
    }
    if (typeof response.marker === 'number') {
      await settingsLib.setSetting(
        ctx,
        settingsLib.SETTING_KEYS.MAX_POLLING_MARKER,
        response.marker
      )
    }
    return { success: true, accepted, skipped, marker: response.marker ?? marker }
  })
})
