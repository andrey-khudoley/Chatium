// @shared
/**
 * GET /web/forbidden — страница 403 (ADR 0003, implementation-plan §1.11.6).
 *
 * Защита — только `requireRealUser` (без requireInternalAccess, иначе цикл редиректов).
 *   - Анонимный → на вход.
 *   - Admin или активный грант → редирект на «/» (нет смысла показывать 403).
 *   - Иначе → страница 403 с предложением попросить ссылку у администратора.
 */

import { requireRealUser } from '@app/auth'
import * as panelAccessRepo from '../../repos/panelAccess.repo'
import { getFullUrl, ROUTE_PATHS } from '../../config/routes'
import { AccessMessagePage } from '../../shared/accessPages'
import * as loggerLib from '../../lib/logger.lib'
import { htmlRedirect } from '../../lib/htmlRedirect'

const LOG_PATH = 'web/forbidden'

export const forbiddenPageRoute = app.html('/', async (ctx, req) => {
  let user
  try {
    user = requireRealUser(ctx)
  } catch {
    const back = encodeURIComponent(getFullUrl(ROUTE_PATHS.index))
    return htmlRedirect(ctx, `/s/auth/signin?back=${back}`)
  }

  const indexUrl = getFullUrl(ROUTE_PATHS.index)

  // У кого есть доступ — на главную (403 им не показываем).
  if (user.is('Admin')) {
    return htmlRedirect(ctx, indexUrl)
  }
  const activeGrant = await panelAccessRepo.findActiveByUserId(ctx, user.id)
  if (activeGrant) {
    return htmlRedirect(ctx, indexUrl)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] render 403`,
    payload: { userId: user.id }
  })

  const email = user.confirmedEmail ?? ''
  const account = email ? `${user.displayName} (${email})` : user.displayName

  ctx.resp.setStatusCode(403)
  return AccessMessagePage({
    title: 'Нет доступа',
    heading: 'Нет доступа к панели',
    paragraphs: [
      'У вас нет доступа к панели управления интеграцией LifePay.',
      `Текущий аккаунт: ${account}.`,
      'Попросите администратора создать для вас пригласительную ссылку.'
    ],
    actions: [
      { label: 'Выйти и войти под другим аккаунтом', postUrl: '/s/auth/sign-out', primary: true }
    ]
  })
})

export default forbiddenPageRoute
