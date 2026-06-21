import { jsx } from '@app/html-jsx'
import AnalyticsPage from './pages/AnalyticsPage.vue'

export const indexPageRoute = app.get('/', async (ctx, req) => {
  // Проверка прав доступа (доступ для Staff и Admin)
  const hasAccess = ctx.user?.is('Staff')

  // Если пользователь не имеет прав - показываем страницу с ограничением доступа
  if (!hasAccess) {
    const backUrl = encodeURIComponent(indexPageRoute.url())
    const loginUrl = `/s/auth/signin?back=${backUrl}`

    // Различаем два случая: неавторизованный и не-админ
    const isAuthenticated = !!ctx.user
    const title = isAuthenticated ? 'Нет доступа' : 'Доступ ограничен'
    const iconClass = isAuthenticated ? 'fa-user-slash' : 'fa-lock'
    const message = isAuthenticated
      ? 'У вас нет прав для доступа к этой странице. Доступ имеют администраторы и разработчики.'
      : 'Эта страница доступна только администраторам и разработчикам. Пожалуйста, войдите в систему.'
    const buttonText = isAuthenticated ? 'Выйти и войти снова' : 'Войти'
    const buttonUrl = isAuthenticated ? loginUrl : loginUrl

    return (
      <html>
        <head>
          <title>{title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
          <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        </head>
        <body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
          <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div class="mb-6">
              <i class={`fas ${iconClass} text-6xl text-red-500`}></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
            <p class="text-gray-600 mb-6">{message}</p>
            {isAuthenticated ? (
              <button
                onclick={`
                  fetch('/s/auth/sign-out', { method: 'POST' })
                    .then(() => {
                      window.location.href = '${loginUrl}'
                    })
                `}
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                <i class="fas fa-sign-out-alt mr-2"></i>
                {buttonText}
              </button>
            ) : (
              <a
                href={buttonUrl}
                class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
              >
                <i class="fas fa-sign-in-alt mr-2"></i>
                {buttonText}
              </a>
            )}
          </div>
        </body>
      </html>
    )
  }

  // Если есть доступ (Admin или Staff) - показываем аналитику
  return (
    <html>
      <head>
        <title>Аналитика вовлеченности</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script src="/s/metric/clarity.js"></script>
        <style type="text/tailwindcss">{`
          @layer base {
            body {
              @apply bg-gray-50 text-gray-900;
            }
          }
        `}</style>
      </head>
      <body>
        <AnalyticsPage />
      </body>
    </html>
  )
})
