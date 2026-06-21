import { jsx } from '@app/html-jsx'
import { PresentationHead } from './styles'
import Presentation from './pages/Presentation.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Chatium — Операционная система для бизнеса</title>
        <PresentationHead />
      </head>
      <body style="margin:0;padding:0;">
        <Presentation />
      </body>
    </html>
  )
})
