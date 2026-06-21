// @shared
import { jsx } from '@app/html-jsx'
import TestPage from './pages/TestPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Определите ваш стиль макияжа | Тест от EMI Online</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Узнайте свой стиль в макияже. Получите персональные рекомендации и доступ к бесплатному мастер-классу по макияжу для себя"
        />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  elegant: {
                    primary: '#D67C4A',
                    secondary: '#C96A3D',
                    accent: '#E88B5A',
                    light: '#F5E6DC',
                    cream: '#FAF5F0',
                    beige: '#EDD9CC',
                  }
                },
                fontFamily: {
                  sans: ['Montserrat', 'sans-serif'],
                  display: ['Playfair Display', 'serif'],
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            font-family: 'Montserrat', sans-serif;
            background: linear-gradient(135deg, #FAF7F5 0%, #F5EEF0 100%);
            min-height: 100vh;
          }
          .elegant-gradient {
            background: linear-gradient(135deg, #D67C4A 0%, #C96A3D 100%);
          }
          .glass-effect {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.5);
          }
          .question-card {
            transition: all 0.3s ease;
          }
          .question-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(214, 124, 74, 0.25);
          }
          .answer-option {
            transition: all 0.3s ease;
            cursor: pointer;
          }
          .answer-option:hover {
            transform: translateY(-2px);
            background: linear-gradient(135deg, #FAF5F0 0%, #F5E6DC 100%);
            box-shadow: 0 4px 12px rgba(214, 124, 74, 0.25);
          }
          .answer-option.selected {
            background: linear-gradient(135deg, #D67C4A 0%, #C96A3D 100%);
            color: white;
            border-color: #D67C4A;
          }
        `}</style>
      </head>
      <body>
        <TestPage />
      </body>
    </html>
  )
})
