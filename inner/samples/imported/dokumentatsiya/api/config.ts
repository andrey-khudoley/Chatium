import Config from '../tables/config.table'
import { requireAccountRole } from '@app/auth'

// @shared-route
export const apiConfigGetRoute = app.get('/api/config/:key', async (ctx, req) => {
  const config = await Config.findOneBy(ctx, { key: req.params.key })
  return config || null
})

// @shared-route
export const apiConfigListRoute = app.get('/api/config', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  const configs = await Config.findAll(ctx, { limit: 100 })
  return configs
})

// @shared-route
export const apiConfigSetRoute = app
  .body((s) => ({
    key: s.string(),
    value: s.string(),
    description: s.string().optional()
  }))
  .post('/api/config/set', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const existing = await Config.findOneBy(ctx, { key: req.body.key })

    if (existing) {
      const updated = await Config.update(ctx, {
        id: existing.id,
        value: req.body.value,
        description: req.body.description || existing.description
      })
      return updated
    } else {
      const created = await Config.create(ctx, {
        key: req.body.key,
        value: req.body.value,
        description: req.body.description || ''
      })
      return created
    }
  })

// @shared-route
export const apiConfigDeleteRoute = app.post('/api/config/:id/delete', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await Config.delete(ctx, req.params.id)
  return { success: true }
})

/**
 * Helper function to get config value with default
 */
// @shared
export async function getConfigValue(
  ctx: app.Ctx,
  key: string,
  defaultValue: string
): Promise<string> {
  const config = await Config.findOneBy(ctx, { key })
  return config?.value || defaultValue
}

/**
 * Initialize default config values if they don't exist
 */
export async function initializeDefaultConfig(ctx: app.Ctx) {
  // Check if URL type setting exists
  const urlTypeSetting = await Config.findOneBy(ctx, { key: 'url_type' })
  if (!urlTypeSetting) {
    await Config.create(ctx, {
      key: 'url_type',
      value: 'slug',
      description: 'Use slug-based URLs (slug) or ID-based URLs (id)'
    })
  }
}
