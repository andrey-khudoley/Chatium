// @shared-route

import { requireRealUser } from '@app/auth'
import { request } from '@app/request'
import { TrackingLinks } from '../tables/tracking-links.table'
import { LinkClicks } from '../tables/link-clicks.table'
import { TelegramChats } from '../tables/chats.table'
import { BotTokens } from '../tables/bot-tokens.table'
import { Projects } from '../tables/projects.table'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import { userIdsMatch } from '../shared/user-utils'

/**
 * POST /api/links/create
 * Создание новой ссылки для отслеживания
 */
export const apiCreateLinkRoute = app.post('/create', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/links/create')
    Debug.info(ctx, '[api/links/create] Начало создания ссылки')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/links/create] Пользователь авторизован: userId=${ctx.user.id}`)

    const { name, placementUrl, channelId, botId, projectId } = req.body

    if (!name || !name.trim()) {
      Debug.warn(ctx, '[api/links/create] Название ссылки не предоставлено')
      return {
        success: false,
        error: 'Название ссылки обязательно'
      }
    }

    if (!channelId || !channelId.trim()) {
      Debug.warn(ctx, '[api/links/create] channelId не предоставлен')
      return {
        success: false,
        error: 'Канал обязателен'
      }
    }

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/links/create] projectId не предоставлен')
      return {
        success: false,
        error: 'projectId обязателен'
      }
    }

    const trimmedProjectId = projectId.trim()
    const trimmedChannelId = channelId.trim()
    const trimmedBotId = botId ? botId.trim() : null

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/links/create] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

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
          `[api/links/create] Попытка создания ссылки без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Проверяем, что канал существует и принадлежит проекту
    const channel = await TelegramChats.findById(ctx, trimmedChannelId)

    if (!channel) {
      Debug.warn(ctx, `[api/links/create] Канал с ID ${trimmedChannelId} не найден`)
      return {
        success: false,
        error: 'Канал не найден'
      }
    }

    if (channel.projectId !== trimmedProjectId) {
      Debug.warn(
        ctx,
        `[api/links/create] Канал не принадлежит проекту: channelId=${trimmedChannelId}, projectId=${trimmedProjectId}`
      )
      return {
        success: false,
        error: 'Канал не принадлежит этому проекту'
      }
    }

    // Определяем botId
    let finalBotId: string

    if (trimmedBotId) {
      // Если botId передан, проверяем его
      const bot = await BotTokens.findById(ctx, trimmedBotId)
      if (!bot || bot.projectId !== trimmedProjectId) {
        Debug.warn(
          ctx,
          `[api/links/create] Бот с ID ${trimmedBotId} не найден или не принадлежит проекту`
        )
        return {
          success: false,
          error: 'Бот не найден или не принадлежит этому проекту'
        }
      }
      finalBotId = trimmedBotId
    } else {
      // Если botId не передан, используем botId из канала
      finalBotId = channel.botId
    }

    // Создаём ссылку
    const link = await TrackingLinks.create(ctx, {
      name: name.trim(),
      placementUrl: placementUrl ? placementUrl.trim() : null,
      channelId: trimmedChannelId,
      botId: finalBotId,
      projectId: trimmedProjectId
    })

    Debug.info(ctx, `[api/links/create] Ссылка успешно создана: id=${link.id}`)

    return {
      success: true,
      link: link
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/links/create] Ошибка при создании ссылки: ${error.message}`,
      'E_CREATE_LINK'
    )
    Debug.error(ctx, `[api/links/create] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при создании ссылки'
    }
  }
})

/**
 * GET /api/links/list
 * Получение списка ссылок проекта
 */
export const apiGetLinksListRoute = app.get('/list', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/links/list')
    Debug.info(ctx, '[api/links/list] Начало обработки запроса на получение списка ссылок')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/links/list] Пользователь авторизован: userId=${ctx.user.id}`)

    const projectId = req.query.projectId as string | undefined
    const channelId = req.query.channelId as string | undefined

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/links/list] projectId не предоставлен')
      return {
        success: false,
        error: 'projectId обязателен'
      }
    }

    const trimmedProjectId = projectId.trim()
    const trimmedChannelId = channelId ? channelId.trim() : null

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/links/list] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

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
          `[api/links/list] Попытка доступа к ссылкам без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Формируем условия поиска
    const where: any = {
      projectId: trimmedProjectId
    }

    if (trimmedChannelId) {
      where.channelId = trimmedChannelId
    }

    // Получаем ссылки
    const links = await TrackingLinks.findAll(ctx, {
      where: where,
      order: { createdAt: 'desc' },
      limit: 1000
    })

    const linksCount = links?.length || 0
    Debug.info(ctx, `[api/links/list] Найдено ссылок: ${linksCount}`)

    // Для каждой ссылки подсчитываем статистику
    const linksWithStats = []
    if (links && links.length > 0) {
      for (const link of links) {
        try {
          const clicksCount = await LinkClicks.countBy(ctx, {
            linkId: link.id
          })

          // Для подсчёта подписок используем findAll и фильтруем на уровне приложения
          // так как Heap не поддерживает фильтрацию по наличию значения для опциональных DateTime полей
          const allClicks = await LinkClicks.findAll(ctx, {
            where: {
              linkId: link.id
            }
          })

          const subscribesCount = allClicks.filter((click) => click.subscribedAt != null).length

          linksWithStats.push({
            ...link,
            clicksCount: clicksCount || 0,
            subscribesCount: subscribesCount || 0
          })
        } catch (statsError: any) {
          Debug.error(
            ctx,
            `[api/links/list] Ошибка подсчёта статистики для ссылки ${link.id}: ${statsError.message}`
          )
          linksWithStats.push({
            ...link,
            clicksCount: 0,
            subscribesCount: 0
          })
        }
      }
    }

    return {
      success: true,
      links: linksWithStats
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/links/list] Ошибка при получении списка ссылок: ${error.message}`,
      'E_GET_LINKS_LIST'
    )
    Debug.error(ctx, `[api/links/list] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка ссылок'
    }
  }
})

/**
 * GET /api/links/:id
 * Получение информации о ссылке
 */
export const apiGetLinkRoute = app.get('/:id', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/links/get')
    Debug.info(ctx, '[api/links/get] Начало обработки запроса на получение ссылки')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/links/get] Пользователь авторизован: userId=${ctx.user.id}`)

    const linkId = req.params.id

    if (!linkId || !linkId.trim()) {
      Debug.warn(ctx, '[api/links/get] linkId не предоставлен')
      return {
        success: false,
        error: 'linkId обязателен'
      }
    }

    const trimmedLinkId = linkId.trim()

    // Получаем ссылку
    const link = await TrackingLinks.findById(ctx, trimmedLinkId)

    if (!link) {
      Debug.warn(ctx, `[api/links/get] Ссылка с ID ${trimmedLinkId} не найдена`)
      return {
        success: false,
        error: 'Ссылка не найдена'
      }
    }

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, link.projectId)

    if (!project) {
      Debug.warn(ctx, `[api/links/get] Проект с ID ${link.projectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

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
          `[api/links/get] Попытка доступа к ссылке без прав: userId=${ctx.user.id}, linkId=${trimmedLinkId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этой ссылке'
        }
      }
    }

    Debug.info(ctx, `[api/links/get] Ссылка успешно получена: id=${link.id}`)

    return {
      success: true,
      link: link
    }
  } catch (error: any) {
    Debug.error(ctx, `[api/links/get] Ошибка при получении ссылки: ${error.message}`, 'E_GET_LINK')
    Debug.error(ctx, `[api/links/get] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении ссылки'
    }
  }
})

/**
 * POST /api/links/delete
 * Удаление ссылки с отзывом инвайт-линков и удалением связанных данных
 */
export const apiDeleteLinkRoute = app.post('/delete', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/links/delete')
    Debug.info(ctx, '[api/links/delete] Начало удаления ссылки')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/links/delete] Пользователь авторизован: userId=${ctx.user.id}`)

    const { linkId } = req.body

    if (!linkId || !linkId.trim()) {
      Debug.warn(ctx, '[api/links/delete] linkId не предоставлен')
      return {
        success: false,
        error: 'linkId обязателен'
      }
    }

    const trimmedLinkId = linkId.trim()

    // Получаем ссылку
    const link = await TrackingLinks.findById(ctx, trimmedLinkId)

    if (!link) {
      Debug.warn(ctx, `[api/links/delete] Ссылка с ID ${trimmedLinkId} не найдена`)
      return {
        success: false,
        error: 'Ссылка не найдена'
      }
    }

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, link.projectId)

    if (!project) {
      Debug.warn(ctx, `[api/links/delete] Проект с ID ${link.projectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

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
          `[api/links/delete] Попытка удаления ссылки без прав: userId=${ctx.user.id}, linkId=${trimmedLinkId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этой ссылке'
        }
      }
    }

    // Получаем информацию о боте для отзыва инвайт-линка
    const bot = await BotTokens.findById(ctx, link.botId)

    if (!bot) {
      Debug.warn(ctx, `[api/links/delete] Бот с ID ${link.botId} не найден`)
      // Продолжаем удаление даже если бот не найден
    }

    // 1. Отзываем инвайт-линк в Telegram, если он есть
    if (link.inviteLink && bot) {
      try {
        Debug.info(ctx, `[api/links/delete] Отзыв инвайт-линка в Telegram: ${link.inviteLink}`)

        // Получаем chatId из канала
        const channel = await TelegramChats.findById(ctx, link.channelId)

        if (!channel) {
          Debug.warn(
            ctx,
            `[api/links/delete] Канал с ID ${link.channelId} не найден, пропускаем отзыв инвайт-линка`
          )
        } else {
          const trimmedToken = bot.token.trim()
          const telegramApiUrl = `https://api.telegram.org/bot${trimmedToken}/revokeChatInviteLink`

          Debug.info(
            ctx,
            `[api/links/delete] Параметры отзыва: chat_id=${channel.chatId}, invite_link=${link.inviteLink}`
          )

          const revokeResponse = await request({
            url: telegramApiUrl,
            method: 'post',
            json: {
              chat_id: channel.chatId,
              invite_link: link.inviteLink
            },
            responseType: 'json',
            throwHttpErrors: false,
            timeout: 10000
          })

          const revokeBody = revokeResponse.body as any

          Debug.info(
            ctx,
            `[api/links/delete] Ответ от Telegram API: statusCode=${revokeResponse.statusCode}, body=${JSON.stringify(revokeBody)}`
          )

          if (revokeResponse.statusCode === 200 && revokeBody?.ok) {
            Debug.info(ctx, `[api/links/delete] Инвайт-линк успешно отозван в Telegram`)
          } else {
            const errorMessage = revokeBody?.description || 'Ошибка отзыва инвайт-линка'
            Debug.warn(
              ctx,
              `[api/links/delete] Ошибка отзыва инвайт-линка в Telegram: statusCode=${revokeResponse.statusCode}, error=${errorMessage}`
            )
            if (revokeBody?.error_code) {
              Debug.warn(ctx, `[api/links/delete] Код ошибки Telegram: ${revokeBody.error_code}`)
            }
            // Продолжаем удаление даже если отзыв не удался
          }
        }
      } catch (revokeError: any) {
        Debug.error(
          ctx,
          `[api/links/delete] Исключение при отзыве инвайт-линка: ${revokeError.message}`,
          'E_REVOKE_INVITE_LINK'
        )
        Debug.error(ctx, `[api/links/delete] Stack trace: ${revokeError.stack || 'N/A'}`)
        // Продолжаем удаление даже если отзыв не удался
      }
    } else {
      if (!link.inviteLink) {
        Debug.info(ctx, `[api/links/delete] Инвайт-линк отсутствует, пропускаем отзыв`)
      }
      if (!bot) {
        Debug.warn(ctx, `[api/links/delete] Бот не найден, пропускаем отзыв инвайт-линка`)
      }
    }

    // 2. Отзываем публичную ссылку (устанавливаем revokedAt)
    Debug.info(ctx, `[api/links/delete] Установка revokedAt для ссылки ${trimmedLinkId}`)
    await TrackingLinks.update(ctx, {
      id: trimmedLinkId,
      revokedAt: new Date()
    })

    // 3. Удаляем все связанные данные из LinkClicks
    Debug.info(ctx, `[api/links/delete] Удаление всех переходов по ссылке ${trimmedLinkId}`)
    const allClicks = await LinkClicks.findAll(ctx, {
      where: {
        linkId: trimmedLinkId
      }
    })

    if (allClicks && allClicks.length > 0) {
      Debug.info(ctx, `[api/links/delete] Найдено переходов для удаления: ${allClicks.length}`)
      for (const click of allClicks) {
        try {
          await LinkClicks.delete(ctx, click.id)
        } catch (deleteError: any) {
          Debug.error(
            ctx,
            `[api/links/delete] Ошибка удаления перехода ${click.id}: ${deleteError.message}`
          )
        }
      }
      Debug.info(ctx, `[api/links/delete] Все переходы удалены`)
    } else {
      Debug.info(ctx, `[api/links/delete] Переходов для удаления не найдено`)
    }

    // 4. Удаляем саму ссылку из TrackingLinks
    Debug.info(ctx, `[api/links/delete] Удаление ссылки ${trimmedLinkId} из TrackingLinks`)
    await TrackingLinks.delete(ctx, trimmedLinkId)

    Debug.info(ctx, `[api/links/delete] Ссылка успешно удалена: id=${trimmedLinkId}`)

    return {
      success: true,
      message: 'Ссылка успешно удалена'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/links/delete] Ошибка при удалении ссылки: ${error.message}`,
      'E_DELETE_LINK'
    )
    Debug.error(ctx, `[api/links/delete] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при удалении ссылки'
    }
  }
})
