// @shared
import { jsx } from '@app/html-jsx'
import UnitTestsPage from '../../tests/pages/UnitTestsPage.vue'
import { getPreloaderStyles, getPreloaderScript } from '../../shared/preloader'
import { customScrollbarStyles, crtDesignShellStyles, crtThemeVarsStyles } from '../../styles'
import { getFullUrl, ROUTES } from '../../config/routes'
import { PROJECT_TITLE } from '../../config/project'

export const testsPageRoute = app.html('/', async (ctx) => {
  const indexUrl = getFullUrl(ROUTES.index)
  const uiUrl = getFullUrl(ROUTES.ui)
  const testsUrl = getFullUrl(ROUTES.tests)

  return (
    <html>
      <head>
        <title>Тесты - {PROJECT_TITLE}</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{getPreloaderStyles()}</style>
        <style>{crtDesignShellStyles}</style>
        <style>{crtThemeVarsStyles}</style>
        <style>{customScrollbarStyles}</style>
        <script>{getPreloaderScript()}</script>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="geometric-bg"></div>
        <div id="tv-glitch"></div>
        <div id="boot-loader">
          <div class="boot-messages">
            <div id="boot-messages-container"></div>
          </div>
        </div>
        <div class="app-layout">
          <UnitTestsPage
            projectTitle={PROJECT_TITLE}
            indexUrl={indexUrl}
            uiUrl={uiUrl}
            testsUrl={testsUrl}
          />
        </div>
      </body>
    </html>
  )
})

export default testsPageRoute
