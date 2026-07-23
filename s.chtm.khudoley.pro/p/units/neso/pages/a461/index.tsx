import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer: "Первая магия — без страха и ошибок" (NESO Akademie).
// Desktop = literal 1:1 clone of the Gamma render. URL: /p/units/neso/pages/a461
export const a461PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a461PageRoute
