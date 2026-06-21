import { jsx } from '@app/html-jsx'
import { Styles } from './styles'
import LandingPage from './pages/LandingPage.vue'

export const indexPageRoute = app.get('/', async (ctx) => {
  return (
    <html lang="ru">
      <head>
        <title>Надежда Фомина — маркетолог-стратег | Маркетинг без сказок</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Маркетолог-стратег с 12+ летним опытом. Яндекс Директ, маркетинговая стратегия, позиционирование. Фокус на выручку, а не на клики."
        />
        <meta property="og:title" content="Надежда Фомина — маркетолог-стратег" />
        <meta
          property="og:description"
          content="Маркетинг без сказок. Выстраиваю системный маркетинг с фокусом на реальную выручку."
        />
        <meta
          property="og:image"
          content="https://fs.chatium.ru/thumbnail/image_msk_iluouajXqE.768x765.jpeg/s/600x"
        />
        <script src="/s/metric/clarity.js"></script>
        <Styles />
      </head>
      <body>
        <div class="preloader" id="preloader">
          <div class="preloader-initials">НФ</div>
          <div class="preloader-line"></div>
        </div>
        <LandingPage />
      </body>
    </html>
  )
})
