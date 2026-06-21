// @shared
import { jsx } from '@app/html-jsx'
import AdminPage from '../../pages/AdminPage.vue'
import { getBootLoaderDiv, getDemoPageHead } from '../../shared/demoPageShell'
import { ADMIN_PAGE_NAME, DEFAULT_PROJECT_TITLE } from '../../config/project'
import { BPM_DESIGN_SCENARIOS } from '../../shared/bpmScenarios'
import * as settingsLib from '../../lib/settings.lib'
import { getBpmNavUrlsAsync } from '../../lib/navUrls.lib'

export const adminPageRoute = app.html('/', async (ctx) => {
  const navUrls = await getBpmNavUrlsAsync(ctx)
  let settings: Array<{ key: string; value: string }> = []
  try {
    const allSettings = await settingsLib.getAllSettings(ctx)
    settings = Object.entries(allSettings)
      .slice(0, 12)
      .map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }))
  } catch {
    settings = [{ key: 'settings', value: 'unavailable' }]
  }

  const layerCards = [
    {
      label: 'Heap tables',
      value: '2',
      hint: 'settings.table + logs.table'
    },
    {
      label: 'Repositories',
      value: '2',
      hint: 'settings.repo + logs.repo'
    },
    {
      label: 'Libraries',
      value: '3',
      hint: 'settings.lib + logger.lib + dashboard.lib'
    }
  ]

  return (
    <html>
      <head>
        {getDemoPageHead('dark', ADMIN_PAGE_NAME, DEFAULT_PROJECT_TITLE, 'Info', 'forest-night')}
      </head>
      <body>
        {getBootLoaderDiv('dark', DEFAULT_PROJECT_TITLE, 'forest-night')}
        <AdminPage
          projectTitle={DEFAULT_PROJECT_TITLE}
          homeUrl={navUrls.homeUrl}
          loginUrl={navUrls.loginUrl}
          testsUrl={navUrls.testsUrl}
          designUrl={navUrls.designUrl}
          scenariosTotal={BPM_DESIGN_SCENARIOS.length}
          layerCards={layerCards}
          settings={settings}
        />
      </body>
    </html>
  )
})

export default adminPageRoute
