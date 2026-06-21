import { jsx } from '@app/html-jsx'
import { HeadStyles } from './styles'
import MainPage from './pages/MainPage.vue'

const OG_IMAGE = 'https://fs.chatium.ru/thumbnail/image_msk_2bq1JwLtNx.1280x853.jpeg/s/1200x'
const TITLE = 'Жизнь вполсилы — запись вебинара'
const DESCRIPTION = 'Запись вебинара «Жизнь вполсилы» с Алексеем Волковым.'

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
      </body>
    </html>
  )
})
