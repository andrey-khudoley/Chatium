// @shared-route
import * as loggerLib from '../../lib/logger.lib'
import { describeQuizForUi } from '../../lib/quizFlow.lib'

const LOG_PATH = 'api/quiz/config'

/**
 * GET /api/quiz/config — конфигурация квиза App B для клиента/UI.
 * Без авторизации; не содержит секретов.
 */
export const getQuizConfigRoute = app.get('/', async (ctx) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  const config = describeQuizForUi()

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { quizId: config.quizId, questionsCount: config.questions.length }
  })

  return { success: true, ...config }
})
