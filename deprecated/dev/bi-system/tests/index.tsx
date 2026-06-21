// @shared
import { jsx } from '@app/html-jsx'
import UnitTestsPage from './pages/UnitTestsPage.vue'
import {
  tailwindScript,
  cssVariables,
  commonStyles,
  preloaderStyles,
  preloaderScript
} from '../styles'

export const testsPageRoute = app.html('/', async (ctx: RichUgcCtx, req: app.Req) => {
  return (
    <html>
      <head>
        <title>Unit Tests - Заготовка аналитики</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: tailwindScript }} />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        <style type="text/tailwindcss">{cssVariables}</style>
        <style>{commonStyles}</style>
        <style>{preloaderStyles}</style>

        <script>{`
          window.hideAppLoader = function() {
            const loader = document.getElementById('app-loader');
            const appContent = document.getElementById('app-content');
            
            if (loader) {
              loader.classList.add('hiding');
              setTimeout(() => {
                loader.style.display = 'none';
              }, 300);
            }
            
            if (appContent) {
              appContent.style.opacity = '1';
              appContent.style.transition = 'opacity 0.3s ease-in';
            }
          }
        `}</script>
      </head>
      <body>
        <div id="app-loader">
          <div class="loader-content">
            <div class="loader-logo">
              <i class="fas fa-flask"></i>
            </div>
            <div class="loader-spinner">
              <div class="loader-ring"></div>
            </div>
            <p class="loader-text">Загрузка тестов...</p>
          </div>
        </div>

        <div id="app-content" style="opacity: 0;">
          <UnitTestsPage />
        </div>
      </body>
    </html>
  )
})

export default testsPageRoute
