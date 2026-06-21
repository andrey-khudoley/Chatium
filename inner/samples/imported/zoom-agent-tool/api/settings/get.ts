import ZoomSettingsTable from '../../tables/zoom_settings.table'

export const apiSettingsGetRoute = app.get('/', async (ctx, req) => {
  const settings = await ZoomSettingsTable.findAll(ctx, { limit: 1 })

  if (settings.length === 0) {
    return {
      account_id: '',
      client_id: '',
      client_secret: '',
      secret_token: '',
      default_topic: 'Zoom-встреча',
      default_agenda: 'ZOOM',
      default_auto_recording: 'cloud',
      default_timezone: 'Europe/Moscow'
    }
  }

  const s = settings[0]!
  return {
    account_id: s.account_id || '',
    client_id: s.client_id || '',
    client_secret: s.client_secret || '',
    secret_token: s.secret_token || '',
    default_topic: s.default_topic || 'Zoom-встреча',
    default_agenda: s.default_agenda || 'ZOOM',
    default_auto_recording: s.default_auto_recording || 'cloud',
    default_timezone: s.default_timezone || 'Europe/Moscow'
  }
})
