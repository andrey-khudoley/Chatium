import { findAgents, getOrCreateAgentForWorkspace } from '@ai-agents/sdk/process'
import {
  getChannels,
  runTelegramApi,
  getTelegramGroups,
  createOrUpdateChannelBySecret,
  ChannelSource
} from '@sender/sdk'
import { readWorkspaceFile, updateWorkspaceFile } from '@start/sdk'

function safeJsonParse(json: any, defaultValue?: any) {
  try {
    return JSON.parse(json)
  } catch (error) {
    return defaultValue
  }
}

export async function getConfig(ctx: app.Ctx) {
  const configData = await readWorkspaceFile(ctx, 'config.json')
  const config = safeJsonParse(configData?.source, {})

  return config
}

export async function writeConfig(ctx: app.Ctx, config: any) {
  await updateWorkspaceFile(ctx, 'config.json', {
    source: JSON.stringify(config, null, 2)
  })
  return true
}

// @shared-route
export const apiGetBotsRoute = app.get('/bots', async (ctx, req) => {
  try {
    // Получаем все каналы типа Telegram
    const allChannels = await getChannels(ctx)
    const telegramBots = allChannels.filter(
      (channel) => channel.source === 'Telegram' && channel.active
    )
    return {
      success: true,
      bots: telegramBots.map((bot) => ({
        id: bot.id,
        title: bot.title,
        username: bot.username,
        type: bot.source
      }))
    }
  } catch (error) {
    ctx.account.log('Error getting bots', {
      level: 'error',
      json: { error: error.message }
    })
    return {
      success: false,
      error: error.message,
      bots: []
    }
  }
})

// @shared-route
export const apiGetChannelsRoute = app.get('/channels', async (ctx, req) => {
  try {
    // Получаем все Telegram группы и каналы
    const telegramGroups = await getTelegramGroups(ctx)

    return {
      success: true,
      channels: telegramGroups.map((channel) => ({
        id: channel.id,
        externalId: channel.externalId,
        title: channel.title,
        username: channel.username
      }))
    }
  } catch (error) {
    ctx.account.log('Error getting channels', {
      level: 'error',
      json: { error: error.message }
    })
    return {
      success: false,
      error: error.message,
      channels: []
    }
  }
})

// @shared-route
export const apiGetAgentsRoute = app.get('/agents', async (ctx, req) => {
  try {
    // Получаем все агенты аккаунта аналогично getChannels
    const agents = await findAgents(ctx)

    return {
      success: true,
      agents: agents.map((agent) => ({
        id: agent.id,
        title: agent.title
      }))
    }
  } catch (error) {
    ctx.account.log('Error getting agents', {
      level: 'error',
      json: { error: error.message }
    })
    return {
      success: false,
      error: error.message,
      agents: []
    }
  }
})

// @shared-route
export const apiCreateAgentRoute = app
  .body((s) => ({
    title: s.string(),
    prompt: s.string()
  }))
  .post('/create-agent', async (ctx, req) => {
    try {
      const agentKey = `sendReportToTgChannelAgent_${Date.now()}`
      const agent = await getOrCreateAgentForWorkspace(ctx, agentKey, {
        title: req.body.title,
        instructions: req.body.prompt
      })

      ctx.account.log('Agent created', {
        level: 'info',
        json: { agentId: agent.id, title: agent.title }
      })

      return {
        success: true,
        agent: {
          id: agent.id,
          title: agent.title
        }
      }
    } catch (error) {
      ctx.account.log('Error creating agent', {
        level: 'error',
        json: { error: error.message }
      })
      return {
        success: false,
        error: error.message
      }
    }
  })

// @shared-route
export const apiSaveSettingsRoute = app
  .body((s) => ({
    tgBotId: s.string(),
    tgChannelId: s.string(),
    messageWrapper: s.string(),
    agentId: s.string().optional()
  }))
  .post('/save-settings', async (ctx, req) => {
    try {
      // Получаем текущий конфиг
      const config = await getConfig(ctx)

      // Сохраняем настройки в config.json
      await writeConfig(ctx, {
        ...config,
        tgBotId: req.body.tgBotId,
        tgChannelId: req.body.tgChannelId,
        messageWrapper: req.body.messageWrapper,
        agentId: req.body.agentId || ''
      })

      ctx.account.log('Settings saved to config.json', {
        level: 'info',
        json: { settingsKeys: Object.keys(req.body) }
      })

      return {
        success: true,
        message: 'Настройки успешно сохранены'
      }
    } catch (error) {
      ctx.account.log('Error saving settings', {
        level: 'error',
        json: { error: error.message }
      })
      return {
        success: false,
        error: error.message
      }
    }
  })

// @shared-route
export const apiGetSettingsRoute = app.get('/get-settings', async (ctx, req) => {
  try {
    const config = await getConfig(ctx)

    ctx.account.log('Returning settings from config', {
      level: 'info',
      json: {
        configKeys: Object.keys(config),
        tgBotId: config.tgBotId,
        tgChannelId: config.tgChannelId,
        agentId: config.agentId
      }
    })

    const settings = {
      tgBotId: config.tgBotId || '',
      tgChannelId: config.tgChannelId || '',
      messageWrapper:
        config.messageWrapper ||
        '🤖 <b>Сообщение от ИИ агента</b>\n\n{TEXT}\n\n<i>Отправлено автоматически</i>',
      agentId: config.agentId || ''
    }

    return {
      success: true,
      settings
    }
  } catch (error: any) {
    ctx.account.log('Error loading settings', {
      level: 'error',
      json: { error: error.message, stack: error.stack }
    })
    return {
      success: false,
      error: error.message,
      settings: null
    }
  }
})

// @shared-route
export const apiTestToolRoute = app
  .body((s) => ({
    tgBotId: s.string(),
    tgChannelId: s.string(),
    messageWrapper: s.string()
  }))
  .post('/test-tool', async (ctx, req) => {
    try {
      const { tgBotId, tgChannelId, messageWrapper } = req.body

      const messageText = messageWrapper.replace(
        /{TEXT}/g,
        'Это тестовое сообщение от инструмента отправки в Telegram'
      )

      // Отправляем сообщение через runTelegramApi
      const result = await runTelegramApi(ctx, null, 'sendMessage', {
        channelId: tgBotId,
        chat_id: tgChannelId,
        text: messageText,
        parse_mode: 'HTML'
      })

      if (!result || !result[0]) {
        throw new Error('Ошибка при отправке сообщения')
      }

      const [success, response, error] = result

      if (!success) {
        throw new Error(error || 'Telegram API error')
      }

      ctx.account.log('Test message sent', {
        level: 'info',
        json: {
          tgChannelId,
          messageLength: messageText.length,
          messageId: response?.message_id
        }
      })

      return {
        success: true,
        message: 'Тестовое сообщение успешно отправлено!',
        result: response
      }
    } catch (error) {
      ctx.account.log('Error sending test message', {
        level: 'error',
        json: { error: error.message, body: req.body }
      })
      return {
        success: false,
        error: error.message,
        message: `Ошибка отправки: ${error.message}`
      }
    }
  })

// @shared-route
export const apiConnectTelegramRoute = app
  .body((s) => ({
    token: s.string()
  }))
  .post('/connect-telegram', async (ctx, req) => {
    try {
      const { token } = req.body

      if (!token || !token.trim()) {
        throw new Error('Токен обязателен')
      }

      // Создаем или обновляем канал с параметром setWebhook: true
      const channel = await createOrUpdateChannelBySecret(ctx, {
        secret: token,
        source: 'Telegram' as ChannelSource,
        setWebhook: true,
        options: { answerInGroupChats: 'answer-for-all' }
      })

      ctx.account.log('Telegram bot connected', {
        level: 'info',
        json: {
          botId: channel.id,
          botTitle: channel.title,
          username: channel.username
        }
      })

      return {
        success: true,
        message: 'Telegram-бот успешно подключен',
        bot: {
          id: channel.id,
          title: channel.title,
          username: channel.username
        }
      }
    } catch (error: any) {
      ctx.account.log('Error connecting Telegram bot', {
        level: 'error',
        json: { error: error.message }
      })
      return {
        success: false,
        error: error.message || 'Не удалось подключить бота'
      }
    }
  })
