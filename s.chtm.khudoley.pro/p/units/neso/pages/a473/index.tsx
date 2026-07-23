import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer: "Инициация для работы с Княгиней Смерти" (NESO Akademie).
// Desktop = literal 1:1 clone of the Gamma render. URL: /p/units/neso/pages/a473
export const a473PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a473PageRoute
