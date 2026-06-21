import { requireRealUser, findUsersByIds } from '@app/auth'
import BlockedUsers from '../tables/blocked-users.table'

// Получить список заблокированных пользователей
export const apiBlockedUsersListRoute = app.get('/list', async (ctx, req) => {
  requireRealUser(ctx)

  const blocked = await BlockedUsers.findAll(ctx, {
    where: {
      userId: ctx.user.id,
    },
    order: [{ createdAt: 'desc' }],
  })

  // Получаем данные о заблокированных пользователях
  const blockedUserIds = blocked.map(b => b.blockedUserId)
  const users = await findUsersByIds(ctx, blockedUserIds)
  const usersMap = new Map(users.map(u => [u.id, u]))

  return {
    blockedUsers: blocked.map(b => {
      const user = usersMap.get(b.blockedUserId)
      return {
        id: b.id,
        blockedUserId: b.blockedUserId,
        reason: b.reason,
        createdAt: b.createdAt,
        user: user ? {
          id: user.id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.imageUrl,
        } : null,
      }
    }),
  }
})

// Заблокировать пользователя
export const apiBlockedUsersBlockRoute = app
  .body((s) => ({
    userId: s.string(),
    reason: s.string().optional(),
  }))
  .post('/block', async (ctx, req) => {
    requireRealUser(ctx)

    const { userId, reason } = req.body

    // Нельзя заблокировать самого себя
    if (userId === ctx.user.id) {
      throw new Error('Нельзя заблокировать самого себя')
    }

    // Проверяем, не заблокирован ли уже
    const existing = await BlockedUsers.findOneBy(ctx, {
      userId: ctx.user.id,
      blockedUserId: userId,
    })

    if (existing) {
      throw new Error('Пользователь уже заблокирован')
    }

    const blocked = await BlockedUsers.create(ctx, {
      userId: ctx.user.id,
      blockedUserId: userId,
      reason: reason || '',
    })

    return {
      success: true,
      blockedUser: blocked,
    }
  })

// Разблокировать пользователя
export const apiBlockedUsersUnblockRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/unblock', async (ctx, req) => {
    requireRealUser(ctx)

    const { userId } = req.body

    const existing = await BlockedUsers.findOneBy(ctx, {
      userId: ctx.user.id,
      blockedUserId: userId,
    })

    if (!existing) {
      throw new Error('Пользователь не найден в чёрном списке')
    }

    await BlockedUsers.delete(ctx, existing.id)

    return {
      success: true,
    }
  })

// Проверить, заблокирован ли пользователь
export const apiBlockedUsersCheckRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/check', async (ctx, req) => {
    requireRealUser(ctx)

    const { userId } = req.body

    const existing = await BlockedUsers.findOneBy(ctx, {
      userId: ctx.user.id,
      blockedUserId: userId,
    })

    return {
      isBlocked: !!existing,
    }
  })
