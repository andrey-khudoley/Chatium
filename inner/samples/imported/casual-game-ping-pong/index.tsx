// @shared
import { jsx } from '@app/html-jsx'
import PingPongGame from './pages/PingPongGame.vue'

export const indexPageRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <head>
        <title>Ping Pong Game</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            overflow-x: hidden;
          }
        `}</style>
      </head>
      <body>
        <PingPongGame />
      </body>
    </html>
  )
})
