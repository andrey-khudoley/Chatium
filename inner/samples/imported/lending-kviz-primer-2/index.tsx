// @shared
import { jsx } from '@app/html-jsx'
import QuizPage from './pages/QuizPage.vue'
import ThankYouPage from './pages/ThankYouPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Тест | Получи профессиональное руководство по педикюру</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Пройди тест и получи бесплатное руководство по профессии мастер-педикюра на 147 страниц"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#E8B4B8',
                  secondary: '#F5E6E8',
                  accent: '#D4949A',
                  dark: '#2D2D2D',
                },
                fontFamily: {
                  sans: ['Inter', 'sans-serif'],
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #F5E6E8 0%, #E8B4B8 100%);
            min-height: 100vh;
          }
          
          .quiz-card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          }
          
          .option-button {
            transition: all 0.3s ease;
            border: 2px solid #E5E7EB;
          }
          
          .option-button:hover {
            border-color: #E8B4B8;
            background-color: #FFF5F7;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(232, 180, 184, 0.2);
          }
          
          .option-button.selected {
            border-color: #E8B4B8;
            background-color: #FFF5F7;
          }
          
          .progress-bar {
            transition: width 0.5s ease;
            background: linear-gradient(90deg, #E8B4B8 0%, #D4949A 100%);
          }
          
          .fade-enter-active, .fade-leave-active {
            transition: opacity 0.3s ease;
          }
          
          .fade-enter-from, .fade-leave-to {
            opacity: 0;
          }
          
          .slide-up-enter-active {
            transition: all 0.4s ease;
          }
          
          .slide-up-enter-from {
            opacity: 0;
            transform: translateY(20px);
          }
          
          .pulse-animation {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .8;
            }
          }
          
          .gift-icon {
            animation: bounce 2s infinite;
          }
          
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}</style>
        <script src="/s/metric/clarity.js"></script>
      </head>
      <body>
        <QuizPage />
      </body>
    </html>
  )
})

export const thankYouPageRoute = app.get('/thank-you', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Ваш подарок готов! | Руководство мастера-педикюра</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Скачайте бесплатное руководство по профессии мастер-педикюра на 147 страниц"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#E8B4B8',
                  secondary: '#F5E6E8',
                  accent: '#D4949A',
                  dark: '#2D2D2D',
                },
                fontFamily: {
                  sans: ['Inter', 'sans-serif'],
                }
              }
            }
          }
        `}</script>
        <style type="text/tailwindcss">{`
          body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #F5E6E8 0%, #E8B4B8 100%);
            min-height: 100vh;
          }
          
          .quiz-card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          }
        `}</style>
        <script src="/s/metric/clarity.js"></script>
      </head>
      <body>
        <ThankYouPage />
      </body>
    </html>
  )
})
