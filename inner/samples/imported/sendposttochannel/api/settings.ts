import { getChannels, getLastActiveGroupsForTgManager, runTelegramApi } from '@sender/sdk'
import Settings from '../tables/settings.table'

// @shared-route
export const apiGetManagersRoute = app.get('/managers', async (ctx, req) => {
  try {
    const channels = await getChannels(ctx)
    const telegramManagers = channels.filter((channel) => channel.source === 'TelegramManager')

    return {
      success: true,
      managers: telegramManagers.map((manager) => ({
        id: manager.id,
        name: manager.name || manager.title || manager.id
      }))
    }
  } catch (error) {
    ctx.account.log('Error getting telegram managers', {
      level: 'error',
      json: { error: error.message }
    })
    return {
      success: false,
      error: error.message,
      managers: []
    }
  }
})

// @shared-route
export const apiGetGroupSuggestionsRoute = app
  .body((s) => ({
    tgManagerId: s.string()
  }))
  .post('/group-suggestions', async (ctx, req) => {
    try {
      const suggestions = await getLastActiveGroupsForTgManager(ctx, req.body.tgManagerId)

      return {
        success: true,
        suggestions: suggestions || []
      }
    } catch (error) {
      ctx.account.log('Error getting group suggestions', {
        level: 'error',
        json: { error: error.message, tgManagerId: req.body.tgManagerId }
      })
      return {
        success: false,
        error: error.message,
        suggestions: []
      }
    }
  })

// @shared-route
export const apiSaveSettingsRoute = app
  .body((s) => ({
    tgManagerId: s.string(),
    groupOrChannelId: s.string(),
    messageWrapper: s.string(),
    buttons: s.array(
      s.object({
        text: s.string(),
        url: s.string()
      })
    ),
    disableLinkPreview: s.boolean()
  }))
  .post('/save-settings', async (ctx, req) => {
    try {
      await Settings.updateSingleton(ctx, {
        tgManagerId: req.body.tgManagerId,
        groupOrChannelId: req.body.groupOrChannelId,
        messageWrapper: req.body.messageWrapper,
        buttons: req.body.buttons,
        disableLinkPreview: req.body.disableLinkPreview
      })

      ctx.account.log('Settings saved to singleton table', {
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
    const settings = await Settings.getSingleton(ctx)

    return {
      success: true,
      settings: {
        tgManagerId: settings?.tgManagerId || '',
        groupOrChannelId: settings?.groupOrChannelId || '',
        messageWrapper:
          settings?.messageWrapper ||
          '🤖 <b>Сообщение от ИИ агента</b>\n\n{TEXT}\n\n<i>Отправлено автоматически</i>',
        buttons: settings?.buttons || [],
        disableLinkPreview: settings?.disableLinkPreview || false
      }
    }
  } catch (error) {
    ctx.account.log('Error loading settings', {
      level: 'error',
      json: { error: error.message }
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
    tgManagerId: s.string(),
    groupOrChannelId: s.string(),
    messageWrapper: s.string(),
    buttons: s.array(
      s.object({
        text: s.string(),
        url: s.string()
      })
    ),
    disableLinkPreview: s.boolean()
  }))
  .post('/test-tool', async (ctx, req) => {
    try {
      const { tgManagerId, groupOrChannelId, messageWrapper, buttons, disableLinkPreview } =
        req.body

      const messageText = messageWrapper.replace(
        /{TEXT}/g,
        'Это тестовое сообщение от инструмента отправки в Telegram'
      )

      // Подготавливаем inline клавиатуру
      const inlineKeyboard = buttons
        .filter((button) => button.text.trim() && button.url.trim())
        .map((button) => [{ text: button.text, url: button.url }])

      // Отправляем сообщение
      const result = await runTelegramApi(ctx, null, 'sendMessage', {
        channelId: tgManagerId,
        chat_id: groupOrChannelId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
        ...(disableLinkPreview && {
          link_preview_options: { is_disabled: disableLinkPreview }
        })
      })

      ctx.account.log('Test message sent', {
        level: 'info',
        json: {
          tgManagerId,
          groupOrChannelId,
          messageLength: messageText.length,
          buttonsCount: inlineKeyboard.length,
          result: result
        }
      })

      return {
        success: true,
        message: 'Тестовое сообщение успешно отправлено!',
        result: result
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
