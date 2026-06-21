// @shared-route
import { AnalyticsDatasets } from '../tables/datasets.table'
import { AnalyticsDatasetCache } from '../tables/dataset-cache.table'
import AnalyticsSettings from '../tables/settings.table'
import { requireAccountRole } from '@app/auth'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'
import {
  loadDatasetCache,
  deleteComponentCache,
  deleteDatasetCache
} from '../lib/datasets/cache-loader'
import { DatasetConfig, DatasetComponent } from '../shared/datasetTypes'
import { genSocketId, sendDataToSocket } from '@app/socket'
import { addActiveJobId } from './settings'

/**
 * Безопасное логирование через ctx.account.log
 * Не падает, если ctx.account или ctx.account.log отсутствуют
 */
function safeAccountLog(
  ctx: app.Ctx,
  message: string,
  options?: { level?: string; json?: any }
): void {
  try {
    if (ctx.account && typeof ctx.account.log === 'function') {
      ctx.account.log(message, options || {})
    }
  } catch (error) {
    // Игнорируем ошибки логирования, чтобы не прерывать выполнение
    Debug.warn(
      ctx,
      `[safeAccountLog] ошибка логирования: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Глубокое сравнение двух объектов
 * Возвращает true, если объекты имеют одинаковую структуру и значения
 */
function deepEqual(obj1: any, obj2: any): boolean {
  // Если оба null или undefined
  if (obj1 === null || obj1 === undefined) {
    return obj2 === null || obj2 === undefined
  }
  if (obj2 === null || obj2 === undefined) {
    return false
  }

  // Если это примитивные типы
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2
  }

  // Если это массивы
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false
      }
    }
    return true
  }

  // Если один массив, а другой нет
  if (Array.isArray(obj1) || Array.isArray(obj2)) {
    return false
  }

  // Сравнение объектов
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      return false
    }
  }

  return true
}

/**
 * API для работы с датасетами
 * Датасет - это набор выбранных событий с параметрами для последующей визуализации
 */

/**
 * Job для загрузки кэша датасета
 */
// @ts-ignore
const loadDatasetCacheJob = app.job('/load-dataset-cache', async (ctx, params) => {
  const { datasetId, components, socketId, clearExisting = false } = params

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet, removeActiveJobId } = await import('./settings')
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(ctx, '[datasets:cache-job] обнаружен флаг остановки всех джобов, прекращаем работу')
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../tables/active-jobs.table')

        // Поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'load-dataset-cache'
          }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (meta.datasetId === datasetId && meta.socketId === socketId) {
              return record.taskId
            }
          }
        }
        return null
      } catch (error) {
        return null
      }
    }

    const taskIdToRemove = await getCurrentTaskIdFromTableForStop()
    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
    }
    return // Самоуничтожение
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../tables/active-jobs.table')

      // Поиск по metadata
      const records = await ActiveJobs.findAll(ctx, {
        where: {
          jobType: 'load-dataset-cache'
        }
      })

      // Ищем запись, которая соответствует текущему джобу по datasetId и socketId
      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (meta.datasetId === datasetId && meta.socketId === socketId) {
            Debug.info(
              ctx,
              `[datasets:cache-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, socketId=${socketId})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[datasets:cache-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  // Функция для удаления taskId текущего джоба из списка активных
  // ВАЖНО: Всегда читает taskId из таблицы в конце, не использует переданный currentTaskId
  const removeCurrentJobFromList = async () => {
    // ВСЕГДА читаем taskId из таблицы в конце джоба
    const taskIdToRemove = await getCurrentTaskIdFromTable()

    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
      Debug.info(
        ctx,
        `[datasets:cache-job] удалён taskId ${taskIdToRemove} из списка активных джобов`
      )
    } else {
      Debug.warn(
        ctx,
        `[datasets:cache-job] taskId не найден в таблице для удаления (datasetId=${datasetId}, socketId=${socketId})`
      )
    }
  }

  try {
    Debug.info(
      ctx,
      `[datasets:cache-job] начало загрузки кэша для датасета ${datasetId}, socketId: ${socketId || 'не указан'}`
    )

    await loadDatasetCache(ctx, datasetId, components, socketId, clearExisting)

    Debug.info(ctx, `[datasets:cache-job] завершена загрузка кэша для датасета ${datasetId}`)

    // ✅ Удаляем taskId при нормальном завершении
    await removeCurrentJobFromList()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    Debug.error(
      ctx,
      `[datasets:cache-job] ошибка загрузки кэша для датасета ${datasetId}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[datasets:cache-job] stack trace: ${errorStack}`)
    }

    // Отправляем сообщение об ошибке через WebSocket, если указан
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-error',
          data: {
            datasetId,
            error: errorMessage
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[datasets:cache-job] ошибка отправки сообщения об ошибке через WebSocket: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // ✅ Удаляем taskId при ошибке
    await removeCurrentJobFromList()
  }
})

/**
 * Job для удаления датасета (сначала кэш, потом датасет)
 */
// @ts-ignore
const deleteDatasetJob = app.job('/delete-dataset', async (ctx, params) => {
  const { datasetId, datasetName, socketId, parentTaskId } = params

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet, removeActiveJobId, normalizeParentTaskId } = await import(
    './settings'
  )
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(ctx, '[datasets:delete-job] обнаружен флаг остановки всех джобов, прекращаем работу')
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../tables/active-jobs.table')

        // Сначала ищем по parentTaskId, если он есть
        const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
        if (normalizedParentTaskId) {
          const records = await ActiveJobs.findAll(ctx, {
            where: {
              jobType: 'delete-dataset',
              parentTaskId: normalizedParentTaskId
            }
          })
          if (records.length > 0) {
            return records[0].taskId
          }
        }

        // Fallback - поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: { jobType: 'delete-dataset' }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (meta.datasetId === datasetId && meta.socketId === socketId) {
              return record.taskId
            }
          }
        }
        return null
      } catch (error) {
        return null
      }
    }

    const taskIdToRemove = await getCurrentTaskIdFromTableForStop()
    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
    }
    return // Самоуничтожение
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  // Использует parentTaskId для надёжного поиска, если он передан
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../tables/active-jobs.table')
      const { normalizeParentTaskId } = await import('./settings')

      // ✅ ПРИОРИТЕТ 1: Если есть parentTaskId - ищем по нему (наиболее надёжный способ)
      const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
      if (normalizedParentTaskId) {
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'delete-dataset',
            parentTaskId: normalizedParentTaskId
          }
        })

        // Находим запись, которая является дочерней для parentTaskId
        // Такая запись должна быть одна, т.к. каждый джоб создаёт только одного наследника
        if (records.length > 0) {
          const foundTaskId = records[0].taskId
          Debug.info(
            ctx,
            `[datasets:delete-job] найден taskId ${foundTaskId} по parentTaskId ${parentTaskId}`
          )
          return foundTaskId
        }

        Debug.warn(
          ctx,
          `[datasets:delete-job] не найден taskId по parentTaskId ${parentTaskId}, пробуем поиск по metadata`
        )
      }

      // ✅ ПРИОРИТЕТ 2: Fallback - поиск по metadata (для первого джоба или если parentTaskId не помог)
      const records = await ActiveJobs.findAll(ctx, {
        where: { jobType: 'delete-dataset' }
      })

      // Ищем запись, которая соответствует текущему джобу по datasetId и socketId
      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (meta.datasetId === datasetId && meta.socketId === socketId) {
            Debug.info(
              ctx,
              `[datasets:delete-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, socketId=${socketId})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[datasets:delete-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  // Функция для удаления taskId текущего джоба из списка активных
  // ВАЖНО: Всегда читает taskId из таблицы в конце, не использует переданный currentTaskId
  const removeCurrentJobFromList = async () => {
    // ВСЕГДА читаем taskId из таблицы в конце джоба
    const taskIdToRemove = await getCurrentTaskIdFromTable()

    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
      Debug.info(
        ctx,
        `[datasets:delete-job] удалён taskId ${taskIdToRemove} из списка активных джобов`
      )
    } else {
      Debug.warn(
        ctx,
        `[datasets:delete-job] taskId не найден в таблице для удаления (datasetId=${datasetId}, socketId=${socketId || 'не указан'})`
      )
    }
  }

  Debug.info(
    ctx,
    `[datasets:delete-job] === НАЧАЛО JOB УДАЛЕНИЯ === datasetId=${datasetId}, datasetName=${datasetName || 'без названия'}, socketId=${socketId || 'не указан'}, parentTaskId=${parentTaskId || 'не указан'}`
  )

  try {
    // ВАЖНО: НЕ отправляем dataset-delete-start здесь, т.к. клиент еще не подписался
    // Сообщение будет отправлено в deleteDatasetCache после подтверждения готовности клиента

    // Шаг 1: Запускаем удаление кэша датасета (асинхронно через джобы)
    // deleteDatasetCache выполняет:
    // 1. findOneBy - проверка существования записей
    // 2. countBy - получение общего количества
    // 3. Отправка прогресс-бара с общим количеством
    // 4. Запуск джобы для удаления первого сегмента (следующие сегменты удаляются с интервалом 2 секунды)
    // ВАЖНО: Удаление датасета будет запущено автоматически после завершения удаления кэша
    // в deleteCacheSegmentJob, когда все сегменты будут удалены и countBy подтвердит отсутствие записей
    Debug.info(ctx, `[datasets:delete-job] запуск удаления кэша для датасета ${datasetId}`)

    // ✅ Получаем taskId текущего джоба перед вызовом deleteDatasetCache
    // Это нужно для передачи в цепочку сегментов, чтобы они могли удалить taskId родительского джоба после завершения
    const currentTaskId = await getCurrentTaskIdFromTable()

    // Передаем информацию о том, что после завершения удаления кэша нужно удалить датасет
    // Также передаем currentTaskId, чтобы deleteCacheSegmentJob мог удалить taskId родительского джоба после завершения
    const totalCount = await deleteDatasetCache(
      ctx,
      datasetId,
      socketId,
      true,
      currentTaskId || undefined
    ) // true = нужно удалить датасет после кэша

    if (totalCount === 0) {
      // Кэш пуст - удаление завершено сразу
      // ВАЖНО: deleteDatasetCache может удалить датасет асинхронно через waitForClientReady,
      // поэтому нужно явно проверить и удалить датасет, если он ещё существует
      Debug.info(ctx, `[datasets:delete-job] кэш пуст (0 записей), проверяем и удаляем датасет`)

      try {
        // Проверяем, существует ли датасет
        const dataset = await AnalyticsDatasets.findById(ctx, datasetId)
        if (dataset) {
          // Датасет ещё существует - удаляем его явно
          Debug.info(ctx, `[datasets:delete-job] датасет ${datasetId} ещё существует, удаляем его`)
          await AnalyticsDatasets.delete(ctx, datasetId)
          Debug.info(ctx, `[datasets:delete-job] датасет ${datasetId} успешно удалён`)

          // Отправляем сообщение о завершении удаления датасета
          if (socketId) {
            try {
              await sendDataToSocket(ctx, socketId, {
                type: 'dataset-delete-complete',
                data: {
                  datasetId
                }
              })
              Debug.info(
                ctx,
                `[datasets:delete-job] отправлено сообщение о завершении удаления датасета ${datasetId}`
              )
            } catch (socketError) {
              Debug.warn(
                ctx,
                `[datasets:delete-job] ошибка отправки сообщения о завершении удаления датасета: ${socketError instanceof Error ? socketError.message : String(socketError)}`
              )
            }
          }
        } else {
          // Датасет уже удалён (возможно, через deleteDatasetCache)
          Debug.info(
            ctx,
            `[datasets:delete-job] датасет ${datasetId} уже удалён (возможно, через deleteDatasetCache)`
          )
        }
      } catch (deleteError) {
        const errorMessage =
          deleteError instanceof Error ? deleteError.message : String(deleteError)
        Debug.error(
          ctx,
          `[datasets:delete-job] ошибка удаления датасета ${datasetId}: ${errorMessage}`
        )

        // Отправляем сообщение об ошибке
        if (socketId) {
          try {
            await sendDataToSocket(ctx, socketId, {
              type: 'dataset-delete-error',
              data: {
                datasetId,
                error: errorMessage
              }
            })
          } catch (socketError) {
            Debug.warn(
              ctx,
              `[datasets:delete-job] ошибка отправки сообщения об ошибке: ${socketError instanceof Error ? socketError.message : String(socketError)}`
            )
          }
        }

        // Пробрасываем ошибку, чтобы job был помечен как неудачный
        throw deleteError
      }

      Debug.info(
        ctx,
        `[datasets:delete-job] === JOB ЗАВЕРШЁН УСПЕШНО === (кэш пуст, датасет удалён)`
      )

      // ✅ Удаляем taskId при нормальном завершении (кэш пуст, датасет удалён)
      await removeCurrentJobFromList()
    } else {
      // Кэш не пуст - удаление продолжается в фоне через джобы сегментов
      // ВАЖНО: НЕ удаляем taskId здесь, т.к. удаление продолжается в фоне
      // taskId будет удалён в deleteCacheSegmentJob после завершения удаления кэша
      Debug.info(
        ctx,
        `[datasets:delete-job] запланировано удаление кэша: ${totalCount} записей в ${Math.ceil(totalCount / 1000)} сегментах`
      )
      Debug.info(
        ctx,
        `[datasets:delete-job] удаление датасета будет выполнено после завершения удаления кэша`
      )
      Debug.info(
        ctx,
        `[datasets:delete-job] === JOB ЗАВЕРШЁН УСПЕШНО === (удаление кэша продолжается в фоне)`
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    Debug.error(ctx, `[datasets:delete-job] ошибка удаления датасета ${datasetId}: ${errorMessage}`)
    if (errorStack) {
      Debug.error(ctx, `[datasets:delete-job] stack trace: ${errorStack}`)
    }

    // Отправляем сообщение об ошибке
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-delete-error',
          data: {
            datasetId,
            error: errorMessage
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[datasets:delete-job] ошибка отправки сообщения об ошибке: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // ✅ Удаляем taskId при ошибке
    await removeCurrentJobFromList()

    throw error // Пробрасываем ошибку, чтобы job был помечен как неудачный
  }
})

/**
 * Job для удаления всего кэша датасета (используется только для обновления компонентов)
 */
// @ts-ignore
const deleteDatasetCacheJob = app.job('/delete-dataset-cache', async (ctx, params) => {
  const { datasetId, socketId, parentTaskId } = params

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet, removeActiveJobId, normalizeParentTaskId } = await import(
    './settings'
  )
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(
      ctx,
      '[datasets:delete-cache-job] обнаружен флаг остановки всех джобов, прекращаем работу'
    )
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../tables/active-jobs.table')

        // Сначала ищем по parentTaskId, если он есть
        const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
        if (normalizedParentTaskId) {
          const records = await ActiveJobs.findAll(ctx, {
            where: {
              jobType: 'delete-dataset-cache',
              parentTaskId: normalizedParentTaskId
            }
          })
          if (records.length > 0) {
            return records[0].taskId
          }
        }

        // Fallback - поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: { jobType: 'delete-dataset-cache' }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (meta.datasetId === datasetId && meta.socketId === socketId) {
              return record.taskId
            }
          }
        }
        return null
      } catch (error) {
        return null
      }
    }

    const taskIdToRemove = await getCurrentTaskIdFromTableForStop()
    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
    }
    return // Самоуничтожение
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  // Использует parentTaskId для надёжного поиска, если он передан
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../tables/active-jobs.table')
      const { normalizeParentTaskId } = await import('./settings')

      // ✅ ПРИОРИТЕТ 1: Если есть parentTaskId - ищем по нему (наиболее надёжный способ)
      const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
      if (normalizedParentTaskId) {
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'delete-dataset-cache',
            parentTaskId: normalizedParentTaskId
          }
        })

        if (records.length > 0) {
          const foundTaskId = records[0].taskId
          Debug.info(
            ctx,
            `[datasets:delete-cache-job] найден taskId ${foundTaskId} по parentTaskId ${parentTaskId}`
          )
          return foundTaskId
        }

        Debug.warn(
          ctx,
          `[datasets:delete-cache-job] не найден taskId по parentTaskId ${parentTaskId}, пробуем поиск по metadata`
        )
      }

      // ✅ ПРИОРИТЕТ 2: Fallback - поиск по metadata (для первого джоба или если parentTaskId не помог)
      const records = await ActiveJobs.findAll(ctx, {
        where: { jobType: 'delete-dataset-cache' }
      })

      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (meta.datasetId === datasetId && meta.socketId === socketId) {
            Debug.info(
              ctx,
              `[datasets:delete-cache-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, socketId=${socketId})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[datasets:delete-cache-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  // Функция для удаления taskId текущего джоба из списка активных
  // ВАЖНО: Всегда читает taskId из таблицы в конце, не использует переданный currentTaskId
  const removeCurrentJobFromList = async () => {
    const taskIdToRemove = await getCurrentTaskIdFromTable()

    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
      Debug.info(
        ctx,
        `[datasets:delete-cache-job] удалён taskId ${taskIdToRemove} из списка активных джобов`
      )
    } else {
      Debug.warn(
        ctx,
        `[datasets:delete-cache-job] taskId не найден в таблице для удаления (datasetId=${datasetId}, socketId=${socketId || 'не указан'})`
      )
    }
  }

  try {
    Debug.info(
      ctx,
      `[datasets:delete-cache-job] начало удаления кэша для датасета ${datasetId}, socketId: ${socketId || 'не указан'}`
    )

    await deleteDatasetCache(ctx, datasetId, socketId)

    Debug.info(ctx, `[datasets:delete-cache-job] завершено удаление кэша для датасета ${datasetId}`)

    // ✅ Удаляем taskId при нормальном завершении
    await removeCurrentJobFromList()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    Debug.error(
      ctx,
      `[datasets:delete-cache-job] ошибка удаления кэша для датасета ${datasetId}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[datasets:delete-cache-job] stack trace: ${errorStack}`)
    }

    // Отправляем сообщение об ошибке через WebSocket, если указан
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-error',
          data: {
            datasetId,
            error: errorMessage
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[datasets:delete-cache-job] ошибка отправки сообщения об ошибке через WebSocket: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // ✅ Удаляем taskId при ошибке
    await removeCurrentJobFromList()
  }
})

/**
 * Job для обновления кэша датасета (удаление + загрузка)
 * Выполняет удаление кэша для указанных компонентов, затем загружает новый кэш
 */
// @ts-ignore
const updateDatasetCacheJob = app.job('/update-dataset-cache', async (ctx, params) => {
  const {
    datasetId,
    componentsToDelete, // Массив { componentId, componentTitle } для удаления
    componentsToLoad, // Массив компонентов для загрузки
    socketId
  } = params

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet, removeActiveJobId } = await import('./settings')
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(
      ctx,
      '[datasets:update-cache-job] обнаружен флаг остановки всех джобов, прекращаем работу'
    )
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../tables/active-jobs.table')

        // Поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'update-dataset-cache'
          }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (meta.datasetId === datasetId && meta.socketId === socketId) {
              return record.taskId
            }
          }
        }
        return null
      } catch (error) {
        return null
      }
    }

    const taskIdToRemove = await getCurrentTaskIdFromTableForStop()
    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
    }
    return // Самоуничтожение
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../tables/active-jobs.table')

      // Поиск по metadata
      const records = await ActiveJobs.findAll(ctx, {
        where: {
          jobType: 'update-dataset-cache'
        }
      })

      // Ищем запись, которая соответствует текущему джобу по datasetId и socketId
      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (meta.datasetId === datasetId && meta.socketId === socketId) {
            Debug.info(
              ctx,
              `[datasets:update-cache-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, socketId=${socketId})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[datasets:update-cache-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  // Функция для удаления taskId текущего джоба из списка активных
  // ВАЖНО: Всегда читает taskId из таблицы в конце, не использует переданный currentTaskId
  const removeCurrentJobFromList = async () => {
    // ВСЕГДА читаем taskId из таблицы в конце джоба
    const taskIdToRemove = await getCurrentTaskIdFromTable()

    if (taskIdToRemove) {
      await removeActiveJobId(ctx, taskIdToRemove)
      Debug.info(
        ctx,
        `[datasets:update-cache-job] удалён taskId ${taskIdToRemove} из списка активных джобов`
      )
    } else {
      Debug.warn(
        ctx,
        `[datasets:update-cache-job] taskId не найден в таблице для удаления (datasetId=${datasetId}, socketId=${socketId})`
      )
    }
  }

  try {
    Debug.info(
      ctx,
      `[datasets:update-cache-job] начало обновления кэша для датасета ${datasetId}, socketId: ${socketId || 'не указан'}`
    )
    Debug.info(
      ctx,
      `[datasets:update-cache-job] компонентов для удаления: ${componentsToDelete?.length || 0}, для загрузки: ${componentsToLoad?.length || 0}`
    )

    // Шаг 1: Удаляем кэш для указанных компонентов
    if (componentsToDelete && Array.isArray(componentsToDelete) && componentsToDelete.length > 0) {
      Debug.info(
        ctx,
        `[datasets:update-cache-job] начало удаления кэша для ${componentsToDelete.length} компонентов`
      )

      for (const compToDelete of componentsToDelete) {
        try {
          await deleteComponentCache(ctx, datasetId, compToDelete.componentId, socketId)
          Debug.info(
            ctx,
            `[datasets:update-cache-job] удалён кэш для компонента ${compToDelete.componentId}`
          )
        } catch (deleteError) {
          const errorMessage =
            deleteError instanceof Error ? deleteError.message : String(deleteError)
          Debug.error(
            ctx,
            `[datasets:update-cache-job] ошибка удаления кэша для компонента ${compToDelete.componentId}: ${errorMessage}`
          )

          // Отправляем сообщение об ошибке через WebSocket
          if (socketId) {
            try {
              await sendDataToSocket(ctx, socketId, {
                type: 'dataset-cache-delete-error',
                data: {
                  datasetId,
                  componentId: compToDelete.componentId,
                  error: errorMessage
                }
              })
            } catch (socketError) {
              Debug.warn(
                ctx,
                `[datasets:update-cache-job] ошибка отправки сообщения об ошибке удаления: ${socketError instanceof Error ? socketError.message : String(socketError)}`
              )
            }
          }
        }
      }

      Debug.info(ctx, `[datasets:update-cache-job] завершено удаление кэша для всех компонентов`)
    }

    // Шаг 2: Загружаем новый кэш для указанных компонентов
    if (componentsToLoad && Array.isArray(componentsToLoad) && componentsToLoad.length > 0) {
      Debug.info(
        ctx,
        `[datasets:update-cache-job] начало загрузки кэша для ${componentsToLoad.length} компонентов`
      )

      await loadDatasetCache(ctx, datasetId, componentsToLoad, socketId, false)

      Debug.info(ctx, `[datasets:update-cache-job] завершена загрузка кэша для всех компонентов`)
    } else {
      Debug.info(
        ctx,
        `[datasets:update-cache-job] нет компонентов для загрузки, пропускаем загрузку`
      )
    }

    Debug.info(
      ctx,
      `[datasets:update-cache-job] завершено обновление кэша для датасета ${datasetId}`
    )

    // ✅ Удаляем taskId при нормальном завершении
    await removeCurrentJobFromList()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    Debug.error(
      ctx,
      `[datasets:update-cache-job] ошибка обновления кэша для датасета ${datasetId}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[datasets:update-cache-job] stack trace: ${errorStack}`)
    }

    // Отправляем сообщение об ошибке через WebSocket, если указан
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-error',
          data: {
            datasetId,
            error: errorMessage
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[datasets:update-cache-job] ошибка отправки сообщения об ошибке через WebSocket: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // ✅ Удаляем taskId при ошибке
    await removeCurrentJobFromList()
  }
})

/**
 * GET /list - Получить список всех датасетов
 */
// @ts-ignore
export const apiDatasetsListRoute = app.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:list')

  const allDatasets = await AnalyticsDatasets.findAll(ctx, {})
  Debug.info(ctx, `[datasets:list] найдено ${allDatasets.length} записей`)

  return {
    success: true,
    datasets: allDatasets.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }))
  }
})

/**
 * GET /:id - Получить датасет по ID
 */
// @ts-ignore
export const apiDatasetGetRoute = app.get('/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:get')

  const datasetId = req.params.id as string
  const dataset = await AnalyticsDatasets.findById(ctx, datasetId)

  if (!dataset) {
    return {
      success: false,
      error: 'Dataset not found'
    }
  }

  return {
    success: true,
    dataset: {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      config: dataset.config,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    }
  }
})

/**
 * POST /create - Создать новый датасет
 */
// @ts-ignore
export const apiDatasetCreateRoute = app.post('/create', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:create')

  const { name, description, config, socketId } = req.body

  if (!name) {
    return {
      success: false,
      error: 'Name is required'
    }
  }

  const dataset = await AnalyticsDatasets.create(ctx, {
    name,
    description: description || '',
    config: config || '{"components":[]}'
  })

  Debug.info(ctx, `[datasets:create] создан датасет ${dataset.id} (${dataset.name})`)

  // Парсим конфигурацию и запускаем загрузку кэша
  let finalSocketId: string | null = null

  Debug.info(
    ctx,
    `[datasets:create] парсинг конфигурации датасета ${dataset.id}, config: ${dataset.config}`
  )

  try {
    const datasetConfig: DatasetConfig = JSON.parse(dataset.config || '{"components":[]}')

    Debug.info(
      ctx,
      `[datasets:create] распарсенная конфигурация: ${JSON.stringify(datasetConfig)}, количество компонентов: ${datasetConfig.components?.length || 0}`
    )

    if (datasetConfig.components && datasetConfig.components.length > 0) {
      // Генерируем socketId для прогресса
      // ВАЖНО: sendDataToSocket требует raw socketId, а subscribeToData требует encoded socketId
      // Поэтому для job передаем rawSocketId, а клиенту возвращаем encodedSocketId
      // Игнорируем socketId от клиента и всегда генерируем новый, чтобы гарантировать соответствие
      const rawSocketId = `dataset-cache-${dataset.id}`

      // Всегда генерируем encoded socketId из rawSocketId для клиента
      // Это гарантирует, что job (используя rawSocketId) и клиент (используя encodedSocketId) будут синхронизированы
      try {
        finalSocketId = await genSocketId(ctx, rawSocketId)
        Debug.info(
          ctx,
          `[datasets:create] сгенерирован socketId для датасета ${dataset.id}: rawSocketId=${rawSocketId}, encodedSocketId=${finalSocketId}`
        )
        if (socketId) {
          Debug.warn(
            ctx,
            `[datasets:create] игнорирован переданный клиентом socketId (${socketId}), используется сгенерированный: ${finalSocketId}`
          )
        }
      } catch (genError) {
        Debug.error(
          ctx,
          `[datasets:create] ошибка генерации socketId: ${genError instanceof Error ? genError.message : String(genError)}`
        )
        // Продолжаем без socketId, но логируем ошибку
      }

      // Запускаем асинхронную загрузку кэша (clearExisting=false, т.к. это первый раз)
      // ВАЖНО: В job передаем rawSocketId, т.к. sendDataToSocket требует raw socketId
      // Клиент подписывается на encodedSocketId (finalSocketId), который мы возвращаем в ответе
      try {
        const taskId = await loadDatasetCacheJob.scheduleJobAsap(ctx, {
          datasetId: dataset.id,
          components: datasetConfig.components,
          socketId: rawSocketId, // Используем rawSocketId для sendDataToSocket
          clearExisting: false
        })

        // Добавляем taskId в список активных джобов с jobType и metadata
        await addActiveJobId(ctx, taskId, {
          jobType: 'load-dataset-cache',
          metadata: {
            datasetId: dataset.id,
            socketId: rawSocketId
          }
        })

        Debug.info(
          ctx,
          `[datasets:create] запущена загрузка кэша для датасета ${dataset.id} с rawSocketId: ${rawSocketId}, encodedSocketId для клиента: ${finalSocketId}, taskId=${taskId}`
        )
      } catch (jobError) {
        Debug.error(
          ctx,
          `[datasets:create] КРИТИЧЕСКАЯ ОШИБКА запуска job загрузки кэша: ${jobError instanceof Error ? jobError.message : String(jobError)}`
        )
        Debug.error(
          ctx,
          `[datasets:create] stack trace запуска job: ${jobError instanceof Error ? jobError.stack : 'нет stack trace'}`
        )
        // Не возвращаем socketId, если job не запустился, чтобы клиент не ждал обновлений, которые никогда не придут
        finalSocketId = null
        Debug.warn(
          ctx,
          `[datasets:create] socketId сброшен, т.к. job не удалось запустить для датасета ${dataset.id}`
        )
      }
    } else {
      Debug.info(
        ctx,
        `[datasets:create] нет компонентов для загрузки кэша в датасете ${dataset.id}, config: ${JSON.stringify(datasetConfig)}`
      )
    }
  } catch (error) {
    Debug.error(
      ctx,
      `[datasets:create] ошибка запуска загрузки кэша: ${error instanceof Error ? error.message : String(error)}`
    )
    // Не прерываем создание датасета из-за ошибки загрузки кэша
  }

  const response: any = {
    success: true,
    dataset: {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      config: dataset.config,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    }
  }

  // Добавляем socketId в ответ, если он был создан
  if (finalSocketId) {
    response.socketId = finalSocketId
    Debug.info(ctx, `[datasets:create] socketId добавлен в ответ: ${finalSocketId}`)
  } else {
    Debug.warn(ctx, `[datasets:create] socketId не был создан для датасета ${dataset.id}`)
  }

  return response
})

/**
 * POST /update/:id - Обновить датасет
 */
// @ts-ignore
export const apiDatasetUpdateRoute = app.post('/update/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:update')

  const datasetId = req.params.id as string
  const { name, description, config, socketId } = req.body

  Debug.info(
    ctx,
    `[datasets:update] получен запрос на обновление датасета ${datasetId}, socketId из req.body: ${socketId || 'undefined'}, config: ${config ? config.substring(0, 200) : 'undefined'}...`
  )
  safeAccountLog(ctx, '🔍 [datasets:update] запрос получен', {
    level: 'info',
    json: { datasetId, socketIdFromBody: socketId || 'undefined', hasConfig: !!config }
  })

  const existing = await AnalyticsDatasets.findById(ctx, datasetId)
  if (!existing) {
    return {
      success: false,
      error: 'Dataset not found'
    }
  }

  // Используем Heap ID для обновления
  const heapId = existing.id

  // Парсим старую и новую конфигурацию для определения изменений
  let oldConfig: DatasetConfig | null = null
  let newConfig: DatasetConfig | null = null

  try {
    oldConfig = JSON.parse(existing.config || '{"components":[]}')
  } catch (error) {
    Debug.error(
      ctx,
      `[datasets:update] ошибка парсинга старой конфигурации: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const finalConfig = config ?? existing.config
  try {
    newConfig = JSON.parse(finalConfig || '{"components":[]}')
  } catch (error) {
    Debug.error(
      ctx,
      `[datasets:update] ошибка парсинга новой конфигурации: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const updated = await AnalyticsDatasets.update(ctx, {
    id: heapId,
    name: name ?? existing.name,
    description: description ?? existing.description,
    config: finalConfig
  })

  Debug.info(ctx, `[datasets:update] обновлён датасет ${updated.id} (${updated.name})`)

  // Объявляем finalSocketId вне блока, чтобы он был доступен всегда
  let finalSocketId: string | null = null
  let rawSocketId: string | null = null

  // Запускаем загрузку кэша для всех компонентов (используем newConfig, если он есть, иначе парсим из updated.config)
  let configToUse: DatasetConfig | null = newConfig
  Debug.info(
    ctx,
    `[datasets:update] проверка конфигурации: newConfig=${newConfig ? JSON.stringify(newConfig) : 'null'}, updated.config=${updated.config?.substring(0, 200) || 'undefined'}...`
  )

  // Если newConfig не распарсен, парсим из updated.config
  if (!configToUse) {
    try {
      configToUse = JSON.parse(updated.config || '{"components":[]}')
      Debug.info(
        ctx,
        `[datasets:update] распарсена конфигурация из updated.config для загрузки кэша`
      )
    } catch (error) {
      Debug.error(
        ctx,
        `[datasets:update] ошибка парсинга конфигурации для загрузки кэша: ${error instanceof Error ? error.message : String(error)}`
      )
      configToUse = null
    }
  }

  Debug.info(
    ctx,
    `[datasets:update] configToUse после парсинга: ${configToUse ? 'есть' : 'null'}, componentsCount: ${configToUse?.components?.length || 0}`
  )
  safeAccountLog(ctx, '🔍 [datasets:update] configToUse проверен', {
    level: 'info',
    json: {
      hasConfigToUse: !!configToUse,
      componentsCount: configToUse?.components?.length || 0,
      newConfigWasNull: !newConfig,
      updatedConfigLength: updated.config?.length || 0
    }
  })

  // Собираем компоненты для удаления и загрузки
  const componentsToDelete: Array<{ componentId: string; componentTitle: string }> = []
  const componentsToLoad: DatasetComponent[] = []

  if (oldConfig && newConfig) {
    const oldComponentIds = new Set(oldConfig.components.map((c) => c.id))
    const newComponentIds = new Set(newConfig.components.map((c) => c.id))

    // Компоненты для удаления (удалённые)
    for (const oldComponentId of oldComponentIds) {
      if (!newComponentIds.has(oldComponentId)) {
        const oldComponent = oldConfig.components.find((c) => c.id === oldComponentId)
        componentsToDelete.push({
          componentId: oldComponentId,
          componentTitle: oldComponent?.title || `Компонент ${oldComponentId}`
        })
        Debug.info(ctx, `[datasets:update] компонент ${oldComponentId} помечен для удаления кэша`)
      }
    }

    // Компоненты для удаления и загрузки (изменённые)
    for (const newComponent of newConfig.components) {
      const oldComponent = oldConfig.components.find((c) => c.id === newComponent.id)

      if (oldComponent) {
        // Компонент существует - проверяем, изменился ли он
        const hasChanged =
          oldComponent.eventType !== newComponent.eventType ||
          !deepEqual(oldComponent.settings, newComponent.settings)

        if (hasChanged) {
          // Компонент изменился - удаляем старый кэш и загружаем новый
          componentsToDelete.push({
            componentId: newComponent.id,
            componentTitle: newComponent.title || `Компонент ${newComponent.id}`
          })
          componentsToLoad.push(newComponent)
          Debug.info(
            ctx,
            `[datasets:update] компонент ${newComponent.id} помечен для удаления и перезагрузки кэша`
          )
        }
      } else {
        // Новый компонент - только загружаем
        componentsToLoad.push(newComponent)
        Debug.info(
          ctx,
          `[datasets:update] компонент ${newComponent.id} помечен для загрузки кэша (новый)`
        )
      }
    }
  } else if (configToUse && configToUse.components) {
    // Если нет старой конфигурации, просто загружаем все компоненты
    componentsToLoad.push(...configToUse.components)
    Debug.info(
      ctx,
      `[datasets:update] нет старой конфигурации, загружаем все ${componentsToLoad.length} компонентов`
    )
  }

  // Генерируем socketId только если есть компоненты для обновления кэша
  // Используем Heap ID для socketId, так как кэш работает с Heap ID
  if (componentsToDelete.length > 0 || componentsToLoad.length > 0) {
    // Генерируем socketId для прогресса
    rawSocketId = `dataset-cache-${heapId}`

    Debug.info(
      ctx,
      `[datasets:update] проверка socketId: socketId из req.body=${socketId || 'undefined'}, rawSocketId=${rawSocketId}`
    )
    safeAccountLog(ctx, '🔍 [datasets:update] проверка socketId', {
      level: 'info',
      json: { socketIdFromBody: socketId || 'undefined', rawSocketId }
    })

    // Всегда генерируем encoded socketId из rawSocketId для клиента
    // Это гарантирует, что job (используя rawSocketId) и клиент (используя encodedSocketId) будут синхронизированы
    // Игнорируем socketId от клиента, чтобы избежать несоответствия
    Debug.info(ctx, `[datasets:update] генерация socketId для rawSocketId=${rawSocketId}`)
    safeAccountLog(ctx, '🔄 [datasets:update] генерация socketId', {
      level: 'info',
      json: { rawSocketId }
    })

    try {
      finalSocketId = await genSocketId(ctx, rawSocketId)
      Debug.info(
        ctx,
        `[datasets:update] сгенерирован socketId для датасета ${datasetId}: rawSocketId=${rawSocketId}, encodedSocketId=${finalSocketId}`
      )
      if (socketId) {
        Debug.warn(
          ctx,
          `[datasets:update] игнорирован переданный клиентом socketId (${socketId}), используется сгенерированный: ${finalSocketId}`
        )
      }
      safeAccountLog(ctx, '✅ [datasets:update] socketId сгенерирован', {
        level: 'info',
        json: { rawSocketId, encodedSocketId: finalSocketId }
      })
    } catch (genError) {
      Debug.error(
        ctx,
        `[datasets:update] ошибка генерации socketId: ${genError instanceof Error ? genError.message : String(genError)}`
      )
      Debug.error(
        ctx,
        `[datasets:update] stack trace генерации socketId: ${genError instanceof Error ? genError.stack : 'нет stack trace'}`
      )
      safeAccountLog(ctx, '❌ [datasets:update] ошибка генерации socketId', {
        level: 'error',
        json: {
          error: genError instanceof Error ? genError.message : String(genError),
          stack: genError instanceof Error ? genError.stack : 'нет stack trace'
        }
      })
      // Продолжаем без socketId, но логируем ошибку
    }

    Debug.info(
      ctx,
      `[datasets:update] после генерации socketId: finalSocketId=${finalSocketId || 'null'}`
    )
    safeAccountLog(ctx, '🔍 [datasets:update] после генерации socketId', {
      level: 'info',
      json: { finalSocketId: finalSocketId || 'null' }
    })
  }

  // Запускаем job для обновления кэша (удаление + загрузка)
  if ((componentsToDelete.length > 0 || componentsToLoad.length > 0) && rawSocketId) {
    try {
      const taskId = await updateDatasetCacheJob.scheduleJobAsap(ctx, {
        datasetId: heapId, // Используем Heap ID для job, так как кэш работает с Heap ID
        componentsToDelete: componentsToDelete.length > 0 ? componentsToDelete : undefined,
        componentsToLoad: componentsToLoad.length > 0 ? componentsToLoad : undefined,
        socketId: rawSocketId // Используем rawSocketId для sendDataToSocket
      })

      // Добавляем taskId в список активных джобов с jobType и metadata
      await addActiveJobId(ctx, taskId, {
        jobType: 'update-dataset-cache',
        metadata: {
          datasetId: heapId,
          socketId: rawSocketId
        }
      })

      Debug.info(
        ctx,
        `[datasets:update] запущен job обновления кэша для датасета ${datasetId} (Heap ID: ${heapId}): удаление ${componentsToDelete.length} компонентов, загрузка ${componentsToLoad.length} компонентов, rawSocketId: ${rawSocketId}, encodedSocketId для клиента: ${finalSocketId}, taskId=${taskId}`
      )
    } catch (jobError) {
      Debug.error(
        ctx,
        `[datasets:update] КРИТИЧЕСКАЯ ОШИБКА запуска job обновления кэша: ${jobError instanceof Error ? jobError.message : String(jobError)}`
      )
      Debug.error(
        ctx,
        `[datasets:update] stack trace запуска job: ${jobError instanceof Error ? jobError.stack : 'нет stack trace'}`
      )
      // Не возвращаем socketId, если job не запустился
      finalSocketId = null
      Debug.warn(
        ctx,
        `[datasets:update] socketId сброшен, т.к. job не удалось запустить для датасета ${datasetId}`
      )
    }
  } else if (componentsToDelete.length > 0 || componentsToLoad.length > 0) {
    Debug.error(
      ctx,
      `[datasets:update] не удалось создать socketId для датасета ${datasetId}, обновление кэша не запущено`
    )
  } else {
    const componentsInfo = configToUse
      ? `есть (${configToUse.components?.length || 0} компонентов)`
      : 'null'
    Debug.info(
      ctx,
      `[datasets:update] нет компонентов для обновления кэша в датасете ${datasetId}, configToUse: ${componentsInfo}`
    )
  }

  const response: any = {
    success: true,
    dataset: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      config: updated.config,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }

  // Добавляем socketId в ответ, если он был создан (для загрузки кэша или отображения прогресса удаления)
  Debug.info(
    ctx,
    `[datasets:update] перед добавлением socketId в ответ: finalSocketId=${finalSocketId}, тип=${typeof finalSocketId}, componentsToDelete=${componentsToDelete.length}, componentsToLoad=${componentsToLoad.length}`
  )
  safeAccountLog(ctx, '🔍 [datasets:update] перед добавлением socketId в ответ', {
    level: 'info',
    json: {
      finalSocketId: finalSocketId || 'null',
      type: typeof finalSocketId,
      componentsToDelete: componentsToDelete.length,
      componentsToLoad: componentsToLoad.length
    }
  })

  if (finalSocketId) {
    response.socketId = finalSocketId
    Debug.info(ctx, `[datasets:update] socketId добавлен в ответ: ${finalSocketId}`)
    safeAccountLog(ctx, '✅ [datasets:update] socketId добавлен в ответ', {
      level: 'info',
      json: { socketId: finalSocketId }
    })
  } else {
    Debug.warn(
      ctx,
      `[datasets:update] socketId не был создан для датасета ${datasetId}, finalSocketId=${finalSocketId}`
    )
    Debug.warn(
      ctx,
      `[datasets:update] детали: configToUse=${configToUse ? 'есть' : 'null'}, componentsCount=${configToUse?.components?.length || 0}, componentsToDelete=${componentsToDelete.length}, componentsToLoad=${componentsToLoad.length}`
    )
    safeAccountLog(ctx, '⚠️ [datasets:update] socketId НЕ был создан', {
      level: 'warn',
      json: {
        finalSocketId: finalSocketId || 'null',
        hasConfigToUse: !!configToUse,
        componentsCount: configToUse?.components?.length || 0,
        componentsToDelete: componentsToDelete.length,
        componentsToLoad: componentsToLoad.length
      }
    })
  }

  Debug.info(
    ctx,
    `[datasets:update] возвращаемый ответ содержит socketId: ${!!response.socketId}, значение: ${response.socketId || 'undefined'}`
  )
  Debug.info(
    ctx,
    `[datasets:update] полный ответ перед возвратом: ${JSON.stringify(response).substring(0, 500)}`
  )
  safeAccountLog(ctx, '🔍 [datasets:update] финальный ответ', {
    level: 'info',
    json: {
      hasSocketId: !!response.socketId,
      socketId: response.socketId || 'undefined',
      responsePreview: JSON.stringify(response).substring(0, 500)
    }
  })

  return response
})

/**
 * POST /delete/:id - Удалить датасет (роут с параметром для тестов)
 */
// @ts-ignore
export const apiDatasetDeleteRoute = app.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:delete')

  const datasetId = req.params.id as string

  const existing = await AnalyticsDatasets.findById(ctx, datasetId)
  if (!existing) {
    return {
      success: false,
      error: 'Dataset not found'
    }
  }

  // Используем Heap ID для job, так как кэш работает с Heap ID
  const heapId = existing.id

  // Генерируем socketId для отображения прогресса удаления
  let finalSocketId: string | null = null
  let rawSocketId: string | null = null

  try {
    rawSocketId = `dataset-delete-${heapId}`
    finalSocketId = await genSocketId(ctx, rawSocketId)
    Debug.info(
      ctx,
      `[datasets:delete] сгенерирован socketId для удаления датасета ${datasetId} (Heap ID: ${heapId}): rawSocketId=${rawSocketId}, encodedSocketId=${finalSocketId}`
    )
  } catch (genError) {
    Debug.error(
      ctx,
      `[datasets:delete] ошибка генерации socketId: ${genError instanceof Error ? genError.message : String(genError)}`
    )
    // Продолжаем без socketId, но логируем ошибку
  }

  // Запускаем job для удаления датасета (сначала кэш, потом датасет)
  // Job будет работать в фоне и удалит сначала кэш, а затем датасет
  try {
    const taskId = await deleteDatasetJob.scheduleJobAsap(ctx, {
      datasetId: heapId, // Используем Heap ID для job
      datasetName: existing.name,
      socketId: rawSocketId, // Используем rawSocketId для sendDataToSocket
      parentTaskId: undefined // Для первого запуска undefined
    })

    // Добавляем taskId в список активных джобов с jobType и metadata
    await addActiveJobId(ctx, taskId, {
      jobType: 'delete-dataset',
      parentTaskId: undefined, // Для первого запуска undefined
      metadata: {
        datasetId: heapId,
        socketId: rawSocketId
      }
    })

    Debug.info(
      ctx,
      `[datasets:delete] запущен job удаления датасета ${datasetId} (Heap ID: ${heapId}, ${existing.name}), socketId: ${finalSocketId || 'не указан'}, taskId=${taskId}`
    )
  } catch (jobError) {
    Debug.error(
      ctx,
      `[datasets:delete] КРИТИЧЕСКАЯ ОШИБКА запуска job удаления датасета: ${jobError instanceof Error ? jobError.message : String(jobError)}`
    )
    Debug.error(
      ctx,
      `[datasets:delete] stack trace запуска job: ${jobError instanceof Error ? jobError.stack : 'нет stack trace'}`
    )
    // Если job не запустился, возвращаем ошибку
    return {
      success: false,
      error: 'Не удалось запустить удаление датасета'
    }
  }

  const response: any = {
    success: true,
    message: 'Dataset deletion started',
    datasetId: heapId // Возвращаем Heap ID
  }

  // Добавляем socketId в ответ, если он был создан
  if (finalSocketId) {
    response.socketId = finalSocketId
    Debug.info(ctx, `[datasets:delete] socketId добавлен в ответ: ${finalSocketId}`)
  }

  return response
})

/**
 * POST /delete - Удалить датасет (для клиента)
 */
// @ts-ignore
export const apiDatasetDeleteByIdRoute = app.post('/delete', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:delete')

  // Получаем данные из req.body (для JSON запросов) или req.form (для FormData)
  const body = req.body || {}
  const id = body.id
  const _redirect = body._redirect

  if (!id) {
    Debug.error(
      ctx,
      `[datasets:delete] ID датасета не указан, req.body: ${JSON.stringify(req.body)}`
    )
    return {
      success: false,
      error: 'Dataset ID is required'
    }
  }

  const existing = await AnalyticsDatasets.findById(ctx, id)
  if (!existing) {
    return {
      success: false,
      error: 'Dataset not found'
    }
  }

  // Используем Heap ID для job, так как кэш работает с Heap ID
  const heapId = existing.id

  // Генерируем socketId для отображения прогресса удаления
  let finalSocketId: string | null = null
  let rawSocketId: string | null = null

  try {
    rawSocketId = `dataset-delete-${heapId}`
    finalSocketId = await genSocketId(ctx, rawSocketId)
    Debug.info(
      ctx,
      `[datasets:delete] сгенерирован socketId для удаления датасета ${id} (Heap ID: ${heapId}): rawSocketId=${rawSocketId}, encodedSocketId=${finalSocketId}`
    )
  } catch (genError) {
    Debug.error(
      ctx,
      `[datasets:delete] ошибка генерации socketId: ${genError instanceof Error ? genError.message : String(genError)}`
    )
    // Продолжаем без socketId, но логируем ошибку
  }

  // Запускаем job для удаления датасета (сначала кэш, потом датасет)
  // Job будет работать в фоне и удалит сначала кэш, а затем датасет
  try {
    const taskId = await deleteDatasetJob.scheduleJobAsap(ctx, {
      datasetId: heapId, // Используем Heap ID для job
      datasetName: existing.name,
      socketId: rawSocketId, // Используем rawSocketId для sendDataToSocket
      parentTaskId: undefined // Для первого запуска undefined
    })

    // Добавляем taskId в список активных джобов с jobType и metadata
    await addActiveJobId(ctx, taskId, {
      jobType: 'delete-dataset',
      parentTaskId: undefined, // Для первого запуска undefined
      metadata: {
        datasetId: heapId,
        socketId: rawSocketId
      }
    })

    Debug.info(
      ctx,
      `[datasets:delete] запущен job удаления датасета ${id} (${existing.name}), socketId: ${finalSocketId || 'не указан'}, taskId=${taskId}`
    )
  } catch (jobError) {
    Debug.error(
      ctx,
      `[datasets:delete] КРИТИЧЕСКАЯ ОШИБКА запуска job удаления датасета: ${jobError instanceof Error ? jobError.message : String(jobError)}`
    )
    Debug.error(
      ctx,
      `[datasets:delete] stack trace запуска job: ${jobError instanceof Error ? jobError.stack : 'нет stack trace'}`
    )
    // Если job не запустился, возвращаем ошибку
    return {
      success: false,
      error: 'Не удалось запустить удаление датасета'
    }
  }

  // Если указан _redirect - делаем редирект (но только если нет socketId для прогресса)
  if (_redirect && !finalSocketId) {
    return ctx.resp.redirect(_redirect)
  }

  // Если есть socketId, возвращаем JSON ответ для обработки через WebSocket
  const response: any = {
    success: true,
    message: 'Dataset deletion started',
    datasetId: heapId // ВАЖНО: Возвращаем Heap ID, чтобы клиент использовал его для подтверждения готовности
  }

  // Добавляем socketId в ответ, если он был создан
  if (finalSocketId) {
    response.socketId = finalSocketId
    Debug.info(
      ctx,
      `[datasets:delete] socketId добавлен в ответ: ${finalSocketId}, datasetId (Heap ID): ${heapId}`
    )
  } else if (_redirect) {
    // Если нет socketId, но есть redirect - делаем редирект
    return ctx.resp.redirect(_redirect)
  }

  return response
})

/**
 * POST /delete-ready - Подтверждение готовности клиента к получению сообщений об удалении
 * Клиент вызывает этот endpoint после успешной подписки на WebSocket
 */
// @ts-ignore
export const apiDatasetDeleteReadyRoute = app.post('/delete-ready', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:delete-ready')

  const { datasetId } = req.body

  Debug.info(
    ctx,
    `[datasets:delete-ready] === ПОЛУЧЕН ЗАПРОС === datasetId=${datasetId}, req.body=${JSON.stringify(req.body)}`
  )

  if (!datasetId) {
    Debug.error(ctx, `[datasets:delete-ready] datasetId не указан`)
    return {
      success: false,
      error: 'Dataset ID is required'
    }
  }

  try {
    // Устанавливаем флаг готовности клиента
    const readyKey = `dataset_delete_ready_${datasetId}`
    Debug.info(
      ctx,
      `[datasets:delete-ready] === УСТАНОВКА ФЛАГА === datasetId=${datasetId}, readyKey=${readyKey}`
    )

    await AnalyticsSettings.createOrUpdateBy(ctx, 'key', {
      key: readyKey,
      value: 'true',
      description: `Флаг готовности клиента к получению сообщений об удалении датасета ${datasetId}`
    })

    Debug.info(
      ctx,
      `[datasets:delete-ready] === ФЛАГ УСТАНОВЛЕН === datasetId=${datasetId}, readyKey=${readyKey}`
    )

    return {
      success: true,
      message: 'Ready signal received'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    Debug.error(ctx, `[datasets:delete-ready] ошибка: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage
    }
  }
})

/**
 * POST /update - Обновить датасет (для клиента, без параметра в пути)
 */
// @ts-ignore
export const apiDatasetUpdateByIdRoute = app.post('/update', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'datasets:update')

  const { id, name, description, config, socketId } = req.body

  if (!id) {
    return {
      success: false,
      error: 'Dataset ID is required'
    }
  }

  const existing = await AnalyticsDatasets.findById(ctx, id)
  if (!existing) {
    return {
      success: false,
      error: 'Dataset not found'
    }
  }

  // Используем Heap ID для обновления и работы с кэшем
  const heapId = existing.id

  // Парсим старую и новую конфигурацию для определения изменений
  let oldConfig: DatasetConfig | null = null
  let newConfig: DatasetConfig | null = null

  try {
    oldConfig = JSON.parse(existing.config || '{"components":[]}')
  } catch (error) {
    Debug.error(
      ctx,
      `[datasets:update] ошибка парсинга старой конфигурации: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const finalConfig = config ?? existing.config
  try {
    newConfig = JSON.parse(finalConfig || '{"components":[]}')
  } catch (error) {
    Debug.error(
      ctx,
      `[datasets:update] ошибка парсинга новой конфигурации: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const updated = await AnalyticsDatasets.update(ctx, {
    id: heapId,
    name: name ?? existing.name,
    description: description ?? existing.description,
    config: finalConfig
  })

  Debug.info(ctx, `[datasets:update] обновлён датасет ${updated.id} (${updated.name})`)

  // Объявляем finalSocketId вне блока, чтобы он был доступен всегда
  let finalSocketId: string | null = null
  let rawSocketId: string | null = null

  // Запускаем загрузку кэша для всех компонентов (используем newConfig, если он есть, иначе парсим из updated.config)
  let configToUse: DatasetConfig | null = newConfig
  if (!configToUse) {
    try {
      configToUse = JSON.parse(updated.config || '{"components":[]}')
      Debug.info(
        ctx,
        `[datasets:update] распарсена конфигурация из updated.config для загрузки кэша`
      )
    } catch (error) {
      Debug.error(
        ctx,
        `[datasets:update] ошибка парсинга конфигурации для загрузки кэша: ${error instanceof Error ? error.message : String(error)}`
      )
      configToUse = null
    }
  }

  // Собираем компоненты для удаления и загрузки
  const componentsToDelete: Array<{ componentId: string; componentTitle: string }> = []
  const componentsToLoad: DatasetComponent[] = []

  if (oldConfig && newConfig) {
    const oldComponentIds = new Set(oldConfig.components.map((c) => c.id))
    const newComponentIds = new Set(newConfig.components.map((c) => c.id))

    // Компоненты для удаления (удалённые)
    for (const oldComponentId of oldComponentIds) {
      if (!newComponentIds.has(oldComponentId)) {
        const oldComponent = oldConfig.components.find((c) => c.id === oldComponentId)
        componentsToDelete.push({
          componentId: oldComponentId,
          componentTitle: oldComponent?.title || `Компонент ${oldComponentId}`
        })
        Debug.info(ctx, `[datasets:update] компонент ${oldComponentId} помечен для удаления кэша`)
      }
    }

    // Компоненты для удаления и загрузки (изменённые)
    for (const newComponent of newConfig.components) {
      const oldComponent = oldConfig.components.find((c) => c.id === newComponent.id)

      if (oldComponent) {
        // Компонент существует - проверяем, изменился ли он
        const hasChanged =
          oldComponent.eventType !== newComponent.eventType ||
          !deepEqual(oldComponent.settings, newComponent.settings)

        if (hasChanged) {
          // Компонент изменился - удаляем старый кэш и загружаем новый
          componentsToDelete.push({
            componentId: newComponent.id,
            componentTitle: newComponent.title || `Компонент ${newComponent.id}`
          })
          componentsToLoad.push(newComponent)
          Debug.info(
            ctx,
            `[datasets:update] компонент ${newComponent.id} помечен для удаления и перезагрузки кэша`
          )
        }
      } else {
        // Новый компонент - только загружаем
        componentsToLoad.push(newComponent)
        Debug.info(
          ctx,
          `[datasets:update] компонент ${newComponent.id} помечен для загрузки кэша (новый)`
        )
      }
    }
  } else if (configToUse && configToUse.components) {
    // Если нет старой конфигурации, просто загружаем все компоненты
    componentsToLoad.push(...configToUse.components)
    Debug.info(
      ctx,
      `[datasets:update] нет старой конфигурации, загружаем все ${componentsToLoad.length} компонентов`
    )
  }

  // Генерируем socketId только если есть компоненты для обновления кэша
  // Используем Heap ID для socketId, так как кэш работает с Heap ID
  if (componentsToDelete.length > 0 || componentsToLoad.length > 0) {
    // Генерируем socketId для прогресса
    rawSocketId = `dataset-cache-${heapId}`

    try {
      finalSocketId = await genSocketId(ctx, rawSocketId)
      Debug.info(
        ctx,
        `[datasets:update] сгенерирован socketId для датасета ${id} (Heap ID: ${heapId}): rawSocketId=${rawSocketId}, encodedSocketId=${finalSocketId}`
      )
      if (socketId) {
        Debug.warn(
          ctx,
          `[datasets:update] игнорирован переданный клиентом socketId (${socketId}), используется сгенерированный: ${finalSocketId}`
        )
      }
    } catch (genError) {
      Debug.error(
        ctx,
        `[datasets:update] ошибка генерации socketId: ${genError instanceof Error ? genError.message : String(genError)}`
      )
      // Продолжаем без socketId, но логируем ошибку
    }
  }

  // Запускаем job для обновления кэша (удаление + загрузка)
  if ((componentsToDelete.length > 0 || componentsToLoad.length > 0) && rawSocketId) {
    try {
      const taskId = await updateDatasetCacheJob.scheduleJobAsap(ctx, {
        datasetId: heapId, // Используем Heap ID для job, так как кэш работает с Heap ID
        componentsToDelete: componentsToDelete.length > 0 ? componentsToDelete : undefined,
        componentsToLoad: componentsToLoad.length > 0 ? componentsToLoad : undefined,
        socketId: rawSocketId // Используем rawSocketId для sendDataToSocket
      })

      // Добавляем taskId в список активных джобов с jobType и metadata
      await addActiveJobId(ctx, taskId, {
        jobType: 'update-dataset-cache',
        metadata: {
          datasetId: heapId,
          socketId: rawSocketId
        }
      })

      Debug.info(
        ctx,
        `[datasets:update] запущен job обновления кэша для датасета ${id} (Heap ID: ${heapId}): удаление ${componentsToDelete.length} компонентов, загрузка ${componentsToLoad.length} компонентов, rawSocketId: ${rawSocketId}, encodedSocketId для клиента: ${finalSocketId}, taskId=${taskId}`
      )
    } catch (jobError) {
      Debug.error(
        ctx,
        `[datasets:update] КРИТИЧЕСКАЯ ОШИБКА запуска job обновления кэша: ${jobError instanceof Error ? jobError.message : String(jobError)}`
      )
      Debug.error(
        ctx,
        `[datasets:update] stack trace запуска job: ${jobError instanceof Error ? jobError.stack : 'нет stack trace'}`
      )
      // Не возвращаем socketId, если job не запустился
      finalSocketId = null
      Debug.warn(
        ctx,
        `[datasets:update] socketId сброшен, т.к. job не удалось запустить для датасета ${id}`
      )
    }
  } else if (componentsToDelete.length > 0 || componentsToLoad.length > 0) {
    Debug.error(
      ctx,
      `[datasets:update] не удалось создать socketId для датасета ${id}, обновление кэша не запущено`
    )
  } else {
    Debug.info(ctx, `[datasets:update] нет компонентов для обновления кэша в датасете ${id}`)
  }

  const response: any = {
    success: true,
    dataset: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      config: updated.config,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }

  // Добавляем socketId в ответ, если он был создан
  if (finalSocketId) {
    response.socketId = finalSocketId
    Debug.info(ctx, `[datasets:update] socketId добавлен в ответ: ${finalSocketId}`)
  } else {
    Debug.warn(ctx, `[datasets:update] socketId не был создан для датасета ${id}`)
  }

  return response
})

/**
 * GET /component-counts/:datasetId - Получить количество записей для каждого компонента датасета
 */
// @ts-ignore
export const apiDatasetComponentCountsRoute = app.get(
  '/component-counts/:datasetId',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')
    await applyDebugLevel(ctx, 'datasets:component-counts')

    const datasetId = req.params.datasetId as string

    const dataset = await AnalyticsDatasets.findById(ctx, datasetId)
    if (!dataset) {
      return {
        success: false,
        error: 'Dataset not found'
      }
    }

    try {
      // Парсим конфигурацию датасета
      const config = JSON.parse(dataset.config || '{"components":[]}')
      const components = config.components || []

      // Получаем количество записей для каждого компонента
      const componentCounts: Record<string, number> = {}

      for (const component of components) {
        const count = await AnalyticsDatasetCache.countBy(ctx, {
          dataset_id: datasetId,
          component_id: component.id
        })
        componentCounts[component.id] = count
      }

      return {
        success: true,
        componentCounts
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      Debug.error(
        ctx,
        `[datasets:component-counts] ошибка получения количества записей: ${errorMessage}`
      )
      return {
        success: false,
        error: errorMessage
      }
    }
  }
)
