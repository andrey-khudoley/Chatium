import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer. Desktop = literal 1:1 clone. URL: /p/units/neso/pages/a464
export const a464PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a464PageRoute
