/**
 * Устаревший роут /web/panel — оставлен как редирект на главную, потому что
 * содержимое панели теперь рендерится на `/` (см. ../../index.tsx). Это
 * совместимость для закладок и внешних ссылок, существовавших до миграции.
 *
 * Доступ — только Admin. Неадмин и анонимный → редирект на логин.
 */

import { requireAccountRole } from '@app/auth'
import { loginPageRoute } from '../login'
import { getFullUrl, ROUTES } from '../../config/routes'
import * as loggerLib from '../../lib/logger.lib'
import { htmlRedirect } from '../../lib/htmlRedirect'

const LOG_PATH = 'web/panel/index'

export const panelPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] legacy_panel_route`,
    payload: { hasUser: !!ctx.user }
  })

  try {
    requireAccountRole(ctx, 'Admin')
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] redirect_to_login`,
      payload: { error: String(error) }
    })
    const loginUrl = loginPageRoute.url() + `?back=${encodeURIComponent(req.url)}`
    return htmlRedirect(ctx, loginUrl)
  }

  // Админ — перенаправляем на новую главную (которая теперь = панель).
  const indexUrl = getFullUrl(ROUTES.index)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] redirect_to_index`,
    payload: { indexUrl }
  })
  return htmlRedirect(ctx, indexUrl)
})

export default panelPageRoute
