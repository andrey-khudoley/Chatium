// @shared
import { jsx } from '@app/html-jsx'
import DesignIndexPage from '../../pages/DesignIndexPage.vue'
import { getBootLoaderDiv, getDemoPageHead } from '../../shared/demoPageShell'
import { DEFAULT_PROJECT_TITLE, DESIGN_PAGE_NAME } from '../../config/project'
import { BPM_DESIGN_SCENARIOS } from '../../shared/bpmScenarios'
import { getBpmNavUrlsAsync } from '../../lib/navUrls.lib'

export const designIndexPageRoute = app.html('/', async (ctx) => {
  const navUrls = await getBpmNavUrlsAsync(ctx)
  const scenarios = BPM_DESIGN_SCENARIOS.map((scenario) => ({
    slug: scenario.slug,
    title: scenario.title,
    description: scenario.description,
    objective: scenario.objective,
    tags: scenario.tags,
    theme: scenario.theme,
    presetId: scenario.presetId,
    layout: scenario.layout,
    url: navUrls.getScenarioUrl(scenario.slug)
  }))

  return (
    <html>
      <head>
        {getDemoPageHead('light', DESIGN_PAGE_NAME, DEFAULT_PROJECT_TITLE, 'Info', 'sunrise-leaf')}
      </head>
      <body>
        {getBootLoaderDiv('light', DEFAULT_PROJECT_TITLE, 'sunrise-leaf')}
        <DesignIndexPage
          homeUrl={navUrls.homeUrl}
          loginUrl={navUrls.loginUrl}
          adminUrl={navUrls.adminUrl}
          testsUrl={navUrls.testsUrl}
          scenarios={scenarios}
        />
      </body>
    </html>
  )
})

export default designIndexPageRoute
