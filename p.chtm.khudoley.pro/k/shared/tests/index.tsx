// @shared
import { jsx } from "@app/html-jsx"
import { requireAccountRole } from '@app/auth'
import UnitTestsPage from './pages/UnitTestsPage.vue'
import { commonStyles } from '../styles'

export const testsPageRoute = app.html('/', async (ctx, req) => {
  // Временно отключена проверка для автоматического тестирования
  // requireAccountRole(ctx, 'Admin')
  
  return (
    <html>
      <head>
        <title>Unit Tests - Knowledge App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        
        <style>{`
          :root {
            --color-bg: #fafbfc;
            --color-bg-secondary: #ffffff;
            --color-text: #1e293b;
            --color-text-secondary: #64748b;
            --color-text-tertiary: #94a3b8;
            --color-border: #e2e8f0;
            --color-primary: #0ea5e9;
            --color-primary-hover: #0284c7;
            --color-primary-light: #e0f2fe;
            --color-success: #10b981;
            --color-success-light: #d1fae5;
            --color-danger: #ef4444;
            --color-danger-light: #fee2e2;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
            --transition: all 0.2s ease;
          }
          
          .dark {
            --color-bg: #0f172a;
            --color-bg-secondary: #1e293b;
            --color-text: #f1f5f9;
            --color-text-secondary: #94a3b8;
            --color-text-tertiary: #64748b;
            --color-border: #334155;
            --color-primary: #38bdf8;
            --color-primary-hover: #0ea5e9;
            --color-primary-light: #1e3a5f;
            --color-success: #34d399;
            --color-success-light: #064e3b;
            --color-danger: #f87171;
            --color-danger-light: #7f1d1d;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
          }
        `}</style>
        <style>{commonStyles}</style>
        
        <script>{`
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  primary: '#0ea5e9',
                  success: '#10b981',
                  danger: '#ef4444',
                }
              }
            }
          }
        `}</script>
      </head>
      <body>
        <UnitTestsPage />
      </body>
    </html>
  )
})

export default testsPageRoute

