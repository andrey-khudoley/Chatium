import { requireRealUser } from '@app/auth'
import { updateUser } from '@app/users'

export const apiProfileGetRoute = app.get('/', async (ctx, req) => {
  requireRealUser(ctx)

  return {
    user: {
      id: ctx.user.id,
      displayName: ctx.user.displayName,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      username: ctx.user.username,
      email: ctx.user.confirmedEmail,
      phone: ctx.user.confirmedPhone,
      gender: ctx.user.gender,
      birthday: ctx.user.birthday,
      imageUrl: ctx.user.imageUrl,
      accountRole: ctx.user.accountRole
    }
  }
})

export const apiProfileUpdateRoute = app.post('/update', async (ctx, req) => {
  requireRealUser(ctx)

  const { firstName, lastName, username, gender, birthday } = req.body

  // Обновляем базовую информацию через updateUser
  if (firstName !== undefined || lastName !== undefined) {
    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || ctx.user.firstName
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || ctx.user.lastName

    await updateUser(ctx, ctx.user.id, updateData)
  }

  // Обновляем username отдельно (требует отдельного метода)
  if (username !== undefined) {
    const trimmedUsername = username?.trim() || null
    const currentUsername = ctx.user.username || null

    // Если username не изменился (null и пустая строка считаются одинаковыми), пропускаем
    if (trimmedUsername === currentUsername) {
      // Username не изменился, ничего не делаем
    } else if (!trimmedUsername) {
      // Пользователь удаляет username - устанавливаем null
      try {
        await ctx.user.updateUsername(ctx, null)
      } catch (error: any) {
        ctx.account.log('Username remove error', {
          level: 'warn',
          json: { error: error?.message || String(error) }
        })
        return {
          success: false,
          error: 'username_remove_failed',
          message: 'Не удалось удалить имя пользователя'
        }
      }
    } else {
      // Валидация формата username
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        return {
          success: false,
          error: 'invalid_username',
          message:
            'Имя пользователя может содержать только буквы латинского алфавита, цифры и знак подчёркивания'
        }
      }

      if (trimmedUsername.length < 3) {
        return {
          success: false,
          error: 'username_too_short',
          message: 'Имя пользователя должно содержать минимум 3 символа'
        }
      }

      if (trimmedUsername.length > 32) {
        return {
          success: false,
          error: 'username_too_long',
          message: 'Имя пользователя не может превышать 32 символа'
        }
      }

      try {
        await ctx.user.updateUsername(ctx, trimmedUsername)
      } catch (error: any) {
        // Извлекаем сообщение об ошибке из разных возможных полей
        const errorMessage =
          error?.message || error?.error?.message || error?.errors?.[0]?.message || String(error)
        const errorStr = JSON.stringify(error)

        // Логируем ошибку для отладки
        ctx.account.log('Username update error', {
          level: 'warn',
          json: {
            username: trimmedUsername,
            currentUsername: ctx.user.username,
            errorMessage,
            errorObj: error,
            errorStr
          }
        })

        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('already taken') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('already in use') ||
          errorStr.includes('already exists') ||
          errorStr.includes('duplicate')
        ) {
          return {
            success: false,
            error: 'username_taken',
            message: `Имя пользователя "@${trimmedUsername}" уже занято. Попробуйте другое.`
          }
        }

        if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
          return {
            success: false,
            error: 'invalid_username',
            message: 'Недопустимый формат имени пользователя'
          }
        }

        // Если неизвестная ошибка - возвращаем с деталями
        return {
          success: false,
          error: 'unknown_error',
          message:
            errorMessage !== 'undefined' && errorMessage !== 'Error'
              ? errorMessage
              : 'Не удалось сохранить имя пользователя. Попробуйте позже.'
        }
      }
    }
  }

  // Обновляем расширенную информацию
  await ctx.user.updateExtendedInfo(ctx, {
    gender: gender || ctx.user.gender,
    birthday: birthday || ctx.user.birthday
  })

  return { success: true }
})

export const apiProfileUpdateAvatarRoute = app.post('/avatar', async (ctx, req) => {
  requireRealUser(ctx)

  const { imageHash } = req.body

  if (!imageHash) {
    throw new Error('Image hash is required')
  }

  await ctx.user.updateExtendedInfo(ctx, {
    imageHash
  })

  return { success: true, imageUrl: ctx.user.imageUrl }
})
