// @shared-route
import { requireAccountRole } from '@app/auth'
import * as getcourseLib from '../../lib/getcourse.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/getcourse/groups'

/**
 * GET /api/getcourse/groups — список групп GetCourse школы.
 * Используется админкой для выбора required_group_ids.
 * Только Admin.
 */
export const getcourseGroupsRoute = app.get('/', async (ctx, _req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос списка групп GetCourse`,
    payload: {}
  })

  try {
    const result = await getcourseLib.getGroups(ctx)

    if (!result.ok) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] Ошибка получения групп`,
        payload: { code: result.error.code, message: result.error.message }
      })
      return { success: false, error: result.error.message }
    }

    // Нормализуем data в {id, name}[]
    const groups = Array.isArray(result.data)
      ? (result.data as Array<{ id: number; name: string }>).filter(
          (g) =>
            typeof g === 'object' &&
            g !== null &&
            typeof g.id === 'number' &&
            typeof g.name === 'string'
        )
      : []

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Список групп получен`,
      payload: { count: groups.length }
    })

    return { success: true, groups }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Необработанная ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
