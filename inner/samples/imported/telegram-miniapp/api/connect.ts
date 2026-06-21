import { requireAccountRole } from '@app/auth'
import { updateAuthProviderSettings } from '@app/auth/provider'
import { ChannelSource, createOrUpdateChannelBySecret } from '@sender/sdk'
import { getConnectedChannels, setConnectedChannels } from '../config'
import { createTelegramWebAppLink, setTgMenuButton } from '@sender/sdk/telegram'
import { findCurrentWorkspace } from '@start/sdk'

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

    const accountUrl = ctx.account.url('/')
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
