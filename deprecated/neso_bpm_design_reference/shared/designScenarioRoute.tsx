// @shared
import { jsx } from '@app/html-jsx'
import DesignScenarioPage from '../pages/DesignScenarioPage.vue'
import { getBootLoaderDiv, getDemoPageHead } from './demoPageShell'
import { DEFAULT_PROJECT_TITLE } from '../config/project'
import { getBpmNavUrlsAsync } from '../lib/navUrls.lib'
import { BPM_DESIGN_SCENARIOS, getBpmScenarioBySlug } from './bpmScenarios'
import { getDefaultThemePresetId } from './themeCatalog'

export function createDesignScenarioRoute(scenarioSlug: string) {
  return app.html('/', async (ctx) => {
    const [scenario, navUrls] = await Promise.all([
      Promise.resolve(getBpmScenarioBySlug(scenarioSlug)),
      getBpmNavUrlsAsync(ctx)
    ])
    const theme = scenario?.theme ?? 'dark'
    const presetId = scenario?.presetId ?? getDefaultThemePresetId(theme)
    const pageTitle = scenario ? `Design · ${scenario.title}` : `Design · ${scenarioSlug}`

    return (
      <html>
        <head>{getDemoPageHead(theme, pageTitle, DEFAULT_PROJECT_TITLE, 'Info', presetId)}</head>
        <body>
          {getBootLoaderDiv(theme, DEFAULT_PROJECT_TITLE, presetId)}
          <DesignScenarioPage
            scenarioSlug={scenarioSlug}
            homeUrl={navUrls.homeUrl}
            loginUrl={navUrls.loginUrl}
            adminUrl={navUrls.adminUrl}
            testsUrl={navUrls.testsUrl}
            designIndexUrl={navUrls.designUrl}
            clientsDialogsUrl={navUrls.clientsDialogsUrl}
            scenarioCount={BPM_DESIGN_SCENARIOS.length}
          />
        </body>
      </html>
    )
  })
}
