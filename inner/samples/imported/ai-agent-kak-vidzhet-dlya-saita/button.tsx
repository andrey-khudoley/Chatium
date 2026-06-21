import { jsx } from '@app/html-jsx'
// @ts-ignore
import ButtonComponent from './components/ButtonComponent.vue'

export const buttonRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Button Widget</title>
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
            pointer-events: none;
            font-family: system-ui, -apple-system, sans-serif;
            background: transparent;

            padding: 0;
            margin: 0;
          }
        `}</style>
      </head>
      <body>
        <ButtonComponent />
      </body>
    </html>
  )
})
