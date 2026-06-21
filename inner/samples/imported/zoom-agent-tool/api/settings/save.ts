import ZoomSettingsTable from '../../tables/zoom_settings.table'

export const apiSettingsSaveRoute = app
  .post('/')
  .body((s) => ({
    account_id: s.string(),
    client_id: s.string(),
    client_secret: s.string(),
    secret_token: s.string().optional(),
    default_topic: s.string().optional(),
    default_agenda: s.string().optional(),
    default_auto_recording: s.enum(['none', 'local', 'cloud']).optional(),
    default_timezone: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    const existing = await ZoomSettingsTable.findAll(ctx, { limit: 1 })

    const data = {
      account_id: req.body.account_id,
      client_id: req.body.client_id,
      client_secret: req.body.client_secret,
      secret_token: req.body.secret_token || '',
      default_topic: req.body.default_topic || 'Zoom-встреча',
      default_agenda: req.body.default_agenda || 'ZOOM',
      default_auto_recording: req.body.default_auto_recording || 'cloud',
      default_timezone: req.body.default_timezone || 'Europe/Moscow'
    }

    if (existing.length > 0) {
      const updated = await ZoomSettingsTable.update(ctx, {
        id: existing[0]!.id,
        ...data
      })
      return { success: true, settings: updated }
    } else {
      const created = await ZoomSettingsTable.create(ctx, data)
      return { success: true, settings: created }
    }
  })
