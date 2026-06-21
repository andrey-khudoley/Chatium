import { jsx } from '@app/html-jsx'

export const manifestRoute = app.get('/', async (ctx, req) => {
  const manifest = {
    name: 'Chatium Chat',
    short_name: 'Chat',
    description: 'Современный мессенджер для общения без границ',
    start_url: '/tg/',
    display: 'standalone',
    background_color: '#f0f2f5',
    theme_color: '#008069',
    orientation: 'portrait-primary',
    scope: '/tg/',
    lang: 'ru',
    dir: 'ltr',
    icons: [
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '72x72', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    screenshots: [
      {
        src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7',
        sizes: '540x720',
        type: 'image/png',
        form_factor: 'narrow'
      }
    ],
    categories: ['social', 'communication'],
    shortcuts: [
      {
        name: 'Новый чат',
        short_name: 'Чат',
        description: 'Создать новый чат',
        url: '/tg/',
        icons: [{ src: 'https://fs.chatium.ru/get/image_msk_AaplkedAT7', sizes: '192x192' }]
      }
    ]
  }

  ctx.resp.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  ctx.resp.setHeader('Cache-Control', 'public, max-age=3600')

  return ctx.resp.json(manifest)
})
