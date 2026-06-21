import { requireAccountRole } from '@app/auth'
import AppSettings from '../tables/app-settings.table'

export interface AppSettingDto {
  id: string
  key: string
  value: string | null
  category: string | null
  description: string | null
}

export const apiAppSettingsListRoute = app.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  
  const settings = await AppSettings.findAll(ctx, {
    order: [{ category: 'asc' }, { key: 'asc' }]
  })
  
  return settings.map(s => ({
    id: s.id,
    key: s.key,
    value: s.value,
    category: s.category,
    description: s.description,
  }))
})

export const apiAppSettingsGetRoute = app.get('/get/:key', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  
  const setting = await AppSettings.findOneBy(ctx, { key: req.params.key })
  
  if (!setting) {
    return null
  }
  
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    category: setting.category,
    description: setting.description,
  }
})

export const apiAppSettingsUpdateRoute = app.post('/update', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  
  const { key, value, category, description } = req.body
  
  if (!key) {
    throw new Error('Key is required')
  }
  
  const existing = await AppSettings.findOneBy(ctx, { key })
  
  let setting
  if (existing) {
    setting = await AppSettings.update(ctx, {
      id: existing.id,
      value: value ?? existing.value,
      category: category ?? existing.category,
      description: description ?? existing.description,
    })
  } else {
    setting = await AppSettings.create(ctx, {
      key,
      value: value ?? '',
      category: category ?? 'general',
      description: description ?? '',
    })
  }
  
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    category: setting.category,
    description: setting.description,
  }
})

export const apiAppSettingsDeleteRoute = app.post('/delete', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  
  const { key } = req.body
  
  if (!key) {
    throw new Error('Key is required')
  }
  
  const existing = await AppSettings.findOneBy(ctx, { key })
  
  if (existing) {
    await AppSettings.delete(ctx, existing.id)
  }
  
  return { success: true }
})

// Helper function to get setting value (for internal use)
export async function getAppSetting(ctx: any, key: string): Promise<string | null> {
  const setting = await AppSettings.findOneBy(ctx, { key })
  return setting?.value ?? null
}

// Уведомления теперь работают только через WebSocket и Inbox API
// Push-уведомления через FCM/Web Push удалены
