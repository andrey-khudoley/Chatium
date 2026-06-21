// @shared
import { jsx } from '@app/html-jsx'
import { indexPageRoute } from './index'
import { listPageRoute } from './list'

/**
 * Старый эндпоинт /view?f=... — редирект на индекс с теми же query-параметрами.
 * для обратной совместимости ссылок. URL просмотра документа строится через docViewRoute из index.
 */
export { docViewRoute } from './index'

app.get('/', async (ctx, req) => {
  const search = new URLSearchParams(req.query as Record<string, string>).toString()
  if (search) {
    return ctx.resp.redirect(`${indexPageRoute.url()}?${search}`)
  }
  return ctx.resp.redirect(listPageRoute.url())
})
