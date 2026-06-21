import { findAgentById } from '@ai-agents/sdk/process'
import { requireAccountRole } from '@app/auth'
import { findWorkspaceTools } from '@ai-agents/sdk/process'
import { getConnectedAgent } from '../config/index'

// @shared-route
export const apiGetToolsRoute = app.get('/tools').handle(async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const connectedAgent = await getConnectedAgent(ctx)
  if (!connectedAgent) {
    return {
      tools: []
    }
  }

  const agent = await findAgentById(ctx, connectedAgent.id)
  if (!agent) {
    return {
      tools: []
    }
  }

  return {
    workspaceTools: await findWorkspaceTools(ctx),
    agentTools: agent.enabledToolKeys ?? []
  }
})
