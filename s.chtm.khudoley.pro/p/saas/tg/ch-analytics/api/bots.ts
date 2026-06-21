// @shared-route

import { requireRealUser } from '@app/auth'
import { BotTokens } from '../tables/bot-tokens.table'
import { TelegramChats } from '../tables/chats.table'
import { Projects } from '../tables/projects.table'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import { request } from '@app/request'
import { apiWebhookRoute } from './webhook'
import { userIdsMatch } from '../shared/user-utils'
import { runWithExclusiveLock } from '@app/sync'

/**
 * Функция для регистрации webhook в Telegram с правильными параметрами
 * Используется при добавлении нового бота и при перерегистрации существующего
 */
async function registerWebhook(
  ctx: any,
  bot: any,
  botIdString: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Обрезаем токен перед использованием для безопасности (на случай пробелов)
    const trimmedToken = bot.token.trim()

    const webhookUrl = apiWebhookRoute({ id: botIdString }).url()
    Debug.info(ctx, `[registerWebhook] Регистрация вебхука для бота ${bot.id}`)
    Debug.info(ctx, `[registerWebhook] Сгенерированный URL вебхука: ${webhookUrl}`)
    Debug.info(
      ctx,
      `[registerWebhook] Токен бота (первые 10 символов): ${trimmedToken.substring(0, 10)}...`
    )

    const telegramApiUrl = `https://api.telegram.org/bot${trimmedToken}/setWebhook`
    Debug.info(ctx, `[registerWebhook] URL Telegram API: ${telegramApiUrl}`)

    const webhookResponse = await request({
      url: telegramApiUrl,
      method: 'post',
      json: {
        url: webhookUrl,
        // Явно указываем все нужные типы обновлений для надежности
        // message и channel_post - сообщения в чатах и каналах
        // chat_member и my_chat_member - подписки/отписки (бот должен быть администратором канала)
        // message_reaction и message_reaction_count - реакции на сообщения (лайки) - Bot API 7.0+
        // edited_message и edited_channel_post - отредактированные сообщения
        allowed_updates: [
          'message',
          'channel_post',
          'edited_message',
          'edited_channel_post',
          'chat_member',
          'my_chat_member',
          'message_reaction',
          'message_reaction_count'
        ]
      },
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 10000
    })

    const webhookBody = webhookResponse.body as any

    Debug.info(
      ctx,
      `[registerWebhook] Ответ от Telegram API: statusCode=${webhookResponse.statusCode}, body=${JSON.stringify(webhookBody)}`
    )

    if (webhookResponse.statusCode === 200 && webhookBody?.ok) {
      Debug.info(ctx, `[registerWebhook] Вебхук успешно зарегистрирован для бота ${bot.id}`)
      if (webhookBody.result) {
        Debug.info(
          ctx,
          `[registerWebhook] Детали регистрации: ${JSON.stringify(webhookBody.result)}`
        )
      }
      return { success: true }
    } else {
      const errorMessage = webhookBody?.description || 'Ошибка регистрации вебхука'
      Debug.warn(
        ctx,
        `[registerWebhook] Ошибка регистрации вебхука: statusCode=${webhookResponse.statusCode}, body=${JSON.stringify(webhookBody)}`
      )
      if (webhookBody?.description) {
        Debug.warn(ctx, `[registerWebhook] Описание ошибки от Telegram: ${webhookBody.description}`)
      }
      return { success: false, error: errorMessage }
    }
  } catch (webhookError: any) {
    Debug.error(
      ctx,
      `[registerWebhook] Исключение при регистрации вебхука: ${webhookError.message}`,
      'E_WEBHOOK_REGISTER'
    )
    Debug.error(ctx, `[registerWebhook] Stack trace: ${webhookError.stack || 'N/A'}`)
    return { success: false, error: webhookError.message }
  }
}

/**
 * GET /api/bots/list
 * Получение списка ботов проекта
 */
export const apiGetBotsListRoute = app.get('/list', async (ctx, req) => {
  try {
    // Применяем уровень логирования из настроек
    await applyDebugLevel(ctx, 'api/bots/list')
    Debug.info(ctx, '[api/bots/list] Начало обработки запроса на получение списка ботов')

    // Проверка авторизации
    requireRealUser(ctx)
    Debug.info(ctx, `[api/bots/list] Пользователь авторизован: userId=${ctx.user.id}`)

    // Получаем projectId из query параметров
    const projectId = req.query.projectId as string | undefined

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/bots/list] projectId не предоставлен')
      return {
        success: false,
        error: 'projectId обязателен'
      }
    }

    const trimmedProjectId = projectId.trim()
    Debug.info(
      ctx,
      `[api/bots/list] Запрос списка ботов для проекта: projectId=${trimmedProjectId}`
    )

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/bots/list] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут видеть ботов проекта
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            member &&
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/bots/list] Попытка доступа к ботам проекта без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Получаем ботов проекта
    const bots = await BotTokens.findAll(ctx, {
      where: {
        projectId: trimmedProjectId
      },
      order: { createdAt: 'desc' },
      limit: 100
    })

    const botsCount = bots?.length || 0
    Debug.info(ctx, `[api/bots/list] Найдено ботов: ${botsCount}`)

    if (botsCount === 0) {
      Debug.warn(
        ctx,
        `[api/bots/list] В проекте projectId=${trimmedProjectId} нет добавленных ботов`
      )
    }

    // Для каждого бота подсчитываем количество каналов
    const botsWithStats = []
    if (bots && bots.length > 0) {
      for (const bot of bots) {
        try {
          Debug.info(ctx, `[api/bots/list] Подсчёт каналов для бота ${bot.id}`)
          const channelsCount = await TelegramChats.countBy(ctx, {
            botId: bot.id,
            chatType: 'channel'
          })
          Debug.info(ctx, `[api/bots/list] Для бота ${bot.id} найдено каналов: ${channelsCount}`)

          botsWithStats.push({
            ...bot,
            channelsCount: channelsCount || 0
          })
        } catch (statsError: any) {
          Debug.error(
            ctx,
            `[api/bots/list] Ошибка подсчёта каналов для бота ${bot.id}: ${statsError.message}`,
            'E_BOT_STATS'
          )
          // В случае ошибки добавляем бота со значением 0
          botsWithStats.push({
            ...bot,
            channelsCount: 0
          })
        }
      }
    }

    return {
      success: true,
      bots: botsWithStats
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/bots/list] Ошибка при получении списка ботов: ${error.message}`,
      'E_GET_BOTS_LIST'
    )
    Debug.error(ctx, `[api/bots/list] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка ботов'
    }
  }
})

/**
 * POST /api/bots/validate-token
 * Валидация токена Telegram бота через Telegram Bot API
 */
export const apiValidateTokenRoute = app.post('/validate-token', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/bots/validate-token')
    Debug.info(ctx, '[api/bots/validate-token] Начало валидации токена')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/bots/validate-token] Пользователь авторизован: userId=${ctx.user.id}`)

    const { token } = req.body

    if (!token || !token.trim()) {
      Debug.warn(ctx, '[api/bots/validate-token] Токен не предоставлен')
      return {
        success: false,
        error: 'Токен обязателен'
      }
    }

    const trimmedToken = token.trim()
    Debug.info(
      ctx,
      `[api/bots/validate-token] Проверка токена (первые 10 символов): ${trimmedToken.substring(0, 10)}...`
    )

    // Вызов Telegram Bot API для валидации токена
    const telegramApiUrl = `https://api.telegram.org/bot${trimmedToken}/getMe`

    Debug.info(
      ctx,
      `[api/bots/validate-token] Запрос к Telegram API: ${telegramApiUrl.replace(trimmedToken, '***')}`
    )

    const response = await request({
      url: telegramApiUrl,
      method: 'get',
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 10000 // 10 секунд таймаут
    })

    // Проверяем ответ от Telegram API
    if (response.statusCode !== 200) {
      Debug.warn(
        ctx,
        `[api/bots/validate-token] Telegram API вернул ошибку: statusCode=${response.statusCode}`
      )
      return {
        success: false,
        error: 'Токен недействителен. Проверьте правильность токена.'
      }
    }

    const botInfo = response.body as {
      ok?: boolean
      result?: {
        id: number
        username?: string
        first_name?: string
      }
    }

    // Проверяем структуру ответа
    if (!botInfo.ok || !botInfo.result) {
      Debug.warn(ctx, `[api/bots/validate-token] Неверный формат ответа от Telegram API`)
      return {
        success: false,
        error: 'Неверный формат ответа от Telegram API'
      }
    }

    const { id, username, first_name } = botInfo.result

    Debug.info(
      ctx,
      `[api/bots/validate-token] Токен валиден: botId=${id}, username=${username}, name=${first_name}`
    )

    return {
      success: true,
      botInfo: {
        id: String(id),
        username: username || null,
        name: first_name || null
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/bots/validate-token] Ошибка при валидации токена: ${error.message}`,
      'E_VALIDATE_TOKEN'
    )
    Debug.error(ctx, `[api/bots/validate-token] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при проверке токена'
    }
  }
})

/**
 * POST /api/bots/add
 * Добавление нового бота в таблицу
 */
export const apiAddBotRoute = app.post('/add', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/bots/add')
    Debug.info(ctx, '[api/bots/add] Начало добавления бота')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/bots/add] Пользователь авторизован: userId=${ctx.user.id}`)

    const { token, botName, botUsername, projectId } = req.body

    if (!token || !token.trim()) {
      Debug.warn(ctx, '[api/bots/add] Токен не предоставлен')
      return {
        success: false,
        error: 'Токен обязателен'
      }
    }

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/bots/add] projectId не предоставлен')
      return {
        success: false,
        error: 'projectId обязателен'
      }
    }

    const trimmedToken = token.trim()
    const trimmedProjectId = projectId.trim()

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/bots/add] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут добавлять ботов
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            member &&
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/bots/add] Попытка добавления бота без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Используем эксклюзивную блокировку для предотвращения race condition
    // Ключ блокировки на основе токена гарантирует, что параллельные запросы с одним токеном выполняются последовательно
    const lockKey = `bot-token-${trimmedToken}`
    Debug.info(
      ctx,
      `[api/bots/add] Получение эксклюзивной блокировки для токена: lockKey=${lockKey}`
    )

    let bot: any = null

    try {
      await runWithExclusiveLock(ctx, lockKey, {}, async () => {
        // ВСЕ проверки и создание внутри блокировки для атомарности

        // Сначала проверяем глобально (более строгая проверка)
        // Запрещаем подключение одного бота к разным проектам
        Debug.info(
          ctx,
          `[api/bots/add] Проверка, не используется ли токен где-либо (глобальная проверка)`
        )
        const existingBot = await BotTokens.findOneBy(ctx, {
          token: trimmedToken
        })

        if (existingBot) {
          const isInCurrentProject = existingBot.projectId === trimmedProjectId
          const errorMessage = isInCurrentProject
            ? 'Этот токен уже добавлен в этот проект'
            : 'Этот токен уже используется в другом проекте. Один бот не может быть подключен к нескольким проектам.'

          Debug.warn(
            ctx,
            `[api/bots/add] Токен уже используется: projectId=${existingBot.projectId}, isInCurrentProject=${isInCurrentProject}`
          )
          throw new Error(errorMessage)
        }

        // Затем проверяем в проекте (дополнительная проверка для ясности сообщения об ошибке)
        Debug.info(
          ctx,
          `[api/bots/add] Проверка на дубликаты токена для проекта projectId=${trimmedProjectId}`
        )
        const existingBotInProject = await BotTokens.findOneBy(ctx, {
          projectId: trimmedProjectId,
          token: trimmedToken
        })

        if (existingBotInProject) {
          Debug.warn(
            ctx,
            `[api/bots/add] Токен уже существует в проекте projectId=${trimmedProjectId}`
          )
          throw new Error('Этот токен уже добавлен в этот проект')
        }

        // Создаём запись в таблице (атомарная операция внутри блокировки)
        Debug.info(
          ctx,
          `[api/bots/add] Создание записи в таблице: token=${trimmedToken.substring(0, 10)}..., botName=${botName || 'null'}, botUsername=${botUsername || 'null'}, projectId=${trimmedProjectId}`
        )
        bot = await BotTokens.create(ctx, {
          token: trimmedToken,
          botName: botName || null,
          botUsername: botUsername || null,
          projectId: trimmedProjectId
        })
      })
    } catch (error: any) {
      // Обрабатываем ошибки из блокировки (дубликаты токенов)
      if (error?.message) {
        Debug.warn(ctx, `[api/bots/add] Ошибка при добавлении бота: ${error.message}`)
        return {
          success: false,
          error: error.message
        }
      }

      // Неожиданная ошибка
      Debug.error(
        ctx,
        `[api/bots/add] Неожиданная ошибка при добавлении бота: ${error?.message || String(error)}`,
        'E_BOT_ADD_ERROR'
      )
      return {
        success: false,
        error: 'Не удалось добавить бота. Попробуйте ещё раз.'
      }
    }

    if (!bot) {
      // Если bot не создан, значит была ошибка в блокировке
      Debug.error(ctx, `[api/bots/add] Бот не был создан после выполнения блокировки`)
      return {
        success: false,
        error: 'Не удалось добавить бота. Попробуйте ещё раз.'
      }
    }

    Debug.info(ctx, `[api/bots/add] Бот успешно добавлен с ID: ${bot.id}`)
    Debug.info(ctx, `[api/bots/add] Тип bot.id: ${typeof bot.id}, значение: ${bot.id}`)

    // Проверяем, что bot.id существует
    if (!bot.id) {
      Debug.error(
        ctx,
        `[api/bots/add] КРИТИЧЕСКАЯ ОШИБКА: bot.id отсутствует после создания!`,
        'E_BOT_ID_MISSING'
      )
      return {
        success: false,
        error: 'Ошибка: ID бота не был создан'
      }
    }

    // Регистрируем вебхук в Telegram
    try {
      // Убеждаемся, что bot.id - строка
      Debug.info(
        ctx,
        `[api/bots/add] Проверка bot.id: значение=${bot.id}, тип=${typeof bot.id}, JSON=${JSON.stringify(bot.id)}`
      )

      if (!bot.id) {
        Debug.error(
          ctx,
          `[api/bots/add] КРИТИЧЕСКАЯ ОШИБКА: bot.id отсутствует!`,
          'E_BOT_ID_MISSING'
        )
        return {
          success: false,
          error: 'Ошибка: ID бота не был создан'
        }
      }

      const botIdString = String(bot.id).trim()
      Debug.info(
        ctx,
        `[api/bots/add] botIdString после преобразования: значение="${botIdString}", длина=${botIdString.length}`
      )

      if (!botIdString || botIdString === '') {
        Debug.error(
          ctx,
          `[api/bots/add] КРИТИЧЕСКАЯ ОШИБКА: bot.id пустой после преобразования!`,
          'E_BOT_ID_INVALID'
        )
        return {
          success: false,
          error: 'Ошибка: ID бота невалиден'
        }
      }

      // Регистрируем вебхук в Telegram используя общую функцию
      const registerResult = await registerWebhook(ctx, bot, botIdString)
      if (!registerResult.success) {
        Debug.warn(ctx, `[api/bots/add] Вебхук не был зарегистрирован: ${registerResult.error}`)
        // Не прерываем выполнение, бот уже добавлен в БД
      }
    } catch (webhookError: any) {
      Debug.error(
        ctx,
        `[api/bots/add] Исключение при регистрации вебхука: ${webhookError.message}`,
        'E_WEBHOOK_REGISTER'
      )
      Debug.error(ctx, `[api/bots/add] Stack trace: ${webhookError.stack || 'N/A'}`)
      // Не прерываем выполнение, бот уже добавлен в БД
    }

    return {
      success: true,
      bot: {
        id: bot.id,
        token: bot.token,
        botName: bot.botName,
        botUsername: bot.botUsername,
        projectId: bot.projectId
      }
    }
  } catch (error: any) {
    Debug.error(ctx, `[api/bots/add] Ошибка при добавлении бота: ${error.message}`, 'E_ADD_BOT')
    Debug.error(ctx, `[api/bots/add] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при добавлении бота'
    }
  }
})

/**
 * POST /api/bots/delete
 * Удаление бота из таблицы
 */
export const apiDeleteBotRoute = app.post('/delete', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/bots/delete')
    Debug.info(ctx, '[api/bots/delete] Начало удаления бота')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/bots/delete] Пользователь авторизован: userId=${ctx.user.id}`)

    const { botId } = req.body

    if (!botId || !botId.trim()) {
      Debug.warn(ctx, '[api/bots/delete] ID бота не предоставлен')
      return {
        success: false,
        error: 'ID бота обязателен'
      }
    }

    const trimmedBotId = botId.trim()
    Debug.info(ctx, `[api/bots/delete] Попытка удаления бота с ID: ${trimmedBotId}`)

    // Проверяем, существует ли бот
    const bot = await BotTokens.findById(ctx, trimmedBotId)

    if (!bot) {
      Debug.warn(ctx, `[api/bots/delete] Бот с ID ${trimmedBotId} не найден`)
      return {
        success: false,
        error: 'Бот не найден'
      }
    }

    // Проверяем права доступа к проекту бота
    const project = await Projects.findById(ctx, bot.projectId)

    if (!project) {
      Debug.warn(ctx, `[api/bots/delete] Проект с ID ${bot.projectId} не найден`)
      return {
        success: false,
        error: 'Проект бота не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут удалять ботов
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            member &&
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/bots/delete] Попытка удаления бота без прав: userId=${ctx.user.id}, projectId=${bot.projectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Удаляем вебхук из Telegram перед удалением бота
    try {
      Debug.info(ctx, `[api/bots/delete] Удаление вебхука для бота ${trimmedBotId}`)

      // Обрезаем токен перед использованием для безопасности (на случай пробелов)
      const trimmedToken = bot.token.trim()

      const webhookResponse = await request({
        url: `https://api.telegram.org/bot${trimmedToken}/deleteWebhook`,
        method: 'post',
        json: {
          drop_pending_updates: true
        },
        responseType: 'json',
        throwHttpErrors: false,
        timeout: 10000
      })

      const webhookBody = webhookResponse.body as any

      if (webhookResponse.statusCode === 200 && webhookBody?.ok) {
        Debug.info(ctx, `[api/bots/delete] Вебхук успешно удалён для бота ${trimmedBotId}`)
      } else {
        Debug.warn(
          ctx,
          `[api/bots/delete] Ошибка удаления вебхука: statusCode=${webhookResponse.statusCode}, body=${JSON.stringify(webhookBody)}`
        )
        // Продолжаем удаление бота даже если вебхук не удалось удалить
      }
    } catch (webhookError: any) {
      Debug.error(
        ctx,
        `[api/bots/delete] Исключение при удалении вебхука: ${webhookError.message}`,
        'E_WEBHOOK_DELETE'
      )
      // Продолжаем удаление бота даже если вебхук не удалось удалить
    }

    // Удаляем бота
    Debug.info(ctx, `[api/bots/delete] Удаление бота с ID: ${trimmedBotId}`)
    await BotTokens.delete(ctx, trimmedBotId)

    Debug.info(ctx, `[api/bots/delete] Бот успешно удалён с ID: ${trimmedBotId}`)

    return {
      success: true,
      message: 'Бот успешно удалён'
    }
  } catch (error: any) {
    Debug.error(ctx, `[api/bots/delete] Ошибка при удалении бота: ${error.message}`, 'E_DELETE_BOT')
    Debug.error(ctx, `[api/bots/delete] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при удалении бота'
    }
  }
})

/**
 * POST /api/bots/reregister-webhook
 * Перерегистрация webhook для существующего бота с правильными параметрами
 */
export const apiReregisterWebhookRoute = app.post('/reregister-webhook', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/bots/reregister-webhook')
    Debug.info(ctx, '[api/bots/reregister-webhook] Начало перерегистрации webhook')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/bots/reregister-webhook] Пользователь авторизован: userId=${ctx.user.id}`)

    const { botId } = req.body

    if (!botId || !botId.trim()) {
      Debug.warn(ctx, '[api/bots/reregister-webhook] ID бота не предоставлен')
      return {
        success: false,
        error: 'ID бота обязателен'
      }
    }

    const trimmedBotId = botId.trim()
    Debug.info(
      ctx,
      `[api/bots/reregister-webhook] Попытка перерегистрации webhook для бота с ID: ${trimmedBotId}`
    )

    // Проверяем, существует ли бот
    const bot = await BotTokens.findById(ctx, trimmedBotId)

    if (!bot) {
      Debug.warn(ctx, `[api/bots/reregister-webhook] Бот с ID ${trimmedBotId} не найден`)
      return {
        success: false,
        error: 'Бот не найден'
      }
    }

    // Проверяем права доступа к проекту бота
    const project = await Projects.findById(ctx, bot.projectId)

    if (!project) {
      Debug.warn(ctx, `[api/bots/reregister-webhook] Проект с ID ${bot.projectId} не найден`)
      return {
        success: false,
        error: 'Проект бота не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут перерегистрировать webhook
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            member &&
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/bots/reregister-webhook] Попытка перерегистрации webhook без прав: userId=${ctx.user.id}, projectId=${bot.projectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Перерегистрируем webhook с правильными параметрами
    const botIdString = String(bot.id).trim()
    const registerResult = await registerWebhook(ctx, bot, botIdString)

    if (registerResult.success) {
      Debug.info(
        ctx,
        `[api/bots/reregister-webhook] Webhook успешно перерегистрирован для бота ${trimmedBotId}`
      )
      return {
        success: true,
        message: 'Webhook успешно перерегистрирован'
      }
    } else {
      Debug.warn(
        ctx,
        `[api/bots/reregister-webhook] Ошибка перерегистрации webhook: ${registerResult.error}`
      )
      return {
        success: false,
        error: registerResult.error || 'Ошибка при перерегистрации webhook'
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/bots/reregister-webhook] Ошибка при перерегистрации webhook: ${error.message}`,
      'E_REREGISTER_WEBHOOK'
    )
    Debug.error(ctx, `[api/bots/reregister-webhook] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при перерегистрации webhook'
    }
  }
})
