import { updateUser } from '@app/users'
import { requireRealUser } from '@app/auth'

// @shared-route
export const updateProfileRoute = app.post('/update', async (ctx, req) => {
  requireRealUser(ctx)

  try {
    // Обновляем основную информацию пользователя (firstName, lastName)
    if (req.body.firstName !== undefined || req.body.lastName !== undefined) {
      await updateUser(ctx, ctx.user.id, {
        firstName: req.body.firstName || ctx.user.firstName,
        lastName: req.body.lastName || ctx.user.lastName
      })
    }

    // Обновляем дополнительную информацию (gender, birthday)
    const extendedInfo = {}
    if (req.body.gender !== undefined) {
      extendedInfo.gender =
        req.body.gender && req.body.gender.trim() !== '' ? req.body.gender : null
    }
    if (req.body.birthday !== undefined) {
      extendedInfo.birthday =
        req.body.birthday && req.body.birthday.trim() !== '' ? req.body.birthday : null
    }

    if (Object.keys(extendedInfo).length > 0) {
      await ctx.user.updateExtendedInfo(ctx, extendedInfo)
    }

    return { success: true }
  } catch (error) {
    console.error('Profile update error:', error)
    return {
      success: false,
      error: 'Произошла ошибка при обновлении профиля: ' + error.message,
      extendedInfo
    }
  }
})
