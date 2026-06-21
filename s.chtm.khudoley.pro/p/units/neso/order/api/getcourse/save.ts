// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/getcourse/save'

/**
 * POST /api/getcourse/save — пакетное сохранение настроек GetCourse.
 * Body: { domain, apiKey, offerCode, price, utmSourceField, utmMediumField, utmCampaignField, utmContentField, utmTermField }
 * Только Admin.
 */
export const saveGcSettingsRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Получен запрос на сохранение настроек GetCourse`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as Record<string, unknown>

  const domain = typeof body.domain === 'string' ? body.domain.trim() : ''
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const offerCode = typeof body.offerCode === 'string' ? body.offerCode.trim() : ''
  const price = typeof body.price === 'string' ? body.price.trim() : String(body.price ?? '0')
  const utmSourceField = typeof body.utmSourceField === 'string' ? body.utmSourceField.trim() : ''
  const utmMediumField = typeof body.utmMediumField === 'string' ? body.utmMediumField.trim() : ''
  const utmCampaignField =
    typeof body.utmCampaignField === 'string' ? body.utmCampaignField.trim() : ''
  const utmContentField =
    typeof body.utmContentField === 'string' ? body.utmContentField.trim() : ''
  const utmTermField = typeof body.utmTermField === 'string' ? body.utmTermField.trim() : ''

  if (!domain) {
    return { success: false, error: 'Укажите домен аккаунта GetCourse.' }
  }
  if (!apiKey) {
    return { success: false, error: 'Укажите API-ключ GetCourse.' }
  }
  if (!offerCode) {
    return { success: false, error: 'Укажите код оффера GetCourse.' }
  }

  try {
    const entries: Array<{ key: string; value: string }> = [
      { key: settingsLib.SETTING_KEYS.GC_ACCOUNT_DOMAIN, value: domain },
      { key: settingsLib.SETTING_KEYS.GC_API_KEY, value: apiKey },
      { key: settingsLib.SETTING_KEYS.GC_OFFER_CODE, value: offerCode },
      { key: settingsLib.SETTING_KEYS.GC_PRICE, value: price },
      { key: settingsLib.SETTING_KEYS.GC_UTM_SOURCE_FIELD, value: utmSourceField },
      { key: settingsLib.SETTING_KEYS.GC_UTM_MEDIUM_FIELD, value: utmMediumField },
      { key: settingsLib.SETTING_KEYS.GC_UTM_CAMPAIGN_FIELD, value: utmCampaignField },
      { key: settingsLib.SETTING_KEYS.GC_UTM_CONTENT_FIELD, value: utmContentField },
      { key: settingsLib.SETTING_KEYS.GC_UTM_TERM_FIELD, value: utmTermField }
    ]

    for (const entry of entries) {
      await settingsLib.setSetting(ctx, entry.key, entry.value)
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Настройки GetCourse сохранены`,
      payload: { domain, offerCode, hasPrice: price !== '0' }
    })

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка сохранения настроек GetCourse`,
      payload: { error: msg }
    })
    return { success: false, error: `Ошибка сохранения: ${msg}` }
  }
})
