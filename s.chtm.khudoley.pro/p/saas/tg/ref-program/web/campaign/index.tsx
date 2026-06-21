// @shared
import { jsx } from '@app/html-jsx'
import { requireRealUser } from '@app/auth'
import * as campaignRepo from '../../lib/repo/campaignRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import CampaignPageShell from '../../pages/CampaignPageShell.vue'
import { getPreloaderStyles, getPreloaderScript } from '../../shared/preloader'
import { getLogLevelForPage, getLogLevelScript } from '../../shared/logLevel'
import * as loggerLib from '../../lib/logger.lib'
import { getFullUrl, ROUTES, getCampaignPageUrl } from '../../config/routes'
import { getPageTitle } from '../../config/project'
import * as settingsLib from '../../lib/settings.lib'
import { customScrollbarStyles, geometricBgStyles, appLayoutOverGridStyles } from '../../styles'
import { loginPageRoute } from '../login'

const LOG_PATH = 'web/campaign/index'

function getCampaignIdFromRequest(url: string): string | null {
  if (!url || !url.includes('campaignId=')) return null
  try {
    const parsed = url.includes('://') ? new URL(url) : new URL(url, 'https://_')
    const id = parsed.searchParams.get('campaignId')
    return id ? id.trim() || null : null
  } catch {
    const q = url.includes('?') ? url.split('?')[1] : ''
    const match = /(?:^|&)campaignId=([^&]*)/.exec(q)
    return match ? decodeURIComponent(match[1]).trim() || null : null
  }
}

const campaignPageStyles = `
  html { margin: 0; padding: 0; background: #0a0a0a; }
  body { margin: 0; padding: 0; background: #0a0a0a; position: relative; min-height: 100vh; overflow: hidden; }
  body.boot-complete { overflow-x: hidden; overflow-y: auto; }
  :root {
    --color-bg: #0a0a0a; --color-bg-secondary: #141414; --color-bg-tertiary: #1a1a1a;
    --color-text: #e8e8e8; --color-text-secondary: #a0a0a0; --color-text-tertiary: #707070;
    --color-border: #2a2a2a; --color-accent: #d3234b; --color-accent-hover: #e6395f;
    --color-accent-light: rgba(211, 35, 75, 0.15);
  }
  ::selection { background: #e0335a; color: #fff; }
  ${geometricBgStyles}
  ${appLayoutOverGridStyles}
  ${getPreloaderStyles()}
`

export const campaignPageRoute = app.html('/', async (ctx, req) => {
  const campaignId = getCampaignIdFromRequest(req.url || '')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос страницы кампании`,
    payload: { campaignId: !!campaignId, url: req.url }
  })

  let user
  try {
    user = requireRealUser(ctx)
  } catch (error: unknown) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Редирект на логин`,
      payload: { error: String(error) }
    })
    const loginUrl = loginPageRoute.url() + `?back=${encodeURIComponent(req.url)}`
    return (
      <html>
        <head>
          <title>Вход</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta charset="UTF-8" />
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
          <script>{`window.location.href = '${loginUrl}'`}</script>
          <style>{campaignPageStyles}</style>
        </head>
        <body>
          <p>Перенаправление на вход...</p>
        </body>
      </html>
    )
  }

  if (!campaignId) {
    return (
      <html>
        <head>
          <title>Кампания не найдена</title>
          <meta charset="UTF-8" />
          <style>{campaignPageStyles}</style>
        </head>
        <body>
          <p>Кампания не указана.</p>
          <a href={getFullUrl(ROUTES.index)}>На главную</a>
        </body>
      </html>
    )
  }

  const campaign = await campaignRepo.getCampaignById(ctx, campaignId)
  if (!campaign || campaign.isDeleted === true) {
    return (
      <html>
        <head>
          <title>Кампания не найдена</title>
          <meta charset="UTF-8" />
          <style>{campaignPageStyles}</style>
        </head>
        <body>
          <p>Кампания не найдена или удалена.</p>
          <a href={getFullUrl(ROUTES.index)}>На главную</a>
        </body>
      </html>
    )
  }

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
  if (!access.hasAccess) {
    return (
      <html>
        <head>
          <title>Нет доступа</title>
          <meta charset="UTF-8" />
          <style>{campaignPageStyles}</style>
        </head>
        <body>
          <p>У вас нет доступа к этой кампании.</p>
          <a href={getFullUrl(ROUTES.index)}>На главную</a>
        </body>
      </html>
    )
  }

  const indexUrl = getFullUrl(ROUTES.index)
  const profileUrl = getFullUrl(ROUTES.profile)
  const loginUrl = getFullUrl(ROUTES.login)
  const campaignUrl = getCampaignPageUrl(campaignId)
  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)

  return (
    <html>
      <head>
        <title>{getPageTitle(campaign.title || 'Кампания', projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <script src="/s/metric/clarity.js"></script>
        <style>{campaignPageStyles}</style>
        <style>{customScrollbarStyles}</style>
        <script>{getPreloaderScript()}</script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <CampaignPageShell
          campaignId={campaignId}
          campaignTitle={campaign.title || 'Кампания'}
          indexUrl={indexUrl}
          profileUrl={profileUrl}
          loginUrl={loginUrl}
          campaignUrl={campaignUrl}
          isAuthenticated={true}
          isAdmin={user.is('Admin')}
          adminUrl={user.is('Admin') ? getFullUrl(ROUTES.admin) : ''}
          testsUrl={getFullUrl(ROUTES.tests)}
        />
      </body>
    </html>
  )
})

export default campaignPageRoute
