// @shared

import { reportError } from './error-reporter'

/**
 * Middleware для автоматической обработки ошибок
 * Оборачивает все запросы в try-catch, репортит ошибки и пробрасывает дальше
 *
 * @example
 * import { reporterApp } from "../shared/error-handler-middleware"
 *
 * reporterApp.post('/some-route', async (ctx, req) => {
 *   // Любая ошибка здесь будет автоматически зарепорчена
 *   throw new Error('Something went wrong')
 * })
 */
export const reporterApp = app.use(async (ctx: app.Ctx, req: any, next: any) => {
  try {
    return await next()
  } catch (error) {
    // Репортим ошибку
    await reportError(ctx, {
      error,
      context: `${req.method} ${req.path}`,
      userId: ctx.user?.id,
      additionalData: {
        params: req.params,
        query: req.query,
        // Не логируем весь body (могут быть чувствительные данные)
        bodyKeys: req.body ? Object.keys(req.body) : undefined
      }
    })

    // Пробрасываем ошибку дальше по стеку
    throw error
  }
})
