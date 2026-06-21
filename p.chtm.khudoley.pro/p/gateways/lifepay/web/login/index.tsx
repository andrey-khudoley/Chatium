// @shared
import { jsx } from '@app/html-jsx'
import LoginPage from '../../pages/LoginPage.vue'
import { baseHtmlStyles, customScrollbarStyles } from '../../styles'
import { PROJECT_ROOT } from '../../config/routes'
import { getLogLevelForPage, getLogLevelScript } from '../../shared/logLevel'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'web/login/index'

export const loginPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос страницы входа`,
    payload: { queryKeys: Object.keys(req.query ?? {}), query: req.query }
  })
  const back = (req.query?.back as string) || `/${PROJECT_ROOT}/`
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Переменные для рендера`,
    payload: { back, hasQuery: !!req.query?.back }
  })
  const logLevel = await getLogLevelForPage(ctx)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] logLevel для страницы`,
    payload: { logLevel }
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер страницы входа`,
    payload: { back, hasQuery: !!req.query?.back, logLevel }
  })

  return (
    <html>
      <head>
        <title>Вход</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script>{getLogLevelScript(logLevel)}</script>
        <script src="/s/metric/clarity.js"></script>
        <style>{baseHtmlStyles}</style>
        <style>{customScrollbarStyles}</style>
      </head>
      <body>
        <LoginPage back={back} />
      </body>
    </html>
  )
})

export default loginPageRoute
