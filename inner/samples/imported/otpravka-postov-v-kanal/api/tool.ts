import { runTelegramApi } from '@sender/sdk'
import Settings from '../tables/settings.table'

// Тул для отправки сообщений в Telegram
export const sendPostToTelegramTool = app
  .function('/sendPostToTelegram')
  .meta({
    name: 'sendPostToTelegram',
    description: `Отправляет HTML сообщение в настроенный Telegram канал или группу через выбранного бота-менеджера. Используйте этот инструмент для публикации сообщений, уведомлений или любого контента в Telegram.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object(
          {
            text: s
              .string()
              .describe(
                `HTML текст сообщения для отправки в Telegram. Поддерживает разметку: <b>жирный</b>, <i>курсив</i>, <a href="url">ссылка</a>, <code>код</code>, <pre>блок кода</pre> и другие теги.`
              ),
            imageUrl: s
              .string()
              .optional()
              .describe(
                `URL изображения для отправки в Telegram. Если указано, изображение будет отправлено перед текстовым сообщением.`
              )
          },
          { additionalProperties: true }
        )
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    const { text, imageUrl } = body.input

    try {
      const settings = await Settings.getSingleton(ctx)

      // Проверяем настройки
      if (!settings?.tgManagerId) {
        return {
          ok: false,
          result:
            'TG Manager ID не настроен. Перейдите в настройки инструмента и выберите бота-менеджера.'
        }
      }

      if (!settings?.groupOrChannelId) {
        return {
          ok: false,
          result:
            'ID группы/канала не настроен. Перейдите в настройки инструмента и укажите ID группы или канала.'
        }
      }

      // Подготавливаем inline клавиатуру из настроек
      const inlineKeyboard = (settings.buttons || [])
        .filter((button) => button.text?.trim() && button.url?.trim())
        .map((button) => [{ text: button.text, url: button.url }])

      // Подставляем текст от агента в обертку
      const wrappedText = (settings.messageWrapper || '{TEXT}').replace(/{TEXT}/g, text)

      let photoResult = null
      let textResult = null

      // Если есть изображение, отправляем его сначала
      if (imageUrl) {
        photoResult = await runTelegramApi(ctx, null, 'sendPhoto', {
          channelId: settings.tgManagerId,
          chat_id: settings.groupOrChannelId,
          photo: imageUrl
        })

        // Проверяем успешность отправки изображения
        if (!photoResult || !photoResult[0]) {
          return {
            ok: false,
            result: `Ошибка отправки изображения в Telegram: ${photoResult?.[2] || 'Неизвестная ошибка'}`
          }
        }
      }

      // Отправляем текстовое сообщение
      textResult = await runTelegramApi(ctx, null, 'sendMessage', {
        channelId: settings.tgManagerId,
        chat_id: settings.groupOrChannelId,
        text: wrappedText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
        ...(settings.disableLinkPreview && {
          link_preview_options: { is_disabled: settings.disableLinkPreview }
        })
      })

      // Проверяем успешность отправки текста
      if (!textResult || !textResult[0]) {
        return {
          ok: false,
          result: `Ошибка отправки текста в Telegram: ${textResult?.[2] || 'Неизвестная ошибка'}`
        }
      }

      // Формируем результат
      const resultMessage = imageUrl
        ? `Изображение и сообщение успешно отправлены в Telegram. ID изображения: ${photoResult[1]?.message_id || 'неизвестно'}, ID сообщения: ${textResult[1]?.message_id || 'неизвестно'}`
        : `Сообщение успешно отправлено в Telegram. ID сообщения: ${textResult[1]?.message_id || 'неизвестно'}`

      return {
        ok: true,
        result: resultMessage
      }
    } catch (error) {
      return {
        ok: false,
        result: `Ошибка отправки сообщения в Telegram: ${error.message}`
      }
    }
  })

// Регистрация тула для ИИ агентов
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return [sendPostToTelegramTool]
})
