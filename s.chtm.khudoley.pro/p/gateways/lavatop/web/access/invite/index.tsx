/**
 * GET /web/access/invite?token=… — страница приглашения (внутренняя система доступов).
 *
 * Защита — ТОЛЬКО `requireRealUser` (внутренняя проверка не применяется: иначе
 * пользователь без доступа не сможет его получить). Сам переход по ссылке инвайт
 * НЕ расходует — расход только при `POST /api/access/consume-invite` («Подтвердить»).
 */

import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import InviteAcceptPage from '../../../pages/InviteAcceptPage.vue'
import { getInviteByToken, classifyInvite } from '../../../lib/access/invites'
import * as panelAccessRepo from '../../../repos/panelAccess.repo'
import { getFullUrl, ROUTE_PATHS } from '../../../config/routes'
import { AccessMessagePage } from '../../../shared/accessPages'
import * as loggerLib from '../../../lib/logger.lib'
import { htmlRedirect } from '../../../lib/htmlRedirect'

const LOG_PATH = 'web/access/invite'

export const inviteAcceptPageRoute = app.html('/', async (ctx, req) => {
  const query = (req.query as Record<string, unknown> | undefined) ?? {}
  const token = typeof query.token === 'string' ? query.token.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { hasToken: !!token, hasUser: !!ctx.user }
  })

  if (!token) {
    ctx.resp.setStatusCode(400)
    return AccessMessagePage({
      title: 'Некорректная ссылка',
      heading: 'Некорректная ссылка',
      paragraphs: [
        'В ссылке отсутствует пригласительный токен. Запросите новую ссылку у администратора.'
      ]
    })
  }

  // Анонимный/не реальный пользователь → на вход. Токен НЕ расходуется.
  let user
  try {
    user = requireRealUser(ctx)
  } catch {
    const back = encodeURIComponent(req.url)
    return htmlRedirect(ctx, `/s/auth/signin?back=${back}`)
  }

  // Read-only проверка инвайта (без потребления).
  const invite = await getInviteByToken(ctx, token)
  const state = classifyInvite(invite, Date.now())

  if (state === 'used') {
    ctx.resp.setStatusCode(410)
    return AccessMessagePage({
      title: 'Ссылка уже использована',
      heading: 'Ссылка уже была использована',
      paragraphs: [
        'Эта пригласительная ссылка уже была активирована. Запросите новую у администратора.'
      ]
    })
  }

  if (state !== 'valid') {
    // unknown / revoked / expired
    ctx.resp.setStatusCode(410)
    return AccessMessagePage({
      title: 'Ссылка недействительна',
      heading: 'Ссылка недействительна',
      paragraphs: [
        'Эта пригласительная ссылка недействительна или истёк её срок действия. Запросите новую у администратора.'
      ]
    })
  }

  const isAdmin = user.is('Admin')
  const activeGrant = await panelAccessRepo.findActiveByUserId(ctx, user.id)
  const userAlreadyHasAccess = isAdmin || activeGrant !== null

  const consumeApiUrl = getFullUrl('/api/access/consume-invite')
  const panelHomeUrl = getFullUrl(ROUTE_PATHS.index)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] render`,
    payload: { userAlreadyHasAccess }
  })

  return (
    <html>
      <head>
        <title>Доступ к панели Lava.Top Gateway</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html, body { margin: 0; padding: 0; background: #0a0a0a; }
          body { min-height: 100vh; }
        `}</style>
      </head>
      <body>
        <InviteAcceptPage
          token={token}
          userDisplayName={user.displayName}
          userEmail={user.confirmedEmail ?? ''}
          inviteNote={invite?.note ?? ''}
          expiresAt={invite?.expiresAt ?? 0}
          consumeApiUrl={consumeApiUrl}
          panelHomeUrl={panelHomeUrl}
          userAlreadyHasAccess={userAlreadyHasAccess}
        />
      </body>
    </html>
  )
})

export default inviteAcceptPageRoute
