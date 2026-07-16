import { Answers } from '../../tables/answers.table'
import { CONTENT } from '../../shared/content'
import type { Lang } from '../../shared/content'

const LOG_PATH = 'api/answers/all'

/**
 * GET — публичная выгрузка всех открытых вопросов вместе с ответами одним JSON.
 *
 * Читает все ответы из Heap (доступен только на сервере), группирует их по
 * `questionId` и склеивает со статической структурой вопросов из
 * `shared/content.ts`. Для каждого вопроса отдаётся код, блок, тексты на всех
 * поддерживаемых языках и список ответов.
 *
 * Доступ открытый, без авторизации: те же ответы уже публично отображаются на
 * странице сайта, поэтому JSON не раскрывает ничего нового. Внутренний
 * `authorUserId` намеренно НЕ включается в выдачу (как и на SSR-странице).
 */
export const apiAllAnswersRoute = app.get('/', async (ctx) => {
  try {
    // Heap ограничивает findAll лимитом 1000 записей на запрос — выбираем все
    // ответы постранично, чтобы выгрузка была полной при любом их количестве.
    const PAGE = 1000
    const rows: any[] = []
    for (let offset = 0; ; offset += PAGE) {
      const page = await Answers.findAll(ctx, {
        order: [{ createdAtMs: 'asc' }],
        limit: PAGE,
        offset
      })
      rows.push(...page)
      if (page.length < PAGE) break
    }

    // Группируем ответы по вопросу.
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

    // Структуру вопросов берём из русского контента (id сквозные), а тексты
    // собираем по всем языкам. Индексы блоков/вопросов совпадают между языками.
    const langs = Object.keys(CONTENT) as Lang[]
    const questions: any[] = []

    CONTENT.ru.questionBlocks.forEach((block, bi) => {
      block.questions.forEach((q, qi) => {
        const text: Record<string, string> = {}
        for (const lang of langs) {
          const lq = CONTENT[lang].questionBlocks[bi]?.questions[qi]
          if (lq) text[lang] = lq.text
        }
        const answers = answersByQuestion[q.id] ?? []
        questions.push({
          id: q.id,
          code: q.code,
          blockLetter: block.letter,
          blockTitle: block.title,
          feeds: q.feeds,
          text,
          answersCount: answers.length,
          answers
        })
      })
    })

    const totalAnswers = rows.length

    ctx.account.log(`[${LOG_PATH}] export served`, {
      level: 'info',
      json: { questions: questions.length, answers: totalAnswers }
    })

    return {
      success: true,
      generatedAtMs: Date.now(),
      totalQuestions: questions.length,
      totalAnswers,
      questions
    }
  } catch (error: any) {
    ctx.account.log(`[${LOG_PATH}] failed`, { level: 'error', json: { error: error?.message } })
    return { success: false, error: 'Не удалось сформировать выгрузку.' }
  }
})

export default apiAllAnswersRoute
