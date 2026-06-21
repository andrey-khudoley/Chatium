import { requireAccountRole } from '@app/auth'
import { getOrCreateTransport } from '@sender/sdk'
import { sendMessageToChatTool } from '@sender/sdk'
import { getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'

import { getWorkspaceTransportIdentity } from '../transport/hook'

// @shared-route
export const apiCreateTransportRoute = app.post('/create-transport', async (ctx) => {
  await requireAccountRole(ctx, 'Admin')

  const transportIdentity = await getWorkspaceTransportIdentity(ctx)

  const createTransportResponse = await getOrCreateTransport(ctx, {
    id: transportIdentity.id,
    key: transportIdentity.key,
    title: transportIdentity.title,
    description: transportIdentity.description
  })

  if (!createTransportResponse.success) {
    return createTransportResponse
  }

  const channel = createTransportResponse.transport

  await getOrCreateAgentForWorkspace(ctx, transportIdentity.key, {
    title: transportIdentity.title,
    instructions: 'Ты отвечаешь на все сообщения, которые пишет пользователь',
    enabledTools: [sendMessageToChatTool],
    linkToChannelId: channel.id
  })

  return createTransportResponse
})
