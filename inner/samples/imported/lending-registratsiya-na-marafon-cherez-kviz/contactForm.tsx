// @shared
import { jsx } from '@app/html-jsx'
import ContactFormPage from './pages/ContactFormPage.vue'

export const contactFormRoute = app.get('/contact-form', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Укажи контакты — EMI Online</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#ec4899',
                  secondary: '#9333ea',
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
            --color-primary: #ec4899;
            --color-secondary: #9333ea;
          }
        `}</style>
      </head>
      <body>
        <ContactFormPage />
      </body>
    </html>
  )
})
