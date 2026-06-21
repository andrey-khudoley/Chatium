import { jsx } from '@app/html-jsx'
import MainPage from './pages/MainPage.vue'
import { getChannels } from '@sender/sdk'
import { findCurrentWorkspace } from '@start/sdk'
import { requireAccountRole } from '@app/auth'
import GalleryPage from './pages/GalleryPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  if (req.query.gallery !== undefined) {
    return (
      <html>
        <head>
          <title>Telegram Web App Bot - Галерея</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/metric/clarity.js"></script>
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        </head>
        <body>
          <GalleryPage />
        </body>
      </html>
    )
  }

  requireAccountRole(ctx, 'Admin')

  const workspace = await findCurrentWorkspace(ctx)
  const workspacePath = workspace?.path || ''

  const availableChannels = (await getChannels(ctx))
    .map((channel) => ({
      id: channel.id,
      title: channel.title,
      source: channel.source,
      description: channel.description,
      username: channel.username,
      photo: channel.photo,
      active: channel.active
    }))
    .filter((channel) => channel.active)

  return (
    <html>
      <head>
        <title>Главная страница</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
      </head>
      <body>
        <MainPage availableChannels={availableChannels} workspacePath={workspacePath} />
      </body>
    </html>
  )
})
