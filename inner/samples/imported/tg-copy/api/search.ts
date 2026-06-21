import { requireRealUser, findUsersByIds } from '@app/auth'
import { findFeedMessages, findFeedParticipants } from '@app/feed'
import Chats from '../tables/chats.table'

// Вспомогательная функция для получения ID чатов пользователя (включая публичные и платные)
async function getUserChatIds(ctx) {
  const allChats = await Chats.findAll(ctx, {
    order: [{ updatedAt: 'desc' }],
    limit: 1000,
  })

  const chatsWithAccess = await Promise.all(
    allChats.map(async (chat) => {
      try {
        const participants = await findFeedParticipants(ctx, chat.feedId)
        const isParticipant = participants.some((p) => p.userId === ctx.user.id)
        const isOwnerOrAdmin = participants.some((p) => p.userId === ctx.user.id && (p.role === 'owner' || p.role === 'admin'))
        
        // Доступ есть если: пользователь участник ИЛИ чат публичный
        const hasAccess = isParticipant || chat.isPublic
        
        // Для платных чатов без доступа показываем в поиске, но с флагом requiresSubscription
        const requiresSubscription = chat.isPaid && !hasAccess && !isOwnerOrAdmin
        
        return { 
          chat, 
          hasAccess,
          isMember: isParticipant,
          requiresSubscription,
          isOwnerOrAdmin,
        }
      } catch (e) {
        return { chat, hasAccess: false, isMember: false, requiresSubscription: false, isOwnerOrAdmin: false }
      }
    })
  )

  // Возвращаем все чаты, кроме тех к которым нет доступа (но включаем платные без подписки)
  return chatsWithAccess
    .filter(c => c.hasAccess || c.requiresSubscription || c.isOwnerOrAdmin)
    .map(c => ({ 
      ...c.chat, 
      isMember: c.isMember,
      requiresSubscription: c.requiresSubscription,
      isOwnerOrAdmin: c.isOwnerOrAdmin,
    }))
}

// Обогащение сообщений данными авторов
async function enrichMessagesWithAuthors(ctx, messages) {
  const authorIds = [...new Set(
    messages.map(m => {
      if (!m.createdBy) return null
      if (typeof m.createdBy === 'string') return m.createdBy
      if (typeof m.createdBy === 'object' && m.createdBy?.id) return m.createdBy.id
      return null
    }).filter(Boolean)
  )]

  if (authorIds.length === 0) {
    return messages.map(m => ({ ...m, author: null }))
  }

  const users = await findUsersByIds(ctx, authorIds)
  const usersMap = new Map(users.map(u => [u.id, u]))

  return messages.map(m => {
    const authorId = typeof m.createdBy === 'object' ? m.createdBy?.id : m.createdBy
    const user = usersMap.get(authorId)
    return {
      ...m,
      author: user ? {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
      } : null,
    }
  })
}

export const apiSearchRoute = app
  .body((s) => ({
    query: s.string(),
    type: s.string().optional(), // 'all' | 'chats' | 'messages'
  }))
  .post('/search', async (ctx, req) => {
    requireRealUser(ctx)

    const { query, type = 'all' } = req.body
    const searchQuery = query.toLowerCase().trim()

    if (!searchQuery || searchQuery.length < 2) {
      return {
        chats: [],
        messages: [],
      }
    }

    const userChats = await getUserChatIds(ctx)
    const chatIds = userChats.map(c => c.feedId)

    let chatResults = []
    let messageResults = []

    // Поиск по чатам
    if (type === 'all' || type === 'chats') {
      chatResults = userChats
        .filter(chat => 
          chat.title.toLowerCase().includes(searchQuery) ||
          (chat.description && chat.description.toLowerCase().includes(searchQuery))
        )
        .map(chat => ({
          id: chat.id,
          feedId: chat.feedId,
          title: chat.title,
          description: chat.description,
          type: chat.type,
          updatedAt: chat.updatedAt,
          isPublic: chat.isPublic,
          isMember: chat.isMember,
          isPaid: chat.isPaid,
          requiresSubscription: chat.requiresSubscription,
        }))
        .slice(0, 20)
    }

    // Поиск по сообщениям
    if (type === 'all' || type === 'messages') {
      // Для каждого чата ищем сообщения
      const messagePromises = chatIds.map(async (feedId) => {
        try {
          // Получаем последние 100 сообщений из чата
          const messages = await findFeedMessages(ctx, feedId, {
            mode: 'tail',
            limit: 100,
          })

          // Фильтруем по тексту
          const matchingMessages = messages.filter(m => 
            m.text && m.text.toLowerCase().includes(searchQuery)
          )

          // Получаем инфо о чате
          const chatInfo = userChats.find(c => c.feedId === feedId)

          return matchingMessages.map(m => ({
            ...m,
            chatId: chatInfo?.id,
            chatTitle: chatInfo?.title,
            chatFeedId: feedId,
          }))
        } catch (e) {
          return []
        }
      })

      const allMatchingMessages = (await Promise.all(messagePromises)).flat()
      
      // Обогащаем данными авторов
      const enrichedMessages = await enrichMessagesWithAuthors(ctx, allMatchingMessages)
      
      // Сортируем по дате (новые первые) и ограничиваем результат
      messageResults = enrichedMessages
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50)
        .map(m => ({
          id: m.id,
          text: m.text,
          createdAt: m.createdAt,
          author: m.author,
          chatId: m.chatId,
          chatTitle: m.chatTitle,
          chatFeedId: m.chatFeedId,
        }))
    }

    return {
      chats: chatResults,
      messages: messageResults,
      totalCount: chatResults.length + messageResults.length,
    }
  })

// Быстрый поиск чатов (для автодополнения)
export const apiQuickSearchChatsRoute = app
  .body((s) => ({
    query: s.string(),
  }))
  .post('/quick-search', async (ctx, req) => {
    requireRealUser(ctx)

    const searchQuery = req.body.query.toLowerCase().trim()

    if (!searchQuery) {
      return { chats: [] }
    }

    const userChats = await getUserChatIds(ctx)

    const results = userChats
      .filter(chat => 
        chat.title.toLowerCase().includes(searchQuery) ||
        (chat.description && chat.description.toLowerCase().includes(searchQuery))
      )
      .map(chat => ({
        id: chat.id,
        feedId: chat.feedId,
        title: chat.title,
        type: chat.type,
        isPaid: chat.isPaid,
        requiresSubscription: chat.requiresSubscription,
      }))
      .slice(0, 10)

    return { chats: results }
  })
