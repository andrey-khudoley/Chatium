import { jsx } from '@app/html-jsx'
import { genSocketId } from '@app/socket'
import { requireAnyUser } from '@app/auth'
import { setupPageRoute } from './setup'
// @ts-ignore
import ChatPage from './pages/ChatPage.vue'
import { findWorkspaceTransport } from './transport/hook'

export const chatPageRoute = app.get('/chat', async (ctx, req) => {
  const user = await requireAnyUser(ctx)

  const transport = await findWorkspaceTransport(ctx)
  if (!transport) {
    return ctx.resp.redirect(setupPageRoute.url())
  }

  return (
    <html>
      <head>
        <title>Чат с AI-помощником</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <style type="text/tailwindcss">{`
          @layer base {
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          }
        `}</style>
      </head>
      <body class="overflow-hidden">
        <ChatPage
          isAdmin={user.is('Admin')}
          socketId={await genSocketId(ctx, 'GPT_SOCKET_ID_' + user.id)}
        />
      </body>
    </html>
  )
})
