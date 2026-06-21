// @shared-route

import { requireRealUser } from '@app/auth'
import { TelegramChats } from '../tables/chats.table'
import { Projects } from '../tables/projects.table'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import { userIdsMatch } from '../shared/user-utils'

/**
 * GET /api/channels/list
 * Получение списка каналов проекта
 */
export const apiGetChannelsListRoute = app.get('/list', async (ctx, req) => {
  try {
    // Применяем уровень логирования из настроек
    await applyDebugLevel(ctx, 'api/channels/list')
    Debug.info(ctx, '[api/channels/list] Начало обработки запроса на получение списка каналов')

    // Проверка авторизации
    requireRealUser(ctx)
    Debug.info(ctx, `[api/channels/list] Пользователь авторизован: userId=${ctx.user.id}`)

    // Получаем projectId из query параметров
    const projectId = req.query.projectId as string | undefined

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/channels/list] projectId не предоставлен')
      return {
        success: false,
        error: 'projectId обязателен'
      }
    }

    const trimmedProjectId = projectId.trim()
    Debug.info(
      ctx,
      `[api/channels/list] Запрос списка каналов для проекта: projectId=${trimmedProjectId}`
    )

    // Проверяем права доступа к проекту
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/channels/list] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут видеть каналы проекта
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
          `[api/channels/list] Попытка доступа к каналам проекта без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    // Получаем каналы проекта (только каналы, не группы)
    const channels = await TelegramChats.findAll(ctx, {
      where: {
        projectId: trimmedProjectId,
        chatType: 'channel'
      },
      order: { lastSeenAt: 'desc' },
      limit: 1000
    })

    const channelsCount = channels?.length || 0
    Debug.info(ctx, `[api/channels/list] Найдено каналов: ${channelsCount}`)

    if (channelsCount === 0) {
      Debug.warn(ctx, `[api/channels/list] В проекте projectId=${trimmedProjectId} нет каналов`)
    }

    return {
      success: true,
      channels: channels || []
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/channels/list] Ошибка при получении списка каналов: ${error.message}`,
      'E_GET_CHANNELS_LIST'
    )
    Debug.error(ctx, `[api/channels/list] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка каналов'
    }
  }
})
