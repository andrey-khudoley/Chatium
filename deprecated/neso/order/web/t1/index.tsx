// @shared
import { jsx } from '@app/html-jsx'
import OrderTFormPage from '../../pages/OrderTFormPage.vue'
import {
  orderFormTailwindScript,
  orderFormCssVariables,
  orderFormCommonStyles
} from '../../shared/orderFormPageStyles'
import { customScrollbarStyles } from '../../styles'
import * as loggerLib from '../../lib/logger.lib'
import { ORDER_T1_PAGE_TITLE, getPageTitle } from '../../config/project'
import * as settingsLib from '../../lib/settings.lib'

const LOG_PATH = 'web/t1/index'

export const orderT1PageRoute = app.html('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос страницы заявки (T1)`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  const projectName = await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
  const isAdmin = ctx.user?.is('Admin') ?? false

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Рендер`,
    payload: { projectName, isAdmin }
  })

  return (
    <html lang="ru">
      <head>
        <title>{getPageTitle(ORDER_T1_PAGE_TITLE, projectName)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta charset="UTF-8" />
        <meta name="description" content="Форма заявки" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.12/build/css/intlTelInput.css"
        />
        <script src="https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.12/build/js/intlTelInput.min.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{orderFormTailwindScript}</script>
        <style type="text/css">{orderFormCssVariables}</style>
        <style type="text/css">{orderFormCommonStyles}</style>
        <style type="text/css">{customScrollbarStyles}</style>
        <script src="/s/metric/clarity.js"></script>
      </head>
      <body>
        <OrderTFormPage pageVariant="t1" pageTitle={ORDER_T1_PAGE_TITLE} />
      </body>
    </html>
  )
})

export default orderT1PageRoute
