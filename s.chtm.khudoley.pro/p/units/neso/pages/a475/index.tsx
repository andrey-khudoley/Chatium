import { PAGE_HTML } from './pageHtml'

// Gamma -> Chatium transfer: "Инициация во Внутреннего Дракона" (NESO Akademie).
// Desktop = literal 1:1 clone of the Gamma render. URL: /p/units/neso/pages/a475
export const a475PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default a475PageRoute
