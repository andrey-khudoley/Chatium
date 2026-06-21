// @shared
import { jsx } from '@app/html-jsx'
import LoginPage from '../../pages/LoginPage.vue'
import { getBootLoaderDiv, getDemoPageHead } from '../../shared/demoPageShell'
import { DEFAULT_PROJECT_TITLE, LOGIN_PAGE_NAME } from '../../config/project'
import { getBpmNavUrlsAsync } from '../../lib/navUrls.lib'

export const loginPageRoute = app.html('/', async (ctx, req) => {
  const navUrls = await getBpmNavUrlsAsync(ctx)
  const back = typeof req.query?.back === 'string' ? req.query.back : navUrls.homeUrl

  return (
    <html>
      <head>
        {getDemoPageHead('dark', LOGIN_PAGE_NAME, DEFAULT_PROJECT_TITLE, 'Info', 'midnight-pine')}
      </head>
      <body>
        {getBootLoaderDiv('dark', DEFAULT_PROJECT_TITLE, 'midnight-pine')}
        <LoginPage back={back} homeUrl={navUrls.homeUrl} />
      </body>
    </html>
  )
})

export default loginPageRoute
