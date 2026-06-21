import { jsx } from '@app/html-jsx'
import { headContent } from './styles'
import { requireAnyUser } from '@app/auth'
import { adminListRoute } from './admin'
import HomePage from './pages/HomePage.vue'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  await requireAnyUser(ctx)

  if (ctx.user?.is('Admin')) {
    return ctx.resp.redirect(adminListRoute.url())
  }

  return (
    <html lang="ru">
      <head>
        <title>Вебинарная комната</title>
        <meta name="description" content="Смотрите онлайн-трансляции и участвуйте в вебинарах" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />

        <link
          rel="icon"
          type="image/x-icon"
          href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
        />
        <link
          rel="apple-touch-icon"
          href="https://fs.chatium.ru/get/image_msk_Rr1014qTrN.256x239.ico"
        />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Вебинарная комната" />
        <meta
          property="og:description"
          content="Смотрите онлайн-трансляции и участвуйте в вебинарах"
        />

        {headContent}
      </head>

      <body class="antialiased">
        <HomePage />
      </body>
    </html>
  )
})
