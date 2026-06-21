// @shared
import { jsx } from '@app/html-jsx'
import LoginPage from '../../pages/LoginPage.vue'
import { baseHtmlStyles, customScrollbarStyles, formControlStyles, mobileSafeAreaStyles, VIEWPORT_META_CONTENT } from '../../styles'
import { PROJECT_ROOT } from '../../config/routes'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'web/login/index'

export const loginPageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос страницы входа`,
    payload: { queryKeys: Object.keys(req.query ?? {}), query: req.query }
  })
  const back = (req.query?.back as string) || `/${PROJECT_ROOT}/`
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Переменные для рендера`,
    payload: { back, hasQuery: !!req.query?.back }
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер страницы входа`,
    payload: { back, hasQuery: !!req.query?.back }
  })

  return (
    <html>
      <head>
        <title>Вход</title>
        <meta name="viewport" content={VIEWPORT_META_CONTENT} />
        <meta charset="UTF-8" />
        <script src="/s/metric/clarity.js"></script>
        <style>{baseHtmlStyles}</style>
        <style>{customScrollbarStyles}</style>
        <style>{mobileSafeAreaStyles}</style>
        <style>{formControlStyles}</style>
      </head>
      <body>
        <LoginPage back={back} />
      </body>
    </html>
  )
})

export default loginPageRoute
