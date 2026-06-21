// @shared
import { jsx } from '@app/html-jsx'
import ClientDialogsPage from '../../../pages/ClientDialogsPage.vue'
import { getBootLoaderDiv, getDemoPageHead } from '../../../shared/demoPageShell'
import { DEFAULT_PROJECT_TITLE } from '../../../config/project'
import { BPM_DESIGN_SCENARIOS } from '../../../shared/bpmScenarios'
import { getBpmNavUrlsAsync } from '../../../lib/navUrls.lib'

const PAGE_TITLE = 'Диалоги'

export const clientDialogsPageRoute = app.html('/', async (ctx) => {
  const navUrls = await getBpmNavUrlsAsync(ctx)
  return (
    <html>
      <head>
        {getDemoPageHead('light', PAGE_TITLE, DEFAULT_PROJECT_TITLE, 'Info', 'misty-daybreak')}
      </head>
      <body>
        {getBootLoaderDiv('light', DEFAULT_PROJECT_TITLE, 'misty-daybreak')}
        <ClientDialogsPage
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

export default clientDialogsPageRoute
