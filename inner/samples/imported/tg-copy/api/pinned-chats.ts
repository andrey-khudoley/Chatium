import { requireRealUser } from '@app/auth'
import UserPinnedChats from '../tables/user-pinned-chats.table'

// Получить список закрепленных чатов пользователя
export const apiPinnedChatsListRoute = app.get('/list', async (ctx, req) => {
  requireRealUser(ctx)

  const pinnedChats = await UserPinnedChats.findAll(ctx, {
    where: {
      userId: ctx.user.id,
    },
    order: [{ sortOrder: 'asc' }],
    limit: 1000,
  })

  return {
    pinnedChats: pinnedChats.map(p => ({
      id: p.id,
      feedId: p.feedId,
      sortOrder: p.sortOrder,
    })),
  }
})

// Закрепить чат
export const apiPinnedChatsPinRoute = app.post('/pin', async (ctx, req) => {
  requireRealUser(ctx)

  const { feedId } = req.body

  // Проверяем, не закреплен ли уже
  const existing = await UserPinnedChats.findOneBy(ctx, {
    userId: ctx.user.id,
    feedId,
  })

  if (existing) {
    return { success: true, pinnedChat: existing }
  }

  // Находим максимальный порядок
  const allPinned = await UserPinnedChats.findAll(ctx, {
    where: { userId: ctx.user.id },
    order: [{ sortOrder: 'desc' }],
    limit: 1,
  })

  const maxOrder = allPinned.length > 0 ? allPinned[0].sortOrder : 0

  const pinnedChat = await UserPinnedChats.create(ctx, {
    userId: ctx.user.id,
    feedId,
    sortOrder: maxOrder + 1,
  })

  return { success: true, pinnedChat }
})

// Открепить чат
export const apiPinnedChatsUnpinRoute = app.post('/unpin', async (ctx, req) => {
  requireRealUser(ctx)

  const { feedId } = req.body

  const existing = await UserPinnedChats.findOneBy(ctx, {
    userId: ctx.user.id,
    feedId,
  })

  if (existing) {
    await UserPinnedChats.delete(ctx, existing.id)
  }

  return { success: true }
})

// Изменить порядок закрепленных чатов (drag-n-drop)
export const apiPinnedChatsReorderRoute = app.post('/reorder', async (ctx, req) => {
  requireRealUser(ctx)

  const { feedIds } = req.body // Массив feedId в новом порядке

  if (!Array.isArray(feedIds)) {
    throw new Error('feedIds должен быть массивом')
  }

  // Обновляем порядок для каждого чата
  for (let i = 0; i < feedIds.length; i++) {
    const existing = await UserPinnedChats.findOneBy(ctx, {
      userId: ctx.user.id,
      feedId: feedIds[i],
    })

    if (existing) {
      await UserPinnedChats.update(ctx, {
        id: existing.id,
        sortOrder: i,
      })
    }
  }

  return { success: true }
})

// Проверить, закреплен ли чат
export const apiPinnedChatsCheckRoute = app.post('/check', async (ctx, req) => {
  requireRealUser(ctx)

  const { feedId } = req.body

  const existing = await UserPinnedChats.findOneBy(ctx, {
    userId: ctx.user.id,
    feedId,
  })

  return {
    isPinned: !!existing,
    sortOrder: existing?.sortOrder,
  }
})
