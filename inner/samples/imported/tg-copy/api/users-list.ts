import { findUsers, requireAccountRole } from '@app/auth'

/**
 * API для получения списка всех пользователей
 * Доступно только для Staff, Admin и Developer
 */
export const apiUsersListRoute = app.get('/', async (ctx, req) => {
  // Проверяем роль пользователя - только Staff, Admin и Developer
  requireAccountRole(ctx, 'Staff')

  try {
    // Получаем всех пользователей
    const users = await findUsers(ctx, {
      where: {
        type: 'Real'
      },
      limit: 1000
    })

    // Форматируем данные пользователей
    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayName: user.displayName,
      email: user.confirmedEmail,
      phone: user.confirmedPhone,
      accountRole: user.accountRole,
      type: user.type,
      hasAvatar: user.hasImage,
      imageHash: user.imageHash,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
    }))

    return {
      success: true,
      users: formattedUsers,
      totalCount: formattedUsers.length
    }

  } catch (error) {
    ctx.account.log('Error fetching users list', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: 'Ошибка при получении списка пользователей' }
  }
})
