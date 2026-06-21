// @shared
import { jsx } from '@app/html-jsx'
import LoginPage from './pages/LoginPage.vue'
import { tailwindScript, cssVariables, commonStyles } from './styles'

export const indexPageRoute = app.html('/', async (ctx, req) => {
  return (
    <html lang="ru">
      <head>
        <title>Войти на вебинар</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta charset="UTF-8" />
        <meta name="description" content="Форма входа на вебинар" />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* FontAwesome */}
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />

        {/* International Telephone Input */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.12/build/css/intlTelInput.css"
        />
        <script src="https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.12/build/js/intlTelInput.min.js"></script>

        {/* Tailwind CSS */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{tailwindScript}</script>

        {/* CSS Variables */}
        <style type="text/css">{cssVariables}</style>

        {/* Common Styles */}
        <style type="text/css">{commonStyles}</style>
      </head>
      <body>
        <LoginPage />
      </body>
    </html>
  )
})
