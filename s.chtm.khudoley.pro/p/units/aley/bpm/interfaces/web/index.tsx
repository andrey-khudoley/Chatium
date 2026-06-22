// @shared
import { jsx } from '@app/html-jsx'
import FlowPage from './pages/FlowPage.vue'
import { flowCss } from './pagecss/flowCss'
import { getLogLevelForPage, getLogLevelScript } from './shared/logLevel'
import { INDEX_PAGE_NAME, getPageTitle } from './config/project'
import * as loggerLib from './lib/logger.lib'
import * as settingsLib from './lib/settings.lib'

const LOG_PATH = 'index'

// Корневой роут "/" — главная FLOW (BPM Терминал). UI закрыт моками внутри FlowPage.vue;
// реальные данные подключаются позже через SSR-пропсы (accent/density/userName и т.д.).
export const indexPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер главной FLOW`,
    payload: { hasUser: !!ctx.user, isAdmin: ctx.user?.is?.('Admin') ?? false }
  })

  const logLevel = await getLogLevelForPage(ctx)
  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Переменные для рендера`,
    payload: { logLevel, projectName }
  })

  return (
    <html>
      <head>
        <title>{getPageTitle(INDEX_PAGE_NAME, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <script src="/s/metric/clarity.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{flowCss}</style>
      </head>
      <body>
        <FlowPage accent="#E11D48" density="compact" />
      </body>
    </html>
  )
})

export default indexPageRoute
