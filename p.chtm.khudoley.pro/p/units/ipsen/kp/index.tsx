import { jsx } from '@app/html-jsx'
import SitePage from './pages/SitePage.vue'
import { Answers } from './tables/answers.table'
import { SITE_CSS } from './shared/styles'
import { CONTENT, resolveLang } from './shared/content'

/**
 * Корневой роут сайта КП «Ipsen».
 *
 * Читает все ответы из Heap на сервере (Heap доступен только на сервере),
 * группирует их по questionId и передаёт SSR-пропсом в SitePage.vue.
 * Весь статический контент (архитектура, КП, вопросы) компонент берёт сам
 * из shared/content.ts.
 *
 * Язык: начальный берём из платформенного ctx.lang (автоопределение по профилю
 * пользователя / Accept-Language), дальше переключение живёт на клиенте.
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
      authorName: rr.authorName || '',
      authorType: rr.authorType || 'Anonymous',
      createdAtMs: Number(rr.createdAtMs) || 0
    })
  }

  const initialLang = resolveLang((ctx as any).lang)

  return (
    <html lang={initialLang}>
      <head>
        <title>Ipsen · {CONTENT[initialLang].meta.title}</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{SITE_CSS}</style>
      </head>
      <body>
        <SitePage answersByQuestion={answersByQuestion} initialLang={initialLang} />
      </body>
    </html>
  )
})

export default indexPageRoute
