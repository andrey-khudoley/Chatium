// @shared
import { readWorkspaceFile, updateWorkspaceFile } from '@start/sdk'
import {
  getChannels,
  createOrUpdateChannelBySecret,
  getTelegramGroups,
  getOrCreateTelegramGroup
} from '@sender/sdk'

function safeJsonParse(json: any, defaultValue?: any) {
  try {
    return JSON.parse(json)
  } catch (error) {
    return defaultValue
  }
}

export async function getConfig(ctx: app.Ctx) {
  try {
    const configRaw = await readWorkspaceFile(ctx, 'config.json')
    if (!configRaw || !configRaw.source) {
      return {
        botId: '',
        senderChannelId: ''
      }
    }
    const config = safeJsonParse(configRaw.source, {
      botId: '',
      senderChannelId: ''
    })
    return config
  } catch (error) {
    return {
      botId: '',
      senderChannelId: ''
    }
  }
}

export async function writeConfig(ctx: app.Ctx, config: any) {
  await updateWorkspaceFile(ctx, 'config.json', {
    source: JSON.stringify(config, null, 2)
  })
  return true
}

// @shared-route
export const apiGetConfigRoute = app.get('/get', async (ctx, req) => {
  try {
    const config = await getConfig(ctx)
    return { success: true, config }
  } catch (error) {
    ctx.account.log('Error loading config', {
      level: 'error',
      err: error
    })
    return { success: false, error: error.message }
  }
})

// @shared-route
export const apiSaveConfigRoute = app
  .body((s) => ({
    botId: s.string(),
    senderChannelId: s.string()
  }))
  .post('/save', async (ctx, req) => {
    try {
      await writeConfig(ctx, req.body)
      return { success: true }
    } catch (error) {
      ctx.account.log('Error saving config', {
        level: 'error',
        err: error
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetBotsRoute = app.get('/bots', async (ctx, req) => {
  try {
    const channels = await getChannels(ctx)
    const telegramBots = channels.filter((ch) => ch.source === 'Telegram')

    return {
      success: true,
      bots: telegramBots.map((bot) => ({
        id: bot.id,
        title: bot.title,
        username: bot.username
      }))
    }
  } catch (error) {
    ctx.account.log('Error loading bots', {
      level: 'error',
      err: error
    })
    return { success: false, error: error.message, bots: [] }
  }
})

// @shared-route
export const apiAddBotRoute = app
  .body((s) => ({
    token: s.string()
  }))
  .post('/add-bot', async (ctx, req) => {
    try {
      const { token } = req.body

      if (!token) {
        return { success: false, error: 'Токен бота обязателен' }
      }

      const channel = await createOrUpdateChannelBySecret(ctx, {
        source: 'Telegram',
        secret: token,
        setWebhook: true
      })

      return {
        success: true,
        bot: {
          id: channel.id,
          title: channel.title,
          username: channel.username
        }
      }
    } catch (error) {
      ctx.account.log('Error adding bot', {
        level: 'error',
        err: error
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiGetChannelsRoute = app.get('/channels', async (ctx, req) => {
  try {
    const channels = await getTelegramGroups(ctx)

    return {
      success: true,
      channels: channels.map((ch) => ({
        id: ch.id,
        title: ch.title,
        externalId: ch.externalId
      }))
    }
  } catch (error) {
    ctx.account.log('Error loading channels', {
      level: 'error',
      err: error
    })
    return { success: false, error: error.message, channels: [] }
  }
})

// @shared-route
export const apiAddChannelRoute = app
  .body((s) => ({
    externalId: s.string()
  }))
  .post('/add-channel', async (ctx, req) => {
    try {
      const { externalId } = req.body

      if (!externalId) {
        return { success: false, error: 'ID канала обязателен' }
      }

      const channel = await getOrCreateTelegramGroup(ctx, { externalId })

      return {
        success: true,
        channel: {
          id: channel.id,
          title: channel.title,
          externalId: channel.externalId
        }
      }
    } catch (error) {
      ctx.account.log('Error adding channel', {
        level: 'error',
        err: error
      })
      return { success: false, error: error.message }
    }
  })
