// @shared-route
import AnalyticsSettings from '../tables/settings.table'
import { ActiveJobs, getActiveTaskIds } from '../tables/active-jobs.table'
import { Debug, DebugLevel } from '../shared/debug'
import {
  applyDebugLevel,
  LOG_LEVEL_SETTING_KEY,
  parseDebugLevel,
  persistLogLevel
} from '../lib/logging'
import { cancelScheduledJob } from '@app/jobs'
import { requireAccountRole } from '@app/auth'

export const apiGetSettingsRoute = app.get('/list', async (ctx, req) => {
  await applyDebugLevel(ctx, 'settings:list')

  try {
    Debug.info(ctx, '[settings:list] запрос списка настроек')
    const settings = await AnalyticsSettings.findAll(ctx, {
      limit: 100
    })

    Debug.info(ctx, `[settings:list] найдено ${settings.length} записей`)

    return {
      success: true,
      settings
    }
  } catch (error: any) {
    Debug.error(ctx, `[settings:list] ошибка: ${error?.message || error}`)
    return {
      success: false,
      error: error.message
    }
  }
})

export const apiUpdateSettingRoute = app.post('/update', async (ctx, req) => {
  await applyDebugLevel(ctx, 'settings:update')

  try {
    const { key, value, description } = req.body

    if (!key) {
      Debug.warn(ctx, '[settings:update] отсутствует ключ настройки')
      return { success: false, error: 'Key is required' }
    }

    if (key === LOG_LEVEL_SETTING_KEY) {
      const normalizedLevel = parseDebugLevel(value) as DebugLevel
      await persistLogLevel(ctx, normalizedLevel)

      Debug.info(ctx, `[settings:update] уровень логов обновлён на ${normalizedLevel}`)

      return {
        success: true,
        setting: {
          key: LOG_LEVEL_SETTING_KEY,
          value: normalizedLevel,
          description: description || 'Уровень детализации логов Debug'
        }
      }
    }

    const setting = await AnalyticsSettings.createOrUpdateBy(ctx, 'key', {
      key,
      value: value || '',
      description: description || ''
    })

    Debug.info(ctx, `[settings:update] сохранена настройка ${key}`)

    return {
      success: true,
      setting
    }
  } catch (error: any) {
    Debug.error(ctx, `[settings:update] ошибка: ${error?.message || error}`)
    return {
      success: false,
      error: error.message
    }
  }
})

export const apiDeleteSettingRoute = app.post('/delete', async (ctx, req) => {
  await applyDebugLevel(ctx, 'settings:delete')

  try {
    const { id } = req.body

    if (!id) {
      return { success: false, error: 'ID is required' }
    }

    const existing = await AnalyticsSettings.findById(ctx, id)
    if (!existing) {
      Debug.warn(ctx, `[settings:delete] настройка ${id} не найдена`)
      return { success: false, error: 'Setting not found' }
    }

    if (existing.key === LOG_LEVEL_SETTING_KEY) {
      Debug.warn(ctx, '[settings:delete] попытка удалить системный ключ log_level')
      return { success: false, error: 'System key log_level cannot be removed' }
    }

    await AnalyticsSettings.delete(ctx, id)

    Debug.info(ctx, `[settings:delete] удалена настройка ${existing.key}`)

    return { success: true }
  } catch (error: any) {
    Debug.error(ctx, `[settings:delete] ошибка: ${error?.message || error}`)
    return {
      success: false,
      error: error.message
    }
  }
})

// API для управления фильтром событий
export const apiGetEventFilterRoute = app.get('/event-filter', async (ctx, req) => {
  await applyDebugLevel(ctx, 'settings:event-filter:get')

  try {
    const setting = await AnalyticsSettings.findOneBy(ctx, {
      key: 'events_filter'
    })

    let eventTypes = []
    if (setting && setting.value) {
      try {
        eventTypes = JSON.parse(setting.value)
      } catch {
        // Если не удалось распарсить - возвращаем пустой массив
        eventTypes = []
      }
    }

    return {
      success: true,
      eventTypes
    }
  } catch (error: any) {
    Debug.error(ctx, `[settings:event-filter:get] ошибка: ${error?.message || error}`)
    return {
      success: false,
      error: error.message,
      eventTypes: []
    }
  }
})

export const apiSaveEventFilterRoute = app
  .body((s) => ({
    eventTypes: s.array(s.string())
  }))
  .post('/event-filter', async (ctx, req) => {
    await applyDebugLevel(ctx, 'settings:event-filter:save')

    try {
      const { eventTypes } = req.body

      // Сохраняем фильтр в настройках
      await AnalyticsSettings.createOrUpdateBy(ctx, 'key', {
        key: 'events_filter',
        value: JSON.stringify(eventTypes),
        description: 'Фильтр типов событий для мониторинга'
      })

      Debug.info(ctx, `[settings:event-filter:save] сохранено типов: ${eventTypes.length}`)

      return {
        success: true,
        message: 'Фильтр событий обновлён'
      }
    } catch (error: any) {
      Debug.error(ctx, `[settings:event-filter:save] ошибка: ${error?.message || error}`)
      return {
        success: false,
        error: error.message
      }
    }
  })

/**
 * Вспомогательные функции для управления активными джобами
 * Используются для отслеживания и остановки всех джобов
 *
 * Каждая активная задача хранится в отдельной записи таблицы ActiveJobs
 * Это исключает race condition при одновременном добавлении/удалении
 */

const STOP_ALL_JOBS_KEY = 'stop_all_jobs_flag'

/**
 * Проверить, установлен ли флаг остановки всех джобов
 * Все джобы должны проверять этот флаг в начале выполнения
 * Если флаг установлен - джоб должен самоуничтожиться (прекратить работу)
 */
export async function isStopAllJobsFlagSet(ctx: app.Ctx): Promise<boolean> {
  try {
    const setting = await AnalyticsSettings.findOneBy(ctx, {
      key: STOP_ALL_JOBS_KEY
    })
    return !!setting
  } catch (error) {
    Debug.error(
      ctx,
      `[jobs:check-stop-flag] ошибка проверки флага остановки: ${error instanceof Error ? error.message : String(error)}`
    )
    return false
  }
}

/**
 * Получить список активных taskId из Heap-таблицы
 * Каждая запись = один джоб, нет race condition!
 */
export async function getActiveJobIds(ctx: app.Ctx): Promise<Set<string>> {
  try {
    const taskIds = await getActiveTaskIds(ctx)
    return new Set(taskIds)
  } catch (error) {
    Debug.error(
      ctx,
      `[jobs:get-active] ошибка получения списка активных джобов: ${error instanceof Error ? error.message : String(error)}`
    )
    return new Set<string>()
  }
}

/**
 * Нормализует parentTaskId для безопасного сохранения и запросов
 * Преобразует undefined, null, "undefined", "null" в undefined
 * Остальные значения преобразует в строку
 */
export function normalizeParentTaskId(parentTaskId?: string | number | null): string | undefined {
  if (!parentTaskId || parentTaskId === 'undefined' || parentTaskId === 'null') {
    return undefined
  }
  return String(parentTaskId)
}

/**
 * Добавить taskId в список активных джобов
 * Атомарная операция Heap.create - нет race condition!
 */
export async function addActiveJobId(
  ctx: app.Ctx,
  taskId: string | number,
  options?: {
    jobType?: string
    parentTaskId?: string | number
    metadata?: any
  }
): Promise<void> {
  const taskIdStr = String(taskId)

  try {
    // Проверяем, есть ли уже запись с таким taskId
    const existing = await ActiveJobs.findOneBy(ctx, {
      taskId: taskIdStr
    })

    if (existing) {
      Debug.info(ctx, `[jobs:add] taskId ${taskIdStr} уже в списке активных`)
      return
    }

    // Создаём новую запись - атомарная операция!
    await ActiveJobs.create(ctx, {
      taskId: taskIdStr,
      jobType: options?.jobType,
      parentTaskId: normalizeParentTaskId(options?.parentTaskId),
      metadata: options?.metadata
    })

    Debug.info(
      ctx,
      `[jobs:add] добавлен taskId ${taskIdStr}${options?.jobType ? ` (тип: ${options.jobType})` : ''}`
    )
  } catch (error) {
    Debug.error(
      ctx,
      `[jobs:add] ошибка добавления taskId ${taskIdStr}: ${error instanceof Error ? error.message : String(error)}`
    )
    // Не пробрасываем ошибку, чтобы не прерывать выполнение джоба
  }
}

/**
 * Удалить taskId из списка активных джобов
 * Атомарная операция Heap.delete - идемпотентная!
 */
export async function removeActiveJobId(ctx: app.Ctx, taskId: string | number): Promise<void> {
  const taskIdStr = String(taskId)

  try {
    const record = await ActiveJobs.findOneBy(ctx, {
      taskId: taskIdStr
    })

    if (!record) {
      // Идемпотентность: taskId уже удалён
      Debug.info(ctx, `[jobs:remove] taskId ${taskIdStr} уже отсутствует в списке`)
      return
    }

    // Атомарно удаляем запись
    await ActiveJobs.delete(ctx, record.id)

    Debug.info(ctx, `[jobs:remove] удалён taskId ${taskIdStr}`)
  } catch (error) {
    Debug.error(
      ctx,
      `[jobs:remove] ошибка удаления taskId ${taskIdStr}: ${error instanceof Error ? error.message : String(error)}`
    )
    // Не пробрасываем ошибку, чтобы не прерывать выполнение джоба
  }
}

/**
 * Остановить все активные джобы
 * Атомарно получает список джобов и очищает его
 */
export async function stopAllJobs(ctx: app.Ctx): Promise<{
  success: boolean
  stopped: number
  errors: number
  errorsList: string[]
  message?: string
}> {
  await applyDebugLevel(ctx, 'settings:stop-all-jobs')

  let stopped = 0
  let errors = 0
  const errorsList: string[] = []

  try {
    // 1. СНАЧАЛА устанавливаем флаг остановки (атомарно)
    // Это гарантирует, что новые джобы будут самоуничтожаться
    await AnalyticsSettings.createOrUpdateBy(ctx, 'key', {
      key: STOP_ALL_JOBS_KEY,
      value: 'true',
      description: 'Флаг остановки всех активных джобов'
    })

    Debug.info(
      ctx,
      '[settings:stop-all-jobs] флаг остановки установлен, новые джобы будут самоуничтожаться'
    )

    // 2. Получаем список всех активных джобов
    const records = await ActiveJobs.findAll(ctx)

    if (records.length === 0) {
      // Удаляем флаг, если нет активных джобов
      const flagSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: STOP_ALL_JOBS_KEY
      })
      if (flagSetting) {
        await AnalyticsSettings.delete(ctx, flagSetting.id)
      }

      Debug.info(ctx, '[settings:stop-all-jobs] нет активных джобов')
      return {
        success: true,
        stopped: 0,
        stoppedCount: 0, // Для совместимости с тестами
        errors: 0,
        errorsList: [],
        message: 'Активных задач не найдено'
      }
    }

    Debug.info(ctx, `[settings:stop-all-jobs] найдено ${records.length} активных джобов`)

    // 3. Отменяем каждый джоб
    const cancelPromises = records.map(async (record) => {
      try {
        const taskId = parseInt(record.taskId, 10)
        if (isNaN(taskId)) {
          Debug.warn(ctx, `[settings:stop-all-jobs] некорректный taskId: ${record.taskId}`)
          errors++
          errorsList.push(`Некорректный taskId: ${record.taskId}`)
          return
        }

        await cancelScheduledJob(ctx, taskId)
        stopped++
        Debug.info(
          ctx,
          `[settings:stop-all-jobs] отменён джоб ${taskId}${record.jobType ? ` (${record.jobType})` : ''}`
        )
      } catch (error) {
        errors++
        const errorMessage = error instanceof Error ? error.message : String(error)
        errorsList.push(`Ошибка отмены ${record.taskId}: ${errorMessage}`)
        Debug.warn(
          ctx,
          `[settings:stop-all-jobs] не удалось отменить джоб ${record.taskId}: ${errorMessage}`
        )
      }
    })

    // 4. Ждём завершения всех отмен
    await Promise.all(cancelPromises)

    // 5. Очищаем все записи из таблицы
    await ActiveJobs.deleteAll(ctx, {
      limit: null // Удаляем все записи
    })

    // 6. УДАЛЯЕМ флаг остановки после завершения
    const flagSetting = await AnalyticsSettings.findOneBy(ctx, {
      key: STOP_ALL_JOBS_KEY
    })
    if (flagSetting) {
      await AnalyticsSettings.delete(ctx, flagSetting.id)
      Debug.info(ctx, '[settings:stop-all-jobs] флаг остановки удалён')
    }

    Debug.info(ctx, `[settings:stop-all-jobs] завершено: отменено ${stopped}, ошибок ${errors}`)

    // Формируем сообщение
    let message = ''
    if (stopped > 0 && errors === 0) {
      message = `Успешно остановлено задач: ${stopped}`
    } else if (stopped > 0 && errors > 0) {
      message = `Остановлено задач: ${stopped}, ошибок при остановке: ${errors}`
    } else if (stopped === 0 && errors > 0) {
      message = `Не удалось остановить задачи. Ошибок: ${errors}`
    } else {
      message = 'Не было задач для остановки'
    }

    return {
      success: true,
      stopped,
      stoppedCount: stopped, // Для совместимости с тестами
      errors,
      errorsList,
      message
    }
  } catch (error: any) {
    // В случае ошибки тоже удаляем флаг
    try {
      const flagSetting = await AnalyticsSettings.findOneBy(ctx, {
        key: STOP_ALL_JOBS_KEY
      })
      if (flagSetting) {
        await AnalyticsSettings.delete(ctx, flagSetting.id)
        Debug.info(ctx, '[settings:stop-all-jobs] флаг остановки удалён после ошибки')
      }
    } catch (cleanupError) {
      Debug.error(
        ctx,
        `[settings:stop-all-jobs] не удалось удалить флаг остановки: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
      )
    }

    Debug.error(ctx, `[settings:stop-all-jobs] критическая ошибка: ${error?.message || error}`)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      stopped,
      stoppedCount: stopped, // Для совместимости с тестами
      errors: errors + 1,
      errorsList: [...errorsList, `Критическая ошибка: ${errorMessage}`],
      message: `Критическая ошибка при остановке задач: ${errorMessage}`
    }
  }
}

/**
 * API endpoint для остановки всех джобов
 */
// @shared-route
export const apiStopAllJobsRoute = app.post('/stop-all-jobs', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'settings:stop-all-jobs:api')

  const result = await stopAllJobs(ctx)

  return result
})
