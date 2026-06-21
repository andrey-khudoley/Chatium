// @shared
import { jsx } from "@app/html-jsx"
import { apiRunAllTestsRoute } from './api/run-tests'

export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  // Вызываем API который выполнит все тесты
  const result = await apiRunAllTestsRoute.run(ctx, req)
  
  // Возвращаем JSON как HTML
  return (
    <html>
      <head>
        <title>Unit-AI Tests - Knowledge App</title>
        <meta charset="UTF-8" />
        <style>{`
          body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            margin: 0;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
          }
          .summary {
            background: #2d2d2d;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid ${result.summary?.success ? '#10b981' : '#ef4444'};
          }
          .success {
            color: #10b981;
          }
          .failed {
            color: #ef4444;
          }
        `}</style>
      </head>
      <body>
        <div class="summary">
          <h1>Knowledge App - Unit Tests (AI)</h1>
          <p>Timestamp: {result.timestamp}</p>
          <p>Status: <span class={result.summary?.success ? 'success' : 'failed'}>
            {result.summary?.success ? '✓ ALL PASSED' : '✗ SOME FAILED'}
          </span></p>
          <p>Total: {result.summary?.total} | Passed: {result.summary?.passed} | Failed: {result.summary?.failed}</p>
          <p>Duration: {result.summary?.duration}ms</p>
        </div>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </body>
    </html>
  )
})

export default testsAiPageRoute

