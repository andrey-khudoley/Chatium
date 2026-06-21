/**
 * Роут админки логов: редирект на главную с открытием профиля → Настройки (админ).
 * Логирование и метрики управляются в компоненте AdminSettings на вкладке «Настройки» профиля.
 * Доступ только для роли Admin; при отсутствии прав — 403.
 */
import { requireAccountRole } from '@app/auth'
import { withProjectRoot, ROUTES } from '../../config/routes'

export const webAdminLogsRoute = app.get('/', async (ctx) => {
  try {
    requireAccountRole(ctx, 'Admin')
  } catch {
    ctx.resp.status(403)
    return ctx.resp.json({ error: 'Доступ запрещён. Требуется роль Admin.' })
  }
  const indexUrl = withProjectRoot(ROUTES.index)
  return ctx.resp.redirect(`${indexUrl}#profile?tab=admin`)
})
