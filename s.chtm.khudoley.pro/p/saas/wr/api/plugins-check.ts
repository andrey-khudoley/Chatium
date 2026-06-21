import { request } from '@app/request'
import { installSupportedApp } from '@store/sdk'

interface KinescopeCheckResult {
  success: boolean
  installed: boolean
  configured?: boolean
}

interface MuuveeCheckResult {
  success: boolean
  installed: boolean
}

interface KnowledgeCheckResult {
  success: boolean
  installed: boolean
}

export interface PluginsStatus {
  kinescope: {
    installed: boolean
    configured: boolean
    error?: string
  }
  muuvee: {
    installed: boolean
    error?: string
  }
  knowledge: {
    installed: boolean
    error?: string
  }
}

// @shared-route
export const apiCheckPluginsRoute = app.get('/check', async (ctx, req) => {
  const status: PluginsStatus = {
    kinescope: {
      installed: false,
      configured: false
    },
    muuvee: {
      installed: false
    },
    knowledge: {
      installed: false
    }
  }

  // Проверка Kinescope
  try {
    const kinescopeRes = await request({
      method: 'get',
      url: ctx.account.url('/app/kinescope/installed'),
      throwHttpErrors: false
    })

    if (kinescopeRes.statusCode === 200 && typeof kinescopeRes.body === 'object') {
      const body = kinescopeRes.body as KinescopeCheckResult
      if (body.success) {
        status.kinescope.installed = body.installed
        status.kinescope.configured = body.configured || false
      }
    }
  } catch (error) {
    status.kinescope.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Проверка Muuvee
  try {
    const muuveeRes = await request({
      method: 'get',
      url: ctx.account.url('/app/muuvee/installed'),
      throwHttpErrors: false
    })

    if (muuveeRes.statusCode === 200 && typeof muuveeRes.body === 'object') {
      const body = muuveeRes.body as MuuveeCheckResult
      if (body.success) {
        status.muuvee.installed = body.installed
      }
    }
  } catch (error) {
    status.muuvee.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Проверка Базы знаний
  try {
    const knowledgeRes = await request({
      method: 'get',
      url: ctx.account.url('/app/knowledge/installed'),
      throwHttpErrors: false
    })

    if (knowledgeRes.statusCode === 200 && typeof knowledgeRes.body === 'object') {
      const body = knowledgeRes.body as KnowledgeCheckResult
      if (body.success) {
        status.knowledge.installed = body.installed
      }
    }
  } catch (error) {
    status.knowledge.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return status
})

// @shared-route
export const apiInstallKnowledgePluginRoute = app.post('/install-knowledge', async (ctx, req) => {
  await installSupportedApp(ctx, 'knowledge')
  return { success: true }
})
