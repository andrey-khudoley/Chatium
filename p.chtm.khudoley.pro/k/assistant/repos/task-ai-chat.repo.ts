import { createFeed, deleteFeed } from '@app/feed'
import { runWithExclusiveLock } from '@app/sync'
import TaskAiChatFeeds from '../tables/task-ai-chat-feeds.table'
import TaskProjects from '../tables/task-projects.table'

/**
 * Проверка, что проект принадлежит пользователю.
 */
export async function assertProjectOwnedByUser(ctx: app.Ctx, userId: string, projectId: string): Promise<void> {
  const project = await TaskProjects.findOneBy(ctx, { id: projectId, userId })
  if (!project) {
    throw new Error('Проект не найден')
  }
}

export async function findFeedMappingByFeedId(
  ctx: app.Ctx,
  feedId: string,
  userId: string
): Promise<typeof TaskAiChatFeeds.T | null> {
  return TaskAiChatFeeds.findOneBy(ctx, { feedId, userId })
}

/**
 * Возвращает или создаёт запись и фид для чата AI по паре пользователь + проект.
 */
export async function getOrCreateAiChatFeed(
  ctx: app.Ctx,
  userId: string,
  projectId: string
): Promise<{ feedId: string; rowId: string }> {
  await assertProjectOwnedByUser(ctx, userId, projectId)

  return runWithExclusiveLock(ctx, `task-ai-chat-feed:${userId}:${projectId}`, async () => {
    const existing = await TaskAiChatFeeds.findOneBy(ctx, { userId, projectId })
    if (existing) {
      return { feedId: existing.feedId, rowId: existing.id }
    }

    const feed = await createFeed(ctx, {
      title: 'Чат с AI (задачи)'
    })

    const row = await TaskAiChatFeeds.create(ctx, {
      userId,
      projectId,
      feedId: feed.id
    })

    return { feedId: feed.id, rowId: row.id }
  })
}

/**
 * Удаляет фид и создаёт новый (сброс истории чата).
 */
export async function resetAiChatFeed(ctx: app.Ctx, userId: string, projectId: string): Promise<{ feedId: string }> {
  await assertProjectOwnedByUser(ctx, userId, projectId)

  return runWithExclusiveLock(ctx, `task-ai-chat-feed:${userId}:${projectId}`, async () => {
    const existing = await TaskAiChatFeeds.findOneBy(ctx, { userId, projectId })
    if (existing) {
      try {
        await deleteFeed(ctx, existing.feedId)
      } catch {
        // фид мог быть уже удалён
      }
    }

    const feed = await createFeed(ctx, {
      title: 'Чат с AI (задачи)'
    })

    if (existing) {
      await TaskAiChatFeeds.update(ctx, { id: existing.id, feedId: feed.id })
    } else {
      await TaskAiChatFeeds.create(ctx, {
        userId,
        projectId,
        feedId: feed.id
      })
    }

    return { feedId: feed.id }
  })
}
