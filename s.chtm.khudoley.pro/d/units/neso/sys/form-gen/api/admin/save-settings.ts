import { requireAccountRole } from '@app/auth'
import { saveGcSettings } from '../../lib/settings/gcSettings'

/**
 * Сохранение настроек подключения GC (§5.3 спеки, волна 1 — 3 поля). Вызывается
 * из AdminPage.vue через fetch (same-origin, дельта 5 плана) — не `.run()`,
 * поэтому `// @shared-route` не нужен.
 */
export const saveSettingsRoute = app
  .post('/')
  .body((s) => ({
    schoolUrl: s.string(),
    schoolKey: s.string(),
    developerKey: s.string()
  }))
  .handle(async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    await saveGcSettings(ctx, {
      schoolUrl: req.body.schoolUrl,
      schoolKey: req.body.schoolKey,
      developerKey: req.body.developerKey
    })

    // Значения настроек (URL/ключи школы) НЕ логируются — только факт сохранения.
    ctx.account.log('form-gen: settings.saved', { level: 'info' })

    return { ok: true }
  })
