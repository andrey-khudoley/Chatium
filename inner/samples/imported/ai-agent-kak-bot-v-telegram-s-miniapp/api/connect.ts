import { requireAccountRole } from '@app/auth'
import { updateAuthProviderSettings } from '@app/auth/provider'
import { ChannelSource, createOrUpdateChannelBySecret } from '@sender/sdk'
import { getConnectedChannels, setConnectedAgent, setConnectedChannels } from '../config'
import { createTelegramWebAppLink, setTgMenuButton } from '@sender/sdk/telegram'
import { findCurrentWorkspace } from '@start/sdk'
import { getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'
import { sendMessageToChatTool } from '@sender/sdk'

// @shared-route
export const apiConnectTelegramRoute = app.post('/telegram', async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const { token } = req.body

  if (!token) {
    throw new Error('Токен обязателен')
  }

  try {
    const channel = await createOrUpdateChannelBySecret(ctx, {
      secret: token,
      source: 'Telegram' as ChannelSource,
      setWebhook: true
    })

    const channels = await getConnectedChannels(ctx)
    await setConnectedChannels(
      ctx,
      channels
        .filter((c) => c.id !== channel.id)
        .concat([
          {
            id: channel.id,
            title: channel.title,
            photo: channel.photo as string,
            username: channel.username
          }
        ])
    )

    const accountUrl = ctx.account.url('')
    const workspace = await findCurrentWorkspace(ctx)

    if (workspace) {
      const path = ctx.account.url(`${workspace.path}/web-app`).replace(accountUrl, '')

      await updateAuthProviderSettings(ctx, 'sender-tg-auth', {
        enabled: true,
        priority: 200
      })

      const result = await createTelegramWebAppLink(ctx, channel, {
        path,
        requestWriteAccessAtLaunch: true,
        expandAtLaunch: true
      })

      if (result.link) {
        await setTgMenuButton(ctx, {
          channelId: channel.id,
          button: {
            type: 'web_app',
            web_app: { url: result.link },
            text: 'App' // Можно заменить на подходящее название кнопки (Меню и т.п.)
          }
        })
      }

      return {
        success: true,
        channel
      }
    }

    return {
      success: true,
      channel,
      workspace
    }
  } catch (error: any) {
    throw new Error('Не удалось подключить бота: ' + error.message)
  }
})

// @shared-route
export const apiConnectAgentRoute = app.post('/agent', async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const { title, prompt } = req.body

  if (!title) {
    throw new Error('Title is required')
  }

  if (!prompt) {
    throw new Error('Prompt is required')
  }

  try {
    const agentKey = `senderAgent`
    const agent = await getOrCreateAgentForWorkspace(ctx, agentKey, {
      title,
      instructions: prompt,
      enabledTools: [sendMessageToChatTool]
    })

    await setConnectedAgent(ctx, {
      id: agent.id,
      title: agent.title
    })

    return {
      success: true
    }
  } catch (error: any) {
    throw new Error('Не удалось подключить агента: ' + error.message)
  }
})

// @shared-route
export const apiSaveChannelsRoute = app.post('/save-channels', async (ctx, req) => {
  await requireAccountRole(ctx, 'Admin')

  const { channelIds } = req.body

  if (!Array.isArray(channelIds)) {
    throw new Error('Channel IDs must be an array')
  }

  // Получаем полную информацию о каналах и сохраняем только выбранные
  const { getChannels } = await import('@sender/sdk')
  const allChannels = await getChannels(ctx)
  const selectedChannels = allChannels
    .filter((channel) => channelIds.includes(channel.id) && channel.active)
    .map((channel) => ({
      id: channel.id,
      title: channel.title,
      photo: channel.photo as string,
      username: channel.username
    }))

  await setConnectedChannels(ctx, selectedChannels)

  return {
    success: true,
    channels: selectedChannels
  }
})
