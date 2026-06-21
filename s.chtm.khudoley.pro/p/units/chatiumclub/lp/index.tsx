// @shared
import { jsx } from '@app/html-jsx'
import LandingPage from './pages/LandingPage.vue'
import { getFullUrl, ROUTES } from './config/routes'

const PAGE_TITLE = 'Получить доступ к SDK · Chatium Club'
const HERO_TITLE = 'Подключите SDK Chatium Club'
const LOG_PATH = 'p/units/chatiumclub/lp/index'

/**
 * GET / — одноэкранный лендинг приложения lp.
 * Слева — описание SDK, справа — форма «Получить доступ к SDK».
 * Форма отправляется на POST /api/submit и сохраняется в Heap-таблицу Leads.
 */
export const indexPageRoute = app.html('/', async (ctx, _req) => {
  ctx.account.log(`[${LOG_PATH}] Рендер лендинга`, {
    level: 'info',
    json: { message: 'Рендер лендинга', hasUser: !!ctx.user }
  })

  const apiSubmitUrl = getFullUrl(ROUTES.apiSubmit)

  return (
    <html>
      <head>
        <title>{PAGE_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <meta
          name="description"
          content="Лендинг Chatium Club · SDK: получите доступ к тонкому клиенту над Chatium и GetCourse. Оставьте контакты, и мы свяжемся в Telegram."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html, body { margin: 0; padding: 0; background: #0b1020; min-height: 100vh; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        `}</style>
      </head>
      <body>
        <LandingPage pageTitle={HERO_TITLE} apiSubmitUrl={apiSubmitUrl} />
      </body>
    </html>
  )
})

export default indexPageRoute
