import { s } from '@app/schema'
import { jsx } from '@app/html-jsx'
import { genSocketId } from '@app/socket'
import { requireAnyUser } from '@app/auth'
// @ts-ignore
import PopupComponent from './components/PopupComponent.vue'

export const popupRoute = app
  .get('/')
  .query({ uid: s.string() })
  .handle(async (ctx, req) => {
    let uid = req.query.uid

    if (!uid) {
      const user = await requireAnyUser(ctx)
      uid = user.id
    }

    return (
      <html>
        <head>
          <title>Popup Widget</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/metric/clarity.js"></script>
          <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body, [data-vue-component-id] {
            height: 100%;
            width: 100%;
          }

          body {
            font-family: system-ui, -apple-system, sans-serif;
          }
        `}</style>
        </head>
        <body>
          <PopupComponent uid={uid} socketId={await genSocketId(`CHAT_WIDGET_SOCKET_ID_${uid}`)} />
        </body>
      </html>
    )
  })
