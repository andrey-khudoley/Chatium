import { requireRealUser, findUsersByIds } from '@app/auth'
import { findFeedMessages } from '@app/feed'

// Поиск сообщений внутри конкретного чата
export const apiChatSearchRoute = app
  .body((s) => ({
    query: s.string(),
  }))
  .post('/:feedId/search', async (ctx, req) => {
    requireRealUser(ctx)

    const { feedId } = req.params
    const { query } = req.body
    const searchQuery = query.toLowerCase().trim()

    if (!searchQuery || searchQuery.length < 2) {
      return { messages: [] }
    }

    // Загружаем все сообщения чата (до 1000 последних)
    const allMessages = []
    const seenIds = new Set() // Дедупликация по ID
    let hasMore = true
    let beforeId = null
    const maxMessages = 1000

    while (hasMore && allMessages.length < maxMessages) {
      const options = {
        mode: 'head',
        limit: 100,
      }
      if (beforeId) {
        options.beforeId = beforeId
      }

      const messages = await findFeedMessages(ctx, feedId, options)
      
      if (messages.length === 0) break
      
      // Фильтруем дубликаты и добавляем только новые сообщения
      const newMessages = messages.filter(m => !seenIds.has(m.id))
      if (newMessages.length === 0) break // Защита от бесконечного цикла
      
      // Отмечаем ID как использованные
      newMessages.forEach(m => seenIds.add(m.id))
      
      // Сообщения приходят от старых к новым, добавляем в конец
      allMessages.push(...newMessages)
      
      hasMore = messages.length === 100 && allMessages.length < maxMessages
      if (hasMore) {
        // Берем ID первого сообщения (самое старое) для следующей загрузки
        beforeId = messages[0].id
      }
    }

    // Фильтруем по тексту
    const matchingMessages = allMessages.filter(m => 
      m.text && m.text.toLowerCase().includes(searchQuery)
    )

    // Обогащаем данными авторов
    const authorIds = [...new Set(
      matchingMessages.map(m => {
        if (!m.createdBy) return null
        if (typeof m.createdBy === 'string') return m.createdBy
        if (typeof m.createdBy === 'object' && m.createdBy?.id) return m.createdBy.id
        return null
      }).filter(Boolean)
    )]

    let usersMap = new Map()
    if (authorIds.length > 0) {
      const users = await findUsersByIds(ctx, authorIds)
      usersMap = new Map(users.map(u => [u.id, u]))
    }

    const enrichedMessages = matchingMessages.map(m => {
      const authorId = typeof m.createdBy === 'object' ? m.createdBy?.id : m.createdBy
      const user = usersMap.get(authorId)
      return {
        id: m.id,
        text: m.text,
        createdAt: m.createdAt,
        author: user ? {
          id: user.id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
      }
    })

    // Сортируем по дате (новые первые)
    const sortedMessages = enrichedMessages
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)

    return { messages: sortedMessages }
  })