import { PAGE_HTML } from './pageHtml'

// Розыгрыш призов (Ларина). Standalone-страница: анимированный розыгрыш двух призов
// среди реального списка участников. Порт дизайна Claude Design «Розыгрыш призов.dc.html».
// URL: /p/units/larina/raffle07
export const raffle07PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default raffle07PageRoute
