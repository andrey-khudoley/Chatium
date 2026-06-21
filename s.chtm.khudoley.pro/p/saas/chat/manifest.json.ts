import { jsx } from '@app/html-jsx'
import { getAppUrl } from './shared/app-paths'

export const manifestRoute = app.get('/', async (ctx, req) => {
  // Динамически определяем базовый путь приложения
  const basePath = getAppUrl(ctx, '/')

  const manifest = {
    name: 'Chatium Chat',
    short_name: 'Chat',
    description: 'Общайтесь без границ в современном мессенджере',
    start_url: basePath,
    display: 'standalone',
    background_color: '#f0f2f5',
    theme_color: '#008069',
    orientation: 'portrait-primary',
    scope: basePath,
    lang: 'ru',
    dir: 'ltr',
    icons: [
      {
        src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    categories: ['social', 'communication']
  }

  ctx.resp.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  ctx.resp.setHeader('Cache-Control', 'public, max-age=3600')

  return ctx.resp.json(manifest)
})
