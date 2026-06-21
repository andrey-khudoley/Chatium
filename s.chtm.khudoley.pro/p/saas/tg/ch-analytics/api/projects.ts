// @shared-route

import { requireRealUser } from '@app/auth'
import { Projects } from '../tables/projects.table'
import { ProjectRequests } from '../tables/project-requests.table'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import { userIdsMatch } from '../shared/user-utils'

/**
 * GET /api/projects/list
 * Получение списка проектов текущего пользователя
 * Администраторы видят все проекты
 */
export const apiGetProjectsListRoute = app.get('/list', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/list')
    Debug.info(ctx, '[api/projects/list] Начало обработки запроса на получение списка проектов')

    // Проверка авторизации
    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/list] Пользователь авторизован: userId=${ctx.user.id}`)

    const isAdmin = ctx.user.is('Admin')
    Debug.info(ctx, `[api/projects/list] Роль пользователя: ${isAdmin ? 'Admin' : 'User'}`)

    let projects

    /*
     * FIXME: Сделать пагинацию или иначе решить проблему с ограничением на 100 записей
     */
    if (isAdmin) {
      // Администраторы видят все проекты
      Debug.info(ctx, '[api/projects/list] Запрос всех проектов (администратор)')
      projects = await Projects.findAll(ctx, {
        order: { createdAt: 'desc' },
        limit: 100
      })
    } else {
      // Обычные пользователи видят только проекты, где они участники или владельцы
      Debug.info(ctx, `[api/projects/list] Запрос проектов для пользователя userId=${ctx.user.id}`)
      const allProjects = await Projects.findAll(ctx, {
        order: { createdAt: 'desc' },
        limit: 100
      })

      // Фильтруем проекты, где пользователь является участником или владельцем
      projects = (allProjects || []).filter((project) => {
        if (!project.members || !Array.isArray(project.members)) {
          return false
        }
        return project.members.some(
          (member: any) =>
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )
      })
    }

    const projectsCount = projects?.length || 0
    Debug.info(ctx, `[api/projects/list] Найдено проектов: ${projectsCount}`)

    // Добавляем информацию о количестве участников для каждого проекта
    const projectsWithStats = (projects || []).map((project) => ({
      ...project,
      membersCount: project.members
        ? Array.isArray(project.members)
          ? project.members.length
          : 0
        : 0
    }))

    return {
      success: true,
      projects: projectsWithStats
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/list] Ошибка при получении списка проектов: ${error.message}`,
      'E_GET_PROJECTS_LIST'
    )
    Debug.error(ctx, `[api/projects/list] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка проектов'
    }
  }
})

/**
 * POST /api/projects/create
 * Создание нового проекта
 */
export const apiCreateProjectRoute = app.post('/create', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/create')
    Debug.info(ctx, '[api/projects/create] Начало создания проекта')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/create] Пользователь авторизован: userId=${ctx.user.id}`)

    const { name, description, settings } = req.body

    if (!name || !name.trim()) {
      Debug.warn(ctx, '[api/projects/create] Название проекта не предоставлено')
      return {
        success: false,
        error: 'Название проекта обязательно'
      }
    }

    const trimmedName = name.trim()
    Debug.info(ctx, `[api/projects/create] Создание проекта: name=${trimmedName}`)

    // Создаём проект с текущим пользователем как владельцем
    const project = await Projects.create(ctx, {
      name: trimmedName,
      description: description ? description.trim() : null,
      members: [
        {
          userId: ctx.user.id,
          role: 'owner'
        }
      ],
      settings: settings || null
    })

    Debug.info(ctx, `[api/projects/create] Проект успешно создан с ID: ${project.id}`)

    return {
      success: true,
      project: {
        ...project,
        membersCount: project.members
          ? Array.isArray(project.members)
            ? project.members.length
            : 0
          : 0
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/create] Ошибка при создании проекта: ${error.message}`,
      'E_CREATE_PROJECT'
    )
    Debug.error(ctx, `[api/projects/create] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при создании проекта'
    }
  }
})

/**
 * POST /api/projects/delete
 * Удаление проекта (только владелец или админ)
 */
export const apiDeleteProjectRoute = app.post('/delete', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/delete')
    Debug.info(ctx, '[api/projects/delete] Начало удаления проекта')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/delete] Пользователь авторизован: userId=${ctx.user.id}`)

    const { projectId } = req.body

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/projects/delete] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    const trimmedProjectId = projectId.trim()
    Debug.info(ctx, `[api/projects/delete] Попытка удаления проекта с ID: ${trimmedProjectId}`)

    // Проверяем, существует ли проект
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/delete] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только владелец или админ может удалить проект
    if (!isAdmin) {
      const isOwner =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner'
        )

      if (!isOwner) {
        Debug.warn(
          ctx,
          `[api/projects/delete] Попытка удаления проекта без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет прав для удаления этого проекта'
        }
      }
    }

    // Удаляем проект
    Debug.info(ctx, `[api/projects/delete] Удаление проекта с ID: ${trimmedProjectId}`)
    await Projects.delete(ctx, trimmedProjectId)

    Debug.info(ctx, `[api/projects/delete] Проект успешно удалён с ID: ${trimmedProjectId}`)

    return {
      success: true,
      message: 'Проект успешно удалён'
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/delete] Ошибка при удалении проекта: ${error.message}`,
      'E_DELETE_PROJECT'
    )
    Debug.error(ctx, `[api/projects/delete] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при удалении проекта'
    }
  }
})

/**
 * GET /api/projects/:id
 * Получение информации о проекте
 */
export const apiGetProjectRoute = app.get('/:id', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/get')
    Debug.info(ctx, '[api/projects/get] Начало получения информации о проекте')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/get] Пользователь авторизован: userId=${ctx.user.id}`)

    const { id } = req.params

    if (!id || !id.trim()) {
      Debug.warn(ctx, '[api/projects/get] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    const trimmedId = id.trim()
    Debug.info(ctx, `[api/projects/get] Запрос информации о проекте с ID: ${trimmedId}`)

    // Получаем проект
    const project = await Projects.findById(ctx, trimmedId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/get] Проект с ID ${trimmedId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут видеть проект
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/projects/get] Попытка доступа к проекту без прав: userId=${ctx.user.id}, projectId=${trimmedId}`
        )
        return {
          success: false,
          error: 'Нет доступа к этому проекту'
        }
      }
    }

    Debug.info(ctx, `[api/projects/get] Проект найден: id=${project.id}, name=${project.name}`)

    return {
      success: true,
      project: {
        ...project,
        membersCount: project.members
          ? Array.isArray(project.members)
            ? project.members.length
            : 0
          : 0
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/get] Ошибка при получении информации о проекте: ${error.message}`,
      'E_GET_PROJECT'
    )
    Debug.error(ctx, `[api/projects/get] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении информации о проекте'
    }
  }
})

/**
 * POST /api/projects/:id/members/remove
 * Удаление участника из проекта (только владелец или админ)
 * URL будет: /api/projects~:id/members/remove
 */
export const apiRemoveProjectMemberRoute = app.post('/:id/members/remove', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/members/remove')
    Debug.info(ctx, '[api/projects/members/remove] Начало удаления участника')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/members/remove] Пользователь авторизован: userId=${ctx.user.id}`)

    const { id } = req.params
    const { userId } = req.body

    if (!id || !id.trim()) {
      Debug.warn(ctx, '[api/projects/members/remove] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    if (!userId || !userId.trim()) {
      Debug.warn(ctx, '[api/projects/members/remove] ID пользователя не предоставлен')
      return {
        success: false,
        error: 'ID пользователя обязателен'
      }
    }

    const trimmedProjectId = id.trim()
    const trimmedUserId = userId.trim()

    Debug.info(
      ctx,
      `[api/projects/members/remove] Удаление участника: projectId=${trimmedProjectId}, userId=${trimmedUserId}`
    )

    // Получаем проект
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/members/remove] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только владелец или админ может удалять участников
    if (!isAdmin) {
      const isOwner =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner'
        )

      if (!isOwner) {
        Debug.warn(
          ctx,
          `[api/projects/members/remove] Попытка удаления участника без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет прав для удаления участников из этого проекта'
        }
      }
    }

    // Проверяем, что пользователь не удаляет последнего владельца
    const members = project.members || []
    if (!Array.isArray(members)) {
      Debug.warn(ctx, `[api/projects/members/remove] Некорректная структура members`)
      return {
        success: false,
        error: 'Некорректная структура данных проекта'
      }
    }

    const memberToRemove = members.find((member: any) => member.userId === trimmedUserId)

    if (!memberToRemove) {
      Debug.warn(
        ctx,
        `[api/projects/members/remove] Пользователь не является участником проекта: userId=${trimmedUserId}`
      )
      return {
        success: false,
        error: 'Пользователь не является участником проекта'
      }
    }

    // Проверяем, что не удаляем последнего владельца
    const owners = members.filter((member: any) => member.role === 'owner')
    if (memberToRemove.role === 'owner' && owners.length === 1) {
      Debug.warn(ctx, `[api/projects/members/remove] Попытка удаления последнего владельца проекта`)
      return {
        success: false,
        error: 'Нельзя удалить последнего владельца проекта'
      }
    }

    // Удаляем участника
    const updatedMembers = members.filter((member: any) => member.userId !== trimmedUserId)

    Debug.info(ctx, `[api/projects/members/remove] Обновление проекта после удаления участника`)
    const updatedProject = await Projects.update(ctx, {
      id: trimmedProjectId,
      members: updatedMembers
    })

    Debug.info(ctx, `[api/projects/members/remove] Участник успешно удалён из проекта`)

    return {
      success: true,
      project: {
        ...updatedProject,
        membersCount: updatedProject.members
          ? Array.isArray(updatedProject.members)
            ? updatedProject.members.length
            : 0
          : 0
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/members/remove] Ошибка при удалении участника: ${error.message}`,
      'E_REMOVE_PROJECT_MEMBER'
    )
    Debug.error(ctx, `[api/projects/members/remove] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при удалении участника'
    }
  }
})

/**
 * POST /api/projects/join-request
 * Подача заявки на присоединение к проекту
 */
export const apiJoinProjectRequestRoute = app.post('/join-request', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/join-request')
    Debug.info(ctx, '[api/projects/join-request] Начало подачи заявки на присоединение')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/join-request] Пользователь авторизован: userId=${ctx.user.id}`)

    const { projectId } = req.body

    if (!projectId || !projectId.trim()) {
      Debug.warn(ctx, '[api/projects/join-request] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    const trimmedProjectId = projectId.trim()
    Debug.info(
      ctx,
      `[api/projects/join-request] Подача заявки на проект: projectId=${trimmedProjectId}`
    )

    // Проверяем, существует ли проект
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/join-request] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    // Проверяем, не является ли пользователь уже участником
    const members = project.members || []
    if (Array.isArray(members)) {
      const isAlreadyMember = members.some((member: any) =>
        userIdsMatch(member.userId, ctx.user?.id)
      )
      if (isAlreadyMember) {
        Debug.warn(
          ctx,
          `[api/projects/join-request] Пользователь уже является участником проекта: userId=${ctx.user.id}`
        )
        return {
          success: false,
          error: 'Вы уже являетесь участником этого проекта'
        }
      }
    }

    // Проверяем, нет ли уже активной заявки со статусом pending
    const existingRequests = await ProjectRequests.findAll(ctx, {
      where: {
        projectId: trimmedProjectId,
        userId: ctx.user.id,
        status: 'pending'
      },
      limit: 1
    })

    if (existingRequests && existingRequests.length > 0) {
      Debug.warn(
        ctx,
        `[api/projects/join-request] У пользователя уже есть активная заявка: userId=${ctx.user.id}`
      )
      return {
        success: false,
        error: 'У вас уже есть активная заявка на присоединение к этому проекту'
      }
    }

    // Создаём заявку
    const request = await ProjectRequests.create(ctx, {
      projectId: trimmedProjectId,
      userId: ctx.user.id,
      status: 'pending',
      requestedAt: new Date()
    })

    Debug.info(ctx, `[api/projects/join-request] Заявка успешно создана с ID: ${request.id}`)

    return {
      success: true,
      request: request
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/join-request] Ошибка при подаче заявки: ${error.message}`,
      'E_JOIN_PROJECT_REQUEST'
    )
    Debug.error(ctx, `[api/projects/join-request] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при подаче заявки'
    }
  }
})

/**
 * GET /api/projects/:id/requests
 * Получение списка входящих заявок на присоединение к проекту
 * Доступ: владелец, участник или админ проекта
 */
export const apiGetProjectRequestsRoute = app.get('/:id/requests', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/requests/list')
    Debug.info(ctx, '[api/projects/requests/list] Начало получения списка заявок')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/requests/list] Пользователь авторизован: userId=${ctx.user.id}`)

    const { id } = req.params

    if (!id || !id.trim()) {
      Debug.warn(ctx, '[api/projects/requests/list] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    const trimmedProjectId = id.trim()
    Debug.info(
      ctx,
      `[api/projects/requests/list] Запрос заявок для проекта: projectId=${trimmedProjectId}`
    )

    // Получаем проект
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/requests/list] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только участники или админ могут видеть заявки
    if (!isAdmin) {
      const hasAccess =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) =>
            userIdsMatch(member.userId, ctx.user?.id) &&
            (member.role === 'owner' || member.role === 'member')
        )

      if (!hasAccess) {
        Debug.warn(
          ctx,
          `[api/projects/requests/list] Попытка доступа к заявкам без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет прав для просмотра заявок этого проекта'
        }
      }
    }

    // Получаем только заявки со статусом pending
    const requests = await ProjectRequests.findAll(ctx, {
      where: {
        projectId: trimmedProjectId,
        status: 'pending'
      },
      order: { requestedAt: 'desc' },
      limit: 100
    })

    Debug.info(ctx, `[api/projects/requests/list] Найдено заявок: ${requests?.length || 0}`)

    return {
      success: true,
      requests: requests || []
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/requests/list] Ошибка при получении списка заявок: ${error.message}`,
      'E_GET_PROJECT_REQUESTS'
    )
    Debug.error(ctx, `[api/projects/requests/list] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении списка заявок'
    }
  }
})

/**
 * POST /api/projects/:id/requests/:requestId/approve
 * Одобрение заявки на присоединение к проекту
 * Доступ: владелец, участник или админ проекта
 */
export const apiApproveProjectRequestRoute = app.post(
  '/:id/requests/:requestId/approve',
  async (ctx, req) => {
    try {
      await applyDebugLevel(ctx, 'api/projects/requests/approve')
      Debug.info(ctx, '[api/projects/requests/approve] Начало одобрения заявки')

      requireRealUser(ctx)
      Debug.info(
        ctx,
        `[api/projects/requests/approve] Пользователь авторизован: userId=${ctx.user.id}`
      )

      const { id, requestId } = req.params

      if (!id || !id.trim()) {
        Debug.warn(ctx, '[api/projects/requests/approve] ID проекта не предоставлен')
        return {
          success: false,
          error: 'ID проекта обязателен'
        }
      }

      if (!requestId || !requestId.trim()) {
        Debug.warn(ctx, '[api/projects/requests/approve] ID заявки не предоставлен')
        return {
          success: false,
          error: 'ID заявки обязателен'
        }
      }

      const trimmedProjectId = id.trim()
      const trimmedRequestId = requestId.trim()

      Debug.info(
        ctx,
        `[api/projects/requests/approve] Одобрение заявки: projectId=${trimmedProjectId}, requestId=${trimmedRequestId}`
      )

      // Получаем проект
      const project = await Projects.findById(ctx, trimmedProjectId)

      if (!project) {
        Debug.warn(ctx, `[api/projects/requests/approve] Проект с ID ${trimmedProjectId} не найден`)
        return {
          success: false,
          error: 'Проект не найден'
        }
      }

      const isAdmin = ctx.user.is('Admin')

      // Проверяем права доступа: только участники или админ могут одобрять заявки
      if (!isAdmin) {
        const hasAccess =
          project.members &&
          Array.isArray(project.members) &&
          project.members.some(
            (member: any) =>
              userIdsMatch(member.userId, ctx.user?.id) &&
              (member.role === 'owner' || member.role === 'member')
          )

        if (!hasAccess) {
          Debug.warn(
            ctx,
            `[api/projects/requests/approve] Попытка одобрения заявки без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
          )
          return {
            success: false,
            error: 'Нет прав для одобрения заявок этого проекта'
          }
        }
      }

      // Получаем заявку
      const request = await ProjectRequests.findById(ctx, trimmedRequestId)

      if (!request) {
        Debug.warn(
          ctx,
          `[api/projects/requests/approve] Заявка с ID ${trimmedRequestId} не найдена`
        )
        return {
          success: false,
          error: 'Заявка не найдена'
        }
      }

      // Проверяем, что заявка относится к этому проекту
      if (request.projectId !== trimmedProjectId) {
        Debug.warn(ctx, `[api/projects/requests/approve] Заявка не относится к указанному проекту`)
        return {
          success: false,
          error: 'Заявка не относится к указанному проекту'
        }
      }

      // Проверяем, что заявка в статусе pending
      if (request.status !== 'pending') {
        Debug.warn(
          ctx,
          `[api/projects/requests/approve] Заявка уже обработана: status=${request.status}`
        )
        return {
          success: false,
          error: 'Заявка уже обработана'
        }
      }

      // Обновляем статус заявки
      await ProjectRequests.update(ctx, {
        id: trimmedRequestId,
        status: 'approved',
        processedAt: new Date(),
        processedBy: ctx.user.id
      })

      // Добавляем пользователя в участники проекта
      const members = project.members || []
      const updatedMembers = Array.isArray(members) ? [...members] : []

      // Проверяем, что пользователь ещё не добавлен (на случай race condition)
      const isAlreadyMember = updatedMembers.some((member: any) => member.userId === request.userId)
      if (!isAlreadyMember) {
        updatedMembers.push({
          userId: request.userId,
          role: 'member'
        })

        await Projects.update(ctx, {
          id: trimmedProjectId,
          members: updatedMembers
        })
      }

      Debug.info(ctx, `[api/projects/requests/approve] Заявка успешно одобрена`)

      return {
        success: true,
        message: 'Заявка успешно одобрена'
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[api/projects/requests/approve] Ошибка при одобрении заявки: ${error.message}`,
        'E_APPROVE_PROJECT_REQUEST'
      )
      Debug.error(ctx, `[api/projects/requests/approve] Stack trace: ${error.stack || 'N/A'}`)
      return {
        success: false,
        error: error.message || 'Ошибка при одобрении заявки'
      }
    }
  }
)

/**
 * POST /api/projects/:id/requests/:requestId/reject
 * Отклонение заявки на присоединение к проекту
 * Доступ: владелец, участник или админ проекта
 */
export const apiRejectProjectRequestRoute = app.post(
  '/:id/requests/:requestId/reject',
  async (ctx, req) => {
    try {
      await applyDebugLevel(ctx, 'api/projects/requests/reject')
      Debug.info(ctx, '[api/projects/requests/reject] Начало отклонения заявки')

      requireRealUser(ctx)
      Debug.info(
        ctx,
        `[api/projects/requests/reject] Пользователь авторизован: userId=${ctx.user.id}`
      )

      const { id, requestId } = req.params

      if (!id || !id.trim()) {
        Debug.warn(ctx, '[api/projects/requests/reject] ID проекта не предоставлен')
        return {
          success: false,
          error: 'ID проекта обязателен'
        }
      }

      if (!requestId || !requestId.trim()) {
        Debug.warn(ctx, '[api/projects/requests/reject] ID заявки не предоставлен')
        return {
          success: false,
          error: 'ID заявки обязателен'
        }
      }

      const trimmedProjectId = id.trim()
      const trimmedRequestId = requestId.trim()

      Debug.info(
        ctx,
        `[api/projects/requests/reject] Отклонение заявки: projectId=${trimmedProjectId}, requestId=${trimmedRequestId}`
      )

      // Получаем проект
      const project = await Projects.findById(ctx, trimmedProjectId)

      if (!project) {
        Debug.warn(ctx, `[api/projects/requests/reject] Проект с ID ${trimmedProjectId} не найден`)
        return {
          success: false,
          error: 'Проект не найден'
        }
      }

      const isAdmin = ctx.user.is('Admin')

      // Проверяем права доступа: только участники или админ могут отклонять заявки
      if (!isAdmin) {
        const hasAccess =
          project.members &&
          Array.isArray(project.members) &&
          project.members.some(
            (member: any) =>
              userIdsMatch(member.userId, ctx.user?.id) &&
              (member.role === 'owner' || member.role === 'member')
          )

        if (!hasAccess) {
          Debug.warn(
            ctx,
            `[api/projects/requests/reject] Попытка отклонения заявки без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
          )
          return {
            success: false,
            error: 'Нет прав для отклонения заявок этого проекта'
          }
        }
      }

      // Получаем заявку
      const request = await ProjectRequests.findById(ctx, trimmedRequestId)

      if (!request) {
        Debug.warn(ctx, `[api/projects/requests/reject] Заявка с ID ${trimmedRequestId} не найдена`)
        return {
          success: false,
          error: 'Заявка не найдена'
        }
      }

      // Проверяем, что заявка относится к этому проекту
      if (request.projectId !== trimmedProjectId) {
        Debug.warn(ctx, `[api/projects/requests/reject] Заявка не относится к указанному проекту`)
        return {
          success: false,
          error: 'Заявка не относится к указанному проекту'
        }
      }

      // Проверяем, что заявка в статусе pending
      if (request.status !== 'pending') {
        Debug.warn(
          ctx,
          `[api/projects/requests/reject] Заявка уже обработана: status=${request.status}`
        )
        return {
          success: false,
          error: 'Заявка уже обработана'
        }
      }

      // Обновляем статус заявки
      await ProjectRequests.update(ctx, {
        id: trimmedRequestId,
        status: 'rejected',
        processedAt: new Date(),
        processedBy: ctx.user.id
      })

      Debug.info(ctx, `[api/projects/requests/reject] Заявка успешно отклонена`)

      return {
        success: true,
        message: 'Заявка успешно отклонена'
      }
    } catch (error: any) {
      Debug.error(
        ctx,
        `[api/projects/requests/reject] Ошибка при отклонении заявки: ${error.message}`,
        'E_REJECT_PROJECT_REQUEST'
      )
      Debug.error(ctx, `[api/projects/requests/reject] Stack trace: ${error.stack || 'N/A'}`)
      return {
        success: false,
        error: error.message || 'Ошибка при отклонении заявки'
      }
    }
  }
)

/**
 * POST /api/projects/:id/update
 * Обновление информации о проекте (название, описание)
 * Доступ: только владелец или админ
 */
export const apiUpdateProjectRoute = app.post('/:id/update', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/update')
    Debug.info(ctx, '[api/projects/update] Начало обновления проекта')

    requireRealUser(ctx)
    Debug.info(ctx, `[api/projects/update] Пользователь авторизован: userId=${ctx.user.id}`)

    const { id } = req.params
    const { name, description } = req.body

    if (!id || !id.trim()) {
      Debug.warn(ctx, '[api/projects/update] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    const trimmedProjectId = id.trim()
    Debug.info(ctx, `[api/projects/update] Обновление проекта: projectId=${trimmedProjectId}`)

    // Получаем проект
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/update] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только владелец или админ может обновлять проект
    if (!isAdmin) {
      const isOwner =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner'
        )

      if (!isOwner) {
        Debug.warn(
          ctx,
          `[api/projects/update] Попытка обновления проекта без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет прав для обновления этого проекта'
        }
      }
    }

    // Формируем объект для обновления
    const updateData: any = {}

    if (name !== undefined) {
      if (!name || !name.trim()) {
        Debug.warn(ctx, '[api/projects/update] Название проекта не может быть пустым')
        return {
          success: false,
          error: 'Название проекта обязательно и не может быть пустым'
        }
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description && description.trim() ? description.trim() : null
    }

    // Проверяем, что есть что обновлять
    if (Object.keys(updateData).length === 0) {
      Debug.warn(ctx, '[api/projects/update] Нет данных для обновления')
      return {
        success: false,
        error: 'Нет данных для обновления'
      }
    }

    Debug.info(
      ctx,
      `[api/projects/update] Обновление проекта с данными: ${JSON.stringify(updateData)}`
    )
    const updatedProject = await Projects.update(ctx, {
      id: trimmedProjectId,
      ...updateData
    })

    Debug.info(ctx, `[api/projects/update] Проект успешно обновлён`)

    return {
      success: true,
      project: {
        ...updatedProject,
        membersCount: updatedProject.members
          ? Array.isArray(updatedProject.members)
            ? updatedProject.members.length
            : 0
          : 0
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/update] Ошибка при обновлении проекта: ${error.message}`,
      'E_UPDATE_PROJECT'
    )
    Debug.error(ctx, `[api/projects/update] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при обновлении проекта'
    }
  }
})

/**
 * POST /api/projects/:id/transfer-ownership
 * Передача прав владельца проекта другому участнику
 * Доступ: только текущий владелец или админ
 */
export const apiTransferOwnershipRoute = app.post('/:id/transfer-ownership', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/projects/transfer-ownership')
    Debug.info(ctx, '[api/projects/transfer-ownership] Начало передачи прав владельца')

    requireRealUser(ctx)
    Debug.info(
      ctx,
      `[api/projects/transfer-ownership] Пользователь авторизован: userId=${ctx.user.id}`
    )

    const { id } = req.params
    const { newOwnerUserId } = req.body

    if (!id || !id.trim()) {
      Debug.warn(ctx, '[api/projects/transfer-ownership] ID проекта не предоставлен')
      return {
        success: false,
        error: 'ID проекта обязателен'
      }
    }

    if (!newOwnerUserId || !newOwnerUserId.trim()) {
      Debug.warn(ctx, '[api/projects/transfer-ownership] ID нового владельца не предоставлен')
      return {
        success: false,
        error: 'ID нового владельца обязателен'
      }
    }

    const trimmedProjectId = id.trim()
    const trimmedNewOwnerUserId = newOwnerUserId.trim()

    Debug.info(
      ctx,
      `[api/projects/transfer-ownership] Передача прав: projectId=${trimmedProjectId}, newOwnerUserId=${trimmedNewOwnerUserId}`
    )

    // Получаем проект
    const project = await Projects.findById(ctx, trimmedProjectId)

    if (!project) {
      Debug.warn(ctx, `[api/projects/transfer-ownership] Проект с ID ${trimmedProjectId} не найден`)
      return {
        success: false,
        error: 'Проект не найден'
      }
    }

    const isAdmin = ctx.user.is('Admin')

    // Проверяем права доступа: только текущий владелец или админ может передавать права
    if (!isAdmin) {
      const isOwner =
        project.members &&
        Array.isArray(project.members) &&
        project.members.some(
          (member: any) => userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner'
        )

      if (!isOwner) {
        Debug.warn(
          ctx,
          `[api/projects/transfer-ownership] Попытка передачи прав без прав: userId=${ctx.user.id}, projectId=${trimmedProjectId}`
        )
        return {
          success: false,
          error: 'Нет прав для передачи прав владельца этого проекта'
        }
      }
    }

    // Проверяем, что новый владелец является участником проекта
    const members = project.members || []
    if (!Array.isArray(members)) {
      Debug.warn(ctx, `[api/projects/transfer-ownership] Некорректная структура members`)
      return {
        success: false,
        error: 'Некорректная структура данных проекта'
      }
    }

    const newOwnerMember = members.find((member: any) =>
      userIdsMatch(member.userId, trimmedNewOwnerUserId)
    )

    if (!newOwnerMember) {
      Debug.warn(
        ctx,
        `[api/projects/transfer-ownership] Новый владелец не является участником проекта: userId=${trimmedNewOwnerUserId}`
      )
      return {
        success: false,
        error: 'Новый владелец должен быть участником проекта'
      }
    }

    // Проверяем, что новый владелец не является текущим владельцем
    if (newOwnerMember.role === 'owner') {
      Debug.warn(ctx, `[api/projects/transfer-ownership] Новый владелец уже является владельцем`)
      return {
        success: false,
        error: 'Пользователь уже является владельцем проекта'
      }
    }

    // Обновляем роли участников
    const updatedMembers = members.map((member: any) => {
      if (userIdsMatch(member.userId, trimmedNewOwnerUserId)) {
        // Новый владелец
        return {
          ...member,
          role: 'owner'
        }
      } else if (userIdsMatch(member.userId, ctx.user?.id) && member.role === 'owner') {
        // Текущий владелец становится участником
        return {
          ...member,
          role: 'member'
        }
      }
      return member
    })

    Debug.info(ctx, `[api/projects/transfer-ownership] Обновление участников проекта`)
    const updatedProject = await Projects.update(ctx, {
      id: trimmedProjectId,
      members: updatedMembers
    })

    Debug.info(ctx, `[api/projects/transfer-ownership] Права владельца успешно переданы`)

    return {
      success: true,
      project: {
        ...updatedProject,
        membersCount: updatedProject.members
          ? Array.isArray(updatedProject.members)
            ? updatedProject.members.length
            : 0
          : 0
      }
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/projects/transfer-ownership] Ошибка при передаче прав: ${error.message}`,
      'E_TRANSFER_OWNERSHIP'
    )
    Debug.error(ctx, `[api/projects/transfer-ownership] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при передаче прав владельца'
    }
  }
})
