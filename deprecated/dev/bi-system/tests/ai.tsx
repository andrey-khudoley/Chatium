// @shared
import { jsx } from '@app/html-jsx'
import { requireAnyUser } from '@app/auth'
import { apiGetTestsListRoute, apiRunSingleTestRoute } from './api/run-tests'

export const testsAiPageRoute = app.html('/', async (ctx, req) => {
  await requireAnyUser(ctx) // Защищаем страницу авторизацией
  return (
    <html>
      <head>
        <title>Unit-AI Tests - Заготовка аналитики</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            margin: 0;
          }
          .loading {
            text-align: center;
            padding: 40px;
            font-size: 18px;
          }
          .spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #404040;
          }
          .error {
            color: #ff6b6b;
            background: #3d1f1f;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ff6b6b;
            margin: 20px 0;
          }
        `}</style>
      </head>
      <body>
        <div id="content">
          <div class="loading">
            <div class="spinner"></div>
            <p>Выполнение тестов... Это может занять до минуты.</p>
          </div>
        </div>

        <script>{`
          async function runTests() {
            try {
              // ✅ Используем route.url() для получения правильных URL
              const response = await fetch('${apiGetTestsListRoute.url()}');
              const testsList = await response.json();
              
              if (!testsList.success) {
                throw new Error('Failed to get tests list');
              }
              
              const startTime = Date.now();
              const allResults = [];
              
              // Запускаем каждый тест по отдельности
              for (const category of testsList.categories) {
                for (const test of category.tests) {
                  const testStartTime = Date.now();
                  
                  try {
                    const testResponse = await fetch('${apiRunSingleTestRoute.url()}', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        category: category.name,
                        testName: test.name
                      })
                    });
                    
                    if (!testResponse.ok) {
                      const errorText = await testResponse.text();
                      allResults.push({
                        category: category.name,
                        test: test.name,
                        description: test.description,
                        status: 'failed',
                        error: 'HTTP ' + testResponse.status + ': ' + (errorText || 'Unknown error'),
                        duration: Date.now() - testStartTime
                      });
                    } else {
                      const testResult = await testResponse.json();
                      
                      if (testResult && testResult.success === true) {
                        allResults.push({
                          category: category.name,
                          test: test.name,
                          description: test.description,
                          status: 'passed',
                          duration: testResult.duration || (Date.now() - testStartTime)
                        });
                      } else {
                        allResults.push({
                          category: category.name,
                          test: test.name,
                          description: test.description,
                          status: 'failed',
                          error: testResult?.error || testResult?.message || 'Unknown error',
                          duration: testResult?.duration || (Date.now() - testStartTime)
                        });
                      }
                    }
                  } catch (error) {
                    allResults.push({
                      category: category.name,
                      test: test.name,
                      description: test.description,
                      status: 'failed',
                      error: error?.message || String(error) || 'Unknown error',
                      duration: Date.now() - testStartTime
                    });
                  }
                }
              }
              
              const totalDuration = Date.now() - startTime;
              const passed = allResults.filter(r => r.status === 'passed').length;
              const failed = allResults.filter(r => r.status === 'failed').length;
              
              const finalResult = {
                timestamp: new Date().toISOString(),
                project: 'partnership',
                summary: {
                  total: allResults.length,
                  passed,
                  failed,
                  duration: totalDuration,
                  success: failed === 0
                },
                results: allResults
              };
              
              document.getElementById('content').innerHTML = '<pre>' + JSON.stringify(finalResult, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('content').innerHTML = '<div class="error"><h2>Ошибка при выполнении тестов</h2><p>' + error.message + '</p><pre>' + error.stack + '</pre></div>';
            }
          }
          
          runTests();
        `}</script>
      </body>
    </html>
  )
})

export default testsAiPageRoute
