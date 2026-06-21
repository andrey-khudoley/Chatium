// @shared
import { jsx } from '@app/html-jsx'
import { apiRunAllTestsRoute } from '../../../tests/api/run-tests'

export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  const result = await apiRunAllTestsRoute.run(ctx, {})

  return (
    <html>
      <head>
        <title>AI Tests - Storage</title>
        <meta charset="UTF-8" />
        <style>{`
          body { font-family: 'Courier New', monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
        `}</style>
      </head>
      <body>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </body>
    </html>
  )
})

export default testsAiPageRoute
