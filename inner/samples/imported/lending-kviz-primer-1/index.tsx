// @shared
import { jsx } from '@app/html-jsx'
import QuizPage from './pages/QuizPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Получите подарок для бьюти-мастеров</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#8B5CF6',
                  secondary: '#EC4899',
                  accent: '#3B82F6',
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #8B5CF6;
            --color-secondary: #EC4899;
            --color-accent: #3B82F6;
            font-family: 'Inter', sans-serif;
          }
          
          .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .quiz-card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          }
          
          .answer-option {
            transition: all 0.3s ease;
            cursor: pointer;
            border: 2px solid #e5e7eb;
          }
          
          .answer-option:hover {
            border-color: var(--color-primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
          }
          
          .answer-option.selected {
            border-color: var(--color-primary);
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
          }
          
          .progress-bar {
            transition: width 0.5s ease;
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: all 0.3s ease;
          }
          
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
          }
          
          .fade-enter-active, .fade-leave-active {
            transition: opacity 0.3s ease;
          }
          
          .fade-enter-from, .fade-leave-to {
            opacity: 0;
          }
        `}</style>
      </head>
      <body class="min-h-screen">
        <QuizPage />
      </body>
    </html>
  )
})
