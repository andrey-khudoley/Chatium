// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../../lib/settings.lib'

const OPERATIONAL_KEYS = new Set<string>([
  settingsLib.SETTING_KEYS.CORE_BROKER_PUBLISH_ENABLED,
  settingsLib.SETTING_KEYS.CORE_BROKER_MODULE_KEY,
  settingsLib.SETTING_KEYS.MAX_RECEIVE_MODE,
  settingsLib.SETTING_KEYS.MAX_UPDATE_TYPES,
  settingsLib.SETTING_KEYS.MAX_POLLING_LIMIT,
  settingsLib.SETTING_KEYS.MAX_POLLING_TIMEOUT_SEC,
  settingsLib.SETTING_KEYS.MAX_POLLING_INTERVAL_SEC,
  settingsLib.SETTING_KEYS.MAX_POLLING_MARKER,
  settingsLib.SETTING_KEYS.MAX_RAW_DEDUP_POLICY,
  settingsLib.SETTING_KEYS.MAX_CHAT_DISCOVERY_ENABLED,
  settingsLib.SETTING_KEYS.MAX_HISTORY_REFRESH_ENABLED,
  settingsLib.SETTING_KEYS.MAX_HISTORY_BATCH_SIZE,
  settingsLib.SETTING_KEYS.MAX_HISTORY_DELETE_BATCH_SIZE,
  settingsLib.SETTING_KEYS.MAX_HISTORY_JOB_BUDGET_MS,
  settingsLib.SETTING_KEYS.MAX_HISTORY_MAX_BATCHES_PER_JOB,
  settingsLib.SETTING_KEYS.MAX_MINIAPPS_ENABLED,
  settingsLib.SETTING_KEYS.MAX_MINIAPP_DEFAULT_PAGE,
  settingsLib.SETTING_KEYS.MAX_MINIAPP_INIT_DATA_TTL_SEC
])

export const maxControlSaveRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const body = (req.body ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(body)) {
    if (OPERATIONAL_KEYS.has(key)) await settingsLib.setSetting(ctx, key, value)
  }
  return { success: true, settings: await settingsLib.getAllSettings(ctx) }
})
