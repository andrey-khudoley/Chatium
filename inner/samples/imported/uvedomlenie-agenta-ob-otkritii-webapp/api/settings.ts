import { requireAccountRole } from '@app/auth'
import { findAgents, getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'
import { getChannels } from '@sender/sdk'
import SettingsTable from '../tables/settings.table'
import { sendMessageToChatTool } from '@sender/sdk'

// @shared-route
export const apiGetChannelsRoute = app.get('/channels').handle(async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const channels = await getChannels(ctx)

  return channels.map((channel) => ({
    id: channel.id,
    title: channel.title,
    source: channel.source,
    username: channel.externalUsername || channel.username || ''
  }))
})

// @shared-route
export const apiGetAgentsRoute = app.get('/agents').handle(async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const agents = await findAgents(ctx)
  return agents.map((agent) => ({
    id: agent.id,
    title: agent.title
  }))
})

// @shared-route
export const apiGetSettingsRoute = app.get('/settings').handle(async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const settings = await SettingsTable.getSingleton(ctx)
  return settings
})

// @shared-route
export const apiSaveSettingsRoute = app.post('/settings').handle(async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const {
    agentId,
    agentTitle,
    onlyFirstVisit,
    messageTemplate,
    wakeAgent,
    channelId,
    channelTitle
  } = req.body

  return await SettingsTable.updateSingleton(ctx, {
    agentId,
    agentTitle,
    onlyFirstVisit: onlyFirstVisit ?? false,
    messageTemplate:
      messageTemplate || 'Пользователь открыл WebApp.\n\nДанные пользователя:\n[userData]',
    wakeAgent: wakeAgent ?? true,
    channelId,
    channelTitle
  })
})

// @shared-route
export const apiCreateAgentRoute = app.post('/create-agent').handle(async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const { title, instructions } = req.body

  if (!title) {
    throw new Error('Название агента обязательно')
  }

  const agent = await getOrCreateAgentForWorkspace(ctx, 'webappOpenedAgent', {
    title,
    instructions: instructions || 'Ты агент, который обрабатывает события открытия WebApp.',
    enabledTools: [sendMessageToChatTool]
  })

  return {
    id: agent.id,
    title: agent.title
  }
})
