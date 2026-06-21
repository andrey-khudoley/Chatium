import { requireAccountRole } from '@app/auth'
import Settings from '../../tables/settings.table'

export const adminGetcourseSaveRoute = app.post('/api/save', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const {
    accountName,
    apiKey,
    offerCode,
    price,
    utmSourceField,
    utmMediumField,
    utmCampaignField,
    utmContentField,
    utmTermField
  } = req.body

  if (!accountName || accountName.trim().length < 2) {
    return { success: false, error: 'Имя аккаунта должно содержать минимум 2 символа' }
  }

  if (!apiKey || apiKey.trim().length < 5) {
    return { success: false, error: 'API-ключ должен содержать минимум 5 символов' }
  }

  if (!offerCode || offerCode.trim().length < 2) {
    return { success: false, error: 'Код оффера должен содержать минимум 2 символа' }
  }

  try {
    const settings = [
      { key: 'getcourse_account_name', value: accountName.trim().toLowerCase() },
      { key: 'getcourse_api_key', value: apiKey.trim() },
      { key: 'getcourse_offer_code', value: offerCode.trim().toUpperCase() },
      { key: 'getcourse_price', value: price?.toString() || '0' },
      { key: 'getcourse_utm_source_field', value: utmSourceField?.trim() || '' },
      { key: 'getcourse_utm_medium_field', value: utmMediumField?.trim() || '' },
      { key: 'getcourse_utm_campaign_field', value: utmCampaignField?.trim() || '' },
      { key: 'getcourse_utm_content_field', value: utmContentField?.trim() || '' },
      { key: 'getcourse_utm_term_field', value: utmTermField?.trim() || '' }
    ]

    for (const setting of settings) {
      const existing = await Settings.findOneBy(ctx, { key: setting.key })
      if (existing) {
        await Settings.update(ctx, { id: existing.id, value: setting.value })
      } else {
        await Settings.create(ctx, setting)
      }
    }

    return { success: true }
  } catch (error) {
    ctx.account.log('GetCourse settings save error', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: 'Ошибка сохранения настроек' }
  }
})

export const adminGetcourseResetRoute = app.post('/api/reset', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  try {
    const keys = [
      'getcourse_account_name',
      'getcourse_api_key',
      'getcourse_offer_code',
      'getcourse_price',
      'getcourse_utm_source_field',
      'getcourse_utm_medium_field',
      'getcourse_utm_campaign_field',
      'getcourse_utm_content_field',
      'getcourse_utm_term_field'
    ]

    for (const key of keys) {
      const setting = await Settings.findOneBy(ctx, { key })
      if (setting) {
        await Settings.delete(ctx, setting.id)
      }
    }

    return { success: true }
  } catch (error) {
    ctx.account.log('GetCourse settings reset error', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: 'Ошибка сброса настроек' }
  }
})
