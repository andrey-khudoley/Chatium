import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer: "Выход с чёрной полосы" (NESO Akademie).
// Desktop = literal 1:1 clone of the Gamma render. URL: /p/units/neso/pages/a419
export const a419PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a419PageRoute
