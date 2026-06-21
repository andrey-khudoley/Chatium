// @shared
import { readWorkspaceFile, updateWorkspaceFile } from '@start/sdk'

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
        checkBotToken: '',
        channelId: '',
        messages: {
          start:
            '👋 Добро пожаловать!\n\nДля продолжения подпишитесь на наш канал и нажмите кнопку ниже.',
          buttonText: '✅ Я подписался',
          subscribed: '🎉 Отлично! Вы подписаны на канал. Добро пожаловать!',
          notSubscribed:
            '❌ Вы еще не подписались на канал. Пожалуйста, подпишитесь и нажмите кнопку снова.'
        }
      }
    }
    const config = safeJsonParse(configRaw.source, {
      botId: '',
      checkBotToken: '',
      channelId: '',
      messages: {
        start:
          '👋 Добро пожаловать!\n\nДля продолжения подпишитесь на наш канал и нажмите кнопку ниже.',
        buttonText: '✅ Я подписался',
        subscribed: '🎉 Отлично! Вы подписаны на канал. Добро пожаловать!',
        notSubscribed:
          '❌ Вы еще не подписались на канал. Пожалуйста, подпишитесь и нажмите кнопку снова.'
      }
    })
    return config
  } catch (error) {
    return {
      botId: '',
      checkBotToken: '',
      channelId: '',
      messages: {
        start:
          '👋 Добро пожаловать!\n\nДля продолжения подпишитесь на наш канал и нажмите кнопку ниже.',
        buttonText: '✅ Я подписался',
        subscribed: '🎉 Отлично! Вы подписаны на канал. Добро пожаловать!',
        notSubscribed:
          '❌ Вы еще не подписались на канал. Пожалуйста, подпишитесь и нажмите кнопку снова.'
      }
    }
  }
}

export async function writeConfig(ctx: app.Ctx, config: any) {
  await updateWorkspaceFile(ctx, 'config.json', {
    source: JSON.stringify(config, null, 2)
  })
  return true
}
