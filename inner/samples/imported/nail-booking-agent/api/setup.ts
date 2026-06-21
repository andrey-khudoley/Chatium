import { requireAccountRole } from '@app/auth'
import { getOrCreateTransport } from '@sender/sdk'
import { sendMessageToChatTool } from '@sender/sdk'
import { getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'

import { getWorkspaceTransportIdentity, findWorkspaceTransport } from '../transport/hook'
import { getServicesTool } from '../tools/getServices'
import { getScheduleTool } from '../tools/getSchedule'
import { bookServiceTool } from '../tools/bookService'

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
    instructions:
      'Ты - AI-помощник мастера маникюра. Ты помогаешь клиентам узнать об услугах, ценах, рабочем времени и записаться на маникюр.\n\nИспользуй инструменты:\n- get-services - чтобы получить список услуг с ценами и длительностью\n- get-schedule - чтобы узнать рабочее время и график\n- book-service - чтобы записать клиента на услугу (обязательно уточни все данные: имя, телефон, дату и время)\n\nПеред записью обязательно узнай у клиента:\n1. Полное имя\n2. Номер телефона\n3. Желаемую дату и время\n4. Выбранную услугу (используй ID из списка услуг)\n\nБудь вежливым, профессиональным и внимательным к деталям.',
    enabledTools: [sendMessageToChatTool, getServicesTool, getScheduleTool, bookServiceTool],
    linkToChannelId: channel.id
  })

  return createTransportResponse
})

// @shared-route
export const apiCheckTransportRoute = app.get('/check-transport', async (ctx) => {
  const transport = await findWorkspaceTransport(ctx)
  return {
    exists: !!transport,
    transport: transport || null
  }
})
