// @shared-route
import { requireAnyUser } from '@app/auth'
import { Answers } from '../../tables/answers.table'
import { ALL_QUESTION_IDS } from '../../shared/content'

const LOG_PATH = 'api/answers/create'

const MAX_TEXT = 4000
const MAX_NAME = 120

/**
 * POST — публичный приём ответа на открытый вопрос.
 * Тело: `{ questionId: string; text: string; authorName?: string }`.
 *
 * Доступ анонимный: `requireAnyUser` гарантирует наличие пользователя (при
 * необходимости создаёт анонимного), реальную авторизацию не требует —
 * ответить может любой посетитель сайта. Ответ сохраняется в Heap-таблицу
 * `Answers` и привязывается к вопросу через `questionId`.
 *
 * Возвращает `{ success, answer }` при успехе или `{ success: false, error }`.
 */
export const apiCreateAnswerRoute = app.post('/', async (ctx, req) => {
  try {
    const user = await requireAnyUser(ctx)
    const cur: any = user ?? ctx.user ?? {}

    const body = (req.body ?? {}) as { questionId?: unknown; text?: unknown; authorName?: unknown }

    const questionId = typeof body.questionId === 'string' ? body.questionId.trim() : ''
    const rawText = typeof body.text === 'string' ? body.text.trim() : ''
    const rawName = typeof body.authorName === 'string' ? body.authorName.trim() : ''

    if (!questionId || !ALL_QUESTION_IDS.includes(questionId)) {
      ctx.account.log(`[${LOG_PATH}] rejected: unknown question`, {
        level: 'warn',
        json: { questionId }
      })
      return { success: false, error: 'Неизвестный вопрос.' }
    }
    if (!rawText) {
      ctx.account.log(`[${LOG_PATH}] rejected: empty text`, {
        level: 'warn',
        json: { questionId }
      })
      return { success: false, error: 'Введите текст ответа.' }
    }

    const text = rawText.slice(0, MAX_TEXT)

    // Имя: из формы, иначе от реального пользователя, иначе — «Гость».
    let authorName = rawName.slice(0, MAX_NAME)
    if (!authorName) {
      authorName = cur.type === 'Real' && cur.displayName ? String(cur.displayName) : 'Гость'
    }

    const createdAtMs = Date.now()

    const row = await Answers.create(ctx, {
      questionId,
      text,
      authorName,
      authorUserId: cur.id ? String(cur.id) : '',
      authorType: cur.type ? String(cur.type) : 'Anonymous',
      createdAtMs
    })

    ctx.account.log(`[${LOG_PATH}] answer saved`, {
      level: 'info',
      json: { questionId, answerId: String((row as any).id), authorType: cur.type ?? 'Anonymous' }
    })

    return {
      success: true,
      answer: {
        id: String((row as any).id),
        questionId,
        text,
        authorName,
        authorType: cur.type ? String(cur.type) : 'Anonymous',
        createdAtMs
      }
    }
  } catch (error: any) {
    ctx.account.log(`[${LOG_PATH}] failed`, { level: 'error', json: { error: error?.message } })
    return { success: false, error: 'Не удалось сохранить ответ. Попробуйте ещё раз.' }
  }
})

export default apiCreateAnswerRoute
