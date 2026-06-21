import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer. Desktop = literal 1:1 clone. URL: /p/units/neso/pages/a467
export const a467PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a467PageRoute
