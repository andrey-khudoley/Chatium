import { PAGE_HTML } from './pageHtml'

// Розыгрыш призов (sample, все данные вымышленные). Standalone-страница: анимированный
// розыгрыш двух призов среди списка участников. Порт дизайна Claude Design «Розыгрыш призов.dc.html».
// URL: /samples/raffle07
export const raffle07PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML)
})

export default raffle07PageRoute
