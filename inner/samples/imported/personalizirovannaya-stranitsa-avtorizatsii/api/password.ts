import { findIdentities, normalizeIdentityKey } from '@app/auth'
import * as forge from '@npm/node-forge'

// @shared-route
export const getPasswordHashRoute = app
  .post('/get-password-hash')
  .body((s) => ({
    // По чему происходит авторизация
    it: s.enum(['Phone', 'Email']),
    // Само значение (почта или телефон пользователя)
    ik: s.string(),
    // Введённый пользователем пароль
    pwd: s.string()
  }))
  .handle(async (ctx, req) => {
    const { it, ik, pwd } = req.body

    const normalizedKey = normalizeIdentityKey(it, ik)
    const [identity] = await findIdentities(ctx, {
      where: {
        type: it,
        key: normalizedKey,
        isBlocked: false
      },
      limit: 1
    })

    let userIdSalt: string

    if (!identity) {
      // Если пользователь не найден, используем пустую соль
      userIdSalt = ''
    } else {
      // Используем userId как основу для соли
      const salt = forge.md.sha256.create()
      salt.update(identity.userId)
      userIdSalt = salt.digest().toHex()
    }

    // Создаем хеш пароля с солью
    const md = forge.md.sha256.create()
    md.update(pwd + userIdSalt)
    const hash = md.digest().toHex()

    return hash
  })
