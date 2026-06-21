// @shared-route
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

export const apiGetPasswordHashRoute = app.post('/password-hash', async (ctx, req) => {
  await applyDebugLevel(ctx, 'password:hash')

  try {
    // Поддерживаем оба способа передачи параметров: через req.body (HTTP) и напрямую (внутренний вызов .run())
    // При вызове .run(ctx, params) параметры могут попадать напрямую в req, а не в req.body
    const body =
      req.body && Object.keys(req.body).length > 0
        ? req.body
        : req.it || req.ik || req.pwd
          ? req
          : {}
    const { it, ik, pwd } = body

    if (!it || !ik || !pwd) {
      Debug.warn(ctx, '[password:hash] отсутствуют параметры it/ik/pwd')
      return {
        success: false,
        error: 'Missing parameters: it, ik, pwd'
      }
    }

    // Проверяем доступность функции getPasswordHashWithSalt
    let getPasswordHashWithSalt
    Debug.info(ctx, '[password:hash] импортируем провайдер авторизации')
    try {
      const authProvider = await import('@app/auth/provider')
      getPasswordHashWithSalt = authProvider.getPasswordHashWithSalt
    } catch (importError) {
      Debug.error(
        ctx,
        `[password:hash] не удалось импортировать провайдер: ${importError instanceof Error ? importError.message : importError}`
      )
      return {
        success: false,
        error: 'getPasswordHashWithSalt function is not available'
      }
    }

    if (typeof getPasswordHashWithSalt !== 'function') {
      Debug.warn(ctx, '[password:hash] getPasswordHashWithSalt не является функцией')
      return {
        success: false,
        error: 'getPasswordHashWithSalt is not a function'
      }
    }

    const hash = await getPasswordHashWithSalt(ctx, it, ik, pwd)
    Debug.info(ctx, '[password:hash] хеш успешно рассчитан')

    return {
      success: true,
      hash
    }
  } catch (error: any) {
    Debug.error(ctx, `Failed to get password hash: ${error?.message || error}`)
    return {
      success: false,
      error: error.message
    }
  }
})
