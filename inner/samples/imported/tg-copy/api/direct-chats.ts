import { requireRealUser, requireAccountRole, findUserById, findUsersByIds, createOrUpdateBotUser } from '@app/auth'
import {
  createFeed,
  getFeedById,
  findFeedParticipants,
  createOrUpdateFeedParticipant,
} from '@app/feed'
import Chats from '../tables/chats.table'
import ChatAgents from '../tables/chat-agents.table'
import { canSendDirectMessage } from './privacy-settings'
import { findAgents } from '@ai-agents/sdk/process'

// Создать или получить существующий личный чат с пользователем
export const apiDirectChatCreateRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/create', async (ctx, req) => {
    requireRealUser(ctx)

    const targetUserId = req.body.userId

    // Проверяем, не пытаемся ли создать чат с самим собой
    if (ctx.user.id === targetUserId) {
      throw new Error('Нельзя создать чат с самим собой')
    }

    // Проверяем настройки приватности целевого пользователя
    const canMessage = await canSendDirectMessage(ctx, ctx.user.id, targetUserId)
    if (!canMessage.allowed) {
      throw new Error(canMessage.reason || 'Нельзя отправить сообщение этому пользователю')
    }

    // Проверяем, существует ли уже личный чат между этими пользователями
    const existingChat = await findExistingDirectChat(ctx, ctx.user.id, targetUserId)
    if (existingChat) {
      return {
        success: true,
        chat: existingChat,
        feedId: existingChat.feedId,
        isNew: false,
      }
    }

    // Получаем данные целевого пользователя для имени чата
    const targetUser = await findUserById(ctx, targetUserId)
    if (!targetUser) {
      throw new Error('Пользователь не найден')
    }

    // Создаем имя чата на основе имени собеседника
    // Для каждого пользователя чат будет иметь разное название
    const chatTitle = targetUser.displayName || 
      (targetUser.firstName ? `${targetUser.firstName} ${targetUser.lastName || ''}`.trim() : null) ||
      targetUser.username ||
      'Пользователь'

    // Создаем feed
    const inboxSubjectId = `direct-${ctx.user.id}-${targetUserId}-${Date.now()}`
    const feed = await createFeed(ctx, {
      title: chatTitle,
      inboxSubjectId,
      inboxUrl: `/tg/chat~${inboxSubjectId}`,
      data: { appId: 'tg' },
    })

    // Создаем запись в таблице чатов
    const chat = await Chats.create(ctx, {
      feedId: feed.id,
      title: chatTitle,
      type: 'direct',
      owner: ctx.user.id,
      isPublic: false,
      description: '',
      inboxSubjectId: inboxSubjectId,
    })

    // Добавляем обоих пользователей как участников
    await createOrUpdateFeedParticipant(ctx, feed, ctx.user, {
      role: 'owner',
      silent: true,
    })

    await createOrUpdateFeedParticipant(ctx, feed, targetUser, {
      role: 'guest',
      silent: true,
    })

    return {
      success: true,
      chat,
      feedId: feed.id,
      isNew: true,
    }
  })

// Получить информацию о личном чате (включая имя собеседника для текущего пользователя)
export const apiDirectChatGetRoute = app.get('/:feedId', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    throw new Error('Чат не найден')
  }

  if (chat.type !== 'direct') {
    throw new Error('Это не личный чат')
  }

  // Получаем участников
  const participants = await findFeedParticipants(ctx, req.params.feedId)
  const isParticipant = participants.some((p) => p.userId === ctx.user.id)

  if (!isParticipant) {
    throw new Error('Нет доступа к этому чату')
  }

  // Находим собеседника
  const otherParticipant = participants.find(p => p.userId !== ctx.user.id)
  let otherUser = null

  if (otherParticipant) {
    const user = await findUserById(ctx, otherParticipant.userId)
    if (user) {
      otherUser = {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.imageUrl,
      }
    }
  }

  return {
    chat,
    otherUser,
    participants,
  }
})

// Вспомогательная функция для поиска существующего личного чата
async function findExistingDirectChat(ctx, userId1: string, userId2: string) {
  // Получаем все личные чаты
  const directChats = await Chats.findAll(ctx, {
    where: {
      type: 'direct',
    },
    limit: 1000,
  })

  // Проверяем каждый чат - является ли он чатом между этими двумя пользователями
  for (const chat of directChats) {
    try {
      const participants = await findFeedParticipants(ctx, chat.feedId)
      const participantIds = participants.map(p => p.userId)

      // Проверяем, что в чате ровно 2 участника и оба нужных пользователя
      if (participantIds.length === 2 &&
          participantIds.includes(userId1) &&
          participantIds.includes(userId2)) {
        return chat
      }
    } catch (e) {
      // Игнорируем ошибки при проверке отдельных чатов
      continue
    }
  }

  return null
}

// Проверить, может ли текущий пользователь написать другому пользователю
export const apiDirectChatCanMessageRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/can-message', async (ctx, req) => {
    requireRealUser(ctx)

    const result = await canSendDirectMessage(ctx, ctx.user.id, req.body.userId)

    return result
  })

// Создать личный чат с агентом (только для админов)
export const apiDirectChatWithAgentRoute = app
  .body((s) => ({
    agentId: s.string(),
    agentKey: s.string().optional(),
    agentName: s.string().optional(),
  }))
  .post('/create-with-agent', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const { agentId, agentKey, agentName } = req.body

    // Проверяем, существует ли уже личный чат с этим агентом для текущего пользователя
    const existingChat = await findExistingDirectChatWithAgent(ctx, ctx.user.id, agentId)
    if (existingChat) {
      return {
        success: true,
        chat: existingChat,
        feedId: existingChat.feedId,
        isNew: false,
      }
    }

    // Получаем данные агента для имени чата
    let chatTitle = agentName || 'Агент'
    try {
      const agents = await findAgents(ctx)
      const agent = agents.find((a: any) => a.id === agentId)
      if (agent) {
        chatTitle = agentName || agent.title || 'Агент'
      }
    } catch (e) {
      // console.log('[apiDirectChatWithAgent] Could not fetch agent details:', e.message)
    }

    // Создаем feed
    const inboxSubjectId = `direct-agent-${ctx.user.id}-${agentId}-${Date.now()}`
    const feed = await createFeed(ctx, {
      title: chatTitle,
      inboxSubjectId,
      inboxUrl: `/tg/chat~${inboxSubjectId}`,
      data: { appId: 'tg' },
    })

    // Создаем запись в таблице чатов
    const chat = await Chats.create(ctx, {
      feedId: feed.id,
      title: chatTitle,
      type: 'direct',
      owner: ctx.user.id,
      isPublic: false,
      description: '',
      inboxSubjectId: inboxSubjectId,
    })

    // Создаем бот-пользователя для агента
    const botUsername = `agent_${agentId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now()}`
    const botUser = await createOrUpdateBotUser(ctx, botUsername, {
      firstName: chatTitle,
      lastName: '',
    })

    // Добавляем агента в таблицу chat_agents
    // Для личного чата агент всегда отвечает на все сообщения (respondTo: 'all')
    await ChatAgents.create(ctx, {
      chat: chat.id,
      agentId: agentId,
      agentKey: agentKey || '',
      agentName: chatTitle,
      botUserId: botUser.id,
      respondTo: 'all', // В личном чате агент отвечает на всё
      respondToMention: 'all',
      isActive: true,
    })

    // Добавляем текущего пользователя как участника (owner)
    await createOrUpdateFeedParticipant(ctx, feed, ctx.user, {
      role: 'owner',
      silent: true,
    })

    // Добавляем бот-пользователя агента как участника
    await createOrUpdateFeedParticipant(ctx, feed, botUser, {
      role: 'guest',
      silent: true,
    })

    return {
      success: true,
      chat,
      feedId: feed.id,
      isNew: true,
    }
  })

// Получить список личных чатов с агентами текущего пользователя
export const apiDirectChatsWithAgentsRoute = app.get('/my-agents', async (ctx, req) => {
  requireRealUser(ctx)

  // Получаем все личные чаты пользователя
  const directChats = await Chats.findAll(ctx, {
    where: {
      type: 'direct',
    },
    limit: 1000,
  })

  // Фильтруем чаты, где есть агенты
  const agentChats = []
  for (const chat of directChats) {
    try {
      // Проверяем, является ли пользователь участником
      const participants = await findFeedParticipants(ctx, chat.feedId)
      const isParticipant = participants.some((p) => p.userId === ctx.user.id)

      if (!isParticipant) continue

      // Проверяем, есть ли в этом чате агент
      const agents = await ChatAgents.findAll(ctx, {
        where: {
          chat: chat.id,
          isActive: true,
        },
      })

      if (agents.length > 0) {
        agentChats.push({
          id: chat.id,
          feedId: chat.feedId,
          title: chat.title,
          agentName: agents[0].agentName,
          agentId: agents[0].agentId,
          createdAt: chat.createdAt,
        })
      }
    } catch (e) {
      continue
    }
  }

  return {
    success: true,
    chats: agentChats,
  }
})

// Вспомогательная функция для поиска существующего личного чата с агентом
async function findExistingDirectChatWithAgent(ctx, userId: string, agentId: string) {
  // Получаем все личные чаты пользователя
  const directChats = await Chats.findAll(ctx, {
    where: {
      type: 'direct',
    },
    limit: 1000,
  })

  // Проверяем каждый чат
  for (const chat of directChats) {
    try {
      // Проверяем, есть ли в этом чате агент с указанным agentId
      const agents = await ChatAgents.findAll(ctx, {
        where: {
          chat: chat.id,
          agentId: agentId,
          isActive: true,
        },
      })

      if (agents.length > 0) {
        // Проверяем, что пользователь является участником этого чата
        const participants = await findFeedParticipants(ctx, chat.feedId)
        const isParticipant = participants.some((p) => p.userId === userId)

        if (isParticipant) {
          return chat
        }
      }
    } catch (e) {
      continue
    }
  }

  return null
}
