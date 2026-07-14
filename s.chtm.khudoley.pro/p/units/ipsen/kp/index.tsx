import { jsx } from '@app/html-jsx'
import SitePage from './pages/SitePage.vue'
import { Answers } from './tables/answers.table'
import { SITE_CSS } from './shared/styles'

/**
 * Корневой роут сайта КП «Ипсен».
 *
 * Читает все ответы из Heap на сервере (Heap доступен только на сервере),
 * группирует их по questionId и передаёт SSR-пропсом в SitePage.vue.
 * Весь статический контент (архитектура, КП, вопросы) компонент берёт сам
 * из shared/content.ts.
 */
export const indexPageRoute = app.html('/', async (ctx) => {
  const rows = await Answers.findAll(ctx, {
    order: [{ createdAtMs: 'asc' }],
    limit: 1000
  })

  const answersByQuestion: Record<string, any[]> = {}
  for (const r of rows) {
    const rr: any = r
    const qid: string = rr.questionId
    if (!qid) continue
    const list: any[] = answersByQuestion[qid] ?? (answersByQuestion[qid] = [])
    list.push({
      id: String(rr.id),
      text: rr.text,
      authorName: rr.authorName || 'Гость',
      authorType: rr.authorType || 'Anonymous',
      createdAtMs: Number(rr.createdAtMs) || 0
    })
  }

  const u: any = ctx.user
  const userName = u?.type === 'Real' ? String(u?.displayName ?? '') : ''

  return (
    <html lang="ru">
      <head>
        <title>Ипсен · Инфраструктура ИИ-агентов</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{SITE_CSS}</style>
      </head>
      <body>
        <SitePage answersByQuestion={answersByQuestion} userName={userName} />
      </body>
    </html>
  )
})

export default indexPageRoute
