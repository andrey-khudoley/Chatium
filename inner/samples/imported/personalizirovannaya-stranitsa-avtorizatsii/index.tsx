import { jsx } from '@app/html-jsx'
import { getEnabledAuthProviders } from '@app/auth/provider'
import Index from './Index.vue'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  const back = req.query.back as string | undefined

  // Получение доступных провайдеров авторизации
  const providers = await getEnabledAuthProviders(ctx)

  return (
    <html>
      <head>
        <title>{ctx.t('Authorization')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script src="/s/metric/clarity.js"></script>
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #2563eb;
            --color-secondary: #1e40af;
            --color-accent: #3b82f6;
            --color-dark: #111827;
            --color-light: #f3f4f6;
            --color-success: #10b981;
            --color-danger: #ef4444;
            --color-warning: #f59e0b;
            --color-info: #3b82f6;
            --font-sans: system-ui, -apple-system, sans-serif;
          }
          
          .auth-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .auth-card {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .input-field {
            transition: all 0.2s ease;
          }
          
          .input-field:focus {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            transition: all 0.2s ease;
          }
          
          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          }
        `}</style>
      </head>
      <body class="auth-container">
        <Index providers={providers} back={back} />
      </body>
    </html>
  )
})
