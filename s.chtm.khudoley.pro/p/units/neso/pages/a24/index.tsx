import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer: "КУРС «ЗАКОНЫ СТАРШИХ АРКАНОВ»" (NESO Akademie).
// Desktop = literal 1:1 clone of the Gamma render. URL: /p/units/neso/pages/a24
export const a24PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a24PageRoute
