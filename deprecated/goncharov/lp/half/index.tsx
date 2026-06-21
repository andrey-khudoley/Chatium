import { jsx } from '@app/html-jsx'
import { HeadStyles } from './styles'
import MainPage from './pages/MainPage.vue'
import ThankYouPage from './pages/ThankYouPage.vue'
import { requireAccountRole } from '@app/auth'

const OG_IMAGE = 'https://fs.chatium.ru/thumbnail/image_msk_2bq1JwLtNx.1280x853.jpeg/s/1200x'
const TITLE = 'Жизнь вполсилы — встреча в записи с врачом Алексеем Волковым'
const DESCRIPTION =
  'На каком уровне энергии вы сейчас? Практическая встреча для тех, кто чувствует, что сил стало меньше. 28 марта, в записи, 1 час.'

const isAdmin = (ctx: app.Ctx) => ctx.user?.is?.('Admin') ?? false

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta
          name="keywords"
          content="вебинар энергия, усталость, восстановление ресурса, китайская медицина, Алексей Волков, уровень энергии"
        />
        <meta name="author" content="Алексей Волков" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={OG_IMAGE} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://${ctx.hostname}${req.url}`} />

        <script src="/s/metric/clarity.js"></script>
        <HeadStyles />
      </head>
      <body>
        <MainPage />
        {isAdmin(ctx) && (
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 10000,
              alignItems: 'flex-end'
            }}
          >
            <a
              href="/p/units/goncharov/lp/half/web/admin/getcourse"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #c9a86c 0%, #b8956a 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(201, 168, 108, 0.4)',
                transition: 'all 0.3s ease'
              }}
            >
              <i class="fas fa-cog"></i>
              <span>Настройки</span>
            </a>
            <a
              href="/p/units/goncharov/lp/half/web/admin/analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(94, 80, 63, 0.9)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(94, 80, 63, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <i class="fas fa-chart-line"></i>
              <span>Аналитика</span>
            </a>
          </div>
        )}
      </body>
    </html>
  )
})

export const thankYouPageRoute = app.get('/thanks', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>Спасибо за регистрацию на вебинар</title>
        <meta
          name="description"
          content="Спасибо за регистрацию на вебинар «Жизнь вполсилы». Встреча в записи станет доступна 28 марта 2026 в 19:00 по московскому времени."
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`https://${ctx.hostname}${req.url}`} />

        <HeadStyles />
      </head>
      <body>
        <ThankYouPage />
      </body>
    </html>
  )
})
