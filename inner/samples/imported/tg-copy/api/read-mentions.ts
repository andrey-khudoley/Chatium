import ReadMentions from "../tables/read-mentions.table"

// Получить список прочитанных упоминаний для чата
export const apiReadMentionsGetRoute = app.get('/:feedId', async (ctx, req) => {
  const { feedId } = req.params
  const userId = ctx.user?.id

  if (!userId) {
    return { mentions: [] }
  }

  const mentions = await ReadMentions.findAll(ctx, {
    where: {
      userId,
      feedId,
    },
    limit: 1000,
  })

  return {
    mentions: mentions.map(m => ({
      messageId: m.messageId,
      readAt: m.readAt,
    })),
  }
})

// Отметить упоминания как прочитанные
export const apiReadMentionsMarkRoute = app.post('/:feedId/mark', async (ctx, req) => {
  const { feedId } = req.params
  const { messageIds } = req.body
  const userId = ctx.user?.id

  if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) {
    return { success: false, error: 'Invalid request' }
  }

  const results = []

  for (const messageId of messageIds) {
    // Проверяем, есть ли уже запись
    const existing = await ReadMentions.findOneBy(ctx, {
      userId,
      feedId,
      messageId,
    })

    if (existing) {
      // Обновляем дату прочтения
      await ReadMentions.update(ctx, {
        id: existing.id,
        readAt: new Date(),
      })
      results.push({ messageId, status: 'updated' })
    } else {
      // Создаем новую запись
      await ReadMentions.create(ctx, {
        userId,
        feedId,
        messageId,
        readAt: new Date(),
      })
      results.push({ messageId, status: 'created' })
    }
  }

  return { success: true, results }
})