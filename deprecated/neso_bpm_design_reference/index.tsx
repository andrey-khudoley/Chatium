// @shared
import { jsx } from '@app/html-jsx'
import HomePage from './pages/HomePage.vue'
import { getBootLoaderDiv, getDemoPageHead } from './shared/demoPageShell'
import { DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME } from './config/project'
import { BPM_DESIGN_SCENARIOS } from './shared/bpmScenarios'
import { getBpmNavUrlsAsync } from './lib/navUrls.lib'

export const indexPageRoute = app.html('/', async (ctx) => {
  const navUrls = await getBpmNavUrlsAsync(ctx)

  return (
    <html>
      <head>
        {getDemoPageHead('light', INDEX_PAGE_NAME, DEFAULT_PROJECT_TITLE, 'Info', 'sunrise-leaf')}
      </head>
      <body>
        {getBootLoaderDiv('light', DEFAULT_PROJECT_TITLE, 'sunrise-leaf')}
        <HomePage
          projectTitle={DEFAULT_PROJECT_TITLE}
          homeUrl={navUrls.homeUrl}
          loginUrl={navUrls.loginUrl}
          adminUrl={navUrls.adminUrl}
          testsUrl={navUrls.testsUrl}
          designUrl={navUrls.designUrl}
          clientsDialogsUrl={navUrls.clientsDialogsUrl}
          scenarioCount={BPM_DESIGN_SCENARIOS.length}
        />
      </body>
    </html>
  )
})

export default indexPageRoute
