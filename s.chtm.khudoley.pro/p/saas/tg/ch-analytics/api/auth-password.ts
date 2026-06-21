// @shared-route

import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

export const apiGetPasswordHashRoute = app.post('/password-hash', async (ctx, req) => {
  try {
    // Применяем уровень логирования из настроек
    await applyDebugLevel(ctx, 'api/auth-password')
    Debug.info(ctx, '[api/auth-password] Начало обработки запроса на получение хеша пароля')

    const body =
      req.body && Object.keys(req.body).length > 0
        ? req.body
        : (req as any).it || (req as any).ik || (req as any).pwd
          ? req
          : {}
    const { it, ik, pwd } = body as any

    Debug.info(
      ctx,
      `[api/auth-password] Параметры запроса: it=${it ? 'present' : 'missing'}, ik=${ik ? 'present' : 'missing'}, pwd=${pwd ? 'present' : 'missing'}`
    )

    if (!it || !ik || !pwd) {
      Debug.warn(ctx, '[api/auth-password] Отсутствуют обязательные параметры (it, ik, pwd)')
      return { success: false, error: 'Missing parameters' }
    }

    Debug.info(ctx, '[api/auth-password] Загрузка модуля авторизации')
    const authProvider = await import('@app/auth/provider')
    const getPasswordHashWithSalt = (authProvider as any).getPasswordHashWithSalt

    if (typeof getPasswordHashWithSalt !== 'function') {
      Debug.warn(ctx, '[api/auth-password] Функция getPasswordHashWithSalt недоступна')
      return { success: false, error: 'Password auth not available' }
    }

    Debug.info(ctx, '[api/auth-password] Вычисление хеша пароля')
    const hash = await getPasswordHashWithSalt(ctx, it, ik, pwd)
    Debug.info(ctx, '[api/auth-password] Хеш пароля успешно вычислен')

    return { success: true, hash }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/auth-password] Ошибка при получении хеша пароля: ${error.message}`,
      'E_GET_PASSWORD_HASH'
    )
    Debug.error(ctx, `[api/auth-password] Stack trace: ${error.stack || 'N/A'}`)
    return { success: false, error: error.message }
  }
})
