// @shared
import { jsx } from '@app/html-jsx'
import VoiceRecorderPage from './pages/VoiceRecorder.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Запись голосовых сообщений</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                  success: '#10b981',
                  danger: '#ef4444',
                }
              }
            }
          }
        `}</script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style type="text/tailwindcss">{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background-color: #166ea1;
            min-height: 100vh;
          }
          
          @keyframes pulse-ring {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          
          .pulse-ring {
            animation: pulse-ring 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
          }
        `}</style>
      </head>
      <body>
        <VoiceRecorderPage />
      </body>
    </html>
  )
})
