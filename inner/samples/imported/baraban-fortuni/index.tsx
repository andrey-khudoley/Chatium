import { jsx } from '@app/html-jsx'
import App from './App.vue'

app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Wheel of Fortune Spinner</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body style={{ overflow: 'hidden' }}>
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

        <App />
      </body>
    </html>
  )
})
