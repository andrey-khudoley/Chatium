// @shared-route
import * as loggerLib from '../../lib/logger.lib'
import * as quizFlow from '../../lib/quizFlow.lib'

const LOG_PATH = 'api/quiz/save'

/**
 * POST /api/quiz/save — сохранить ответы квиза App B.
 *
 * Тело: `{ email, name?, answers: { [questionId]: value }, syncToGc?: boolean }`.
 *
 * Поведение:
 * 1. Валидация по `quizConfig` (типы вопросов, options, scale, required).
 * 2. Запись нормализованных ответов в Heap-таблицу `QuizAnswers` (всегда).
 * 3. Опц. синхронизация с GC через `invoke('updateUserCustomFields')` —
 *    если `syncToGc !== false` (по умолчанию включено).
 *
 * Базовый успех = запись в Heap; ошибка GC-sync не делает запрос неуспешным
 * (Heap = SSOT квиза, см. спеку B §4).
 *
 * Без авторизации: квиз доступен анонимным посетителям; email — обязательное поле,
 * по нему GC ищет/обновляет пользователя.
 */
export const saveQuizRoute = app.post('/', async (ctx, req) => {
  const startedAt = Date.now()
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = (req.body ?? {}) as Partial<quizFlow.QuizSubmitInput>
  const input: quizFlow.QuizSubmitInput = {
    email: typeof body.email === 'string' ? body.email : '',
    name: typeof body.name === 'string' ? body.name : '',
    answers: (body.answers && typeof body.answers === 'object'
      ? body.answers
      : {}) as quizFlow.RawQuizAnswers,
    ...(typeof body.syncToGc === 'boolean' ? { syncToGc: body.syncToGc } : {})
  }

  let result: quizFlow.QuizSubmitResult
  try {
    result = await quizFlow.processQuizSubmit(ctx, input)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] internal error`,
      payload: { error: msg, durationMs: Date.now() - startedAt }
    })
    return {
      success: false,
      error: { code: 'CLIENT2_INTERNAL_ERROR', message: 'Внутренняя ошибка обработчика квиза.' }
    }
  }

  if (result.validationErrors.length > 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation failed`,
      payload: { errors: result.validationErrors, durationMs: Date.now() - startedAt }
    })
    return { success: false, validationErrors: result.validationErrors }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: {
      recordId: result.recordId,
      gcSyncOk: result.gcSync.ok,
      gcSyncSkipped: result.gcSync.skipped,
      durationMs: Date.now() - startedAt
    }
  })

  return {
    success: true,
    recordId: result.recordId,
    gcSync: result.gcSync
  }
})
