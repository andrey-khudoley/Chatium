import { requireAccountRole, createOrUpdateBotUser } from '@app/auth'
import ChatAgents from '../tables/chat-agents.table'
import Chats from '../tables/chats.table'
import { createOrUpdateFeedParticipant, getFeedById } from '@app/feed'

// Миграция: добавить botUserId для существующих агентов
export const apiAgentsMigrationRoute = app.post('/migrate', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const agents = await ChatAgents.findAll(ctx, {
    limit: 1000,
  })

  const results = []
  let migrated = 0
  let errors = 0

  for (const agent of agents) {
    try {
      // Если уже есть botUserId - пропускаем
      if (agent.botUserId) {
        results.push({ agentId: agent.id, status: 'skipped', reason: 'already has botUserId' })
        continue
      }

      // Получаем чат
      const chat = await Chats.findById(ctx, agent.chat.id)
      if (!chat) {
        results.push({ agentId: agent.id, status: 'error', reason: 'chat not found' })
        errors++
        continue
      }

      // Создаем бот-пользователя для агента
      const botUser = await createOrUpdateBotUser(ctx, `agent-${agent.agentId}`, {
        firstName: agent.agentName || 'Агент',
        lastName: '',
      })

      // Обновляем запись агента
      await ChatAgents.update(ctx, {
        id: agent.id,
        botUserId: botUser.id,
      })

      // Добавляем бот-пользователя как участника чата
      const feed = await getFeedById(ctx, chat.feedId)
      if (feed) {
        await createOrUpdateFeedParticipant(ctx, feed, botUser, {
          role: 'guest',
          silent: true,
        })
      }

      results.push({ 
        agentId: agent.id, 
        status: 'migrated', 
        botUserId: botUser.id,
        chatId: chat.id 
      })
      migrated++

    } catch (error) {
      results.push({ agentId: agent.id, status: 'error', reason: error.message })
      errors++
    }
  }

  return {
    success: true,
    stats: {
      total: agents.length,
      migrated,
      errors,
      skipped: agents.length - migrated - errors,
    },
    results,
  }
})
