// @shared
// @ts-ignore
import { gcQueryAi } from '@gc-mcp-server/sdk'
import { AnalyticsDatasetCache } from '../../tables/dataset-cache.table'
import { buildEventFilterConditions } from '../events/filters'
import {
  DatasetComponent,
  FilterRoot,
  FilterCondition,
  FilterGroup
} from '../../shared/datasetTypes'
import { sendDataToSocket } from '@app/socket'
import { Debug } from '../../shared/debug'
import { addActiveJobId, removeActiveJobId, normalizeParentTaskId } from '../../api/settings'
import AnalyticsSettings from '../../tables/settings.table'

/**
 * Джоба для проверки готовности клиента и продолжения удаления
 * Используется только если клиент не успел подтвердить готовность сразу
 */
// @ts-ignore
const checkClientReadyJob = app.job('/check-client-ready', async (ctx, params) => {
  const {
    datasetId,
    socketId,
    shouldDeleteDataset,
    attempt = 0,
    maxAttempts = 20,
    parentTaskId,
    parentDeleteDatasetTaskId
  } = params as any

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet, removeActiveJobId } = await import('../../api/settings')
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(
      ctx,
      '[cache-loader:check-ready-job] обнаружен флаг остановки всех джобов, прекращаем работу'
    )
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../../tables/active-jobs.table')

        // Сначала ищем по parentTaskId, если он есть
        const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
        if (normalizedParentTaskId) {
          const records = await ActiveJobs.findAll(ctx, {
            where: {
              jobType: 'check-client-ready',
              parentTaskId: normalizedParentTaskId
            }
          })
          if (records.length > 0) {
            return records[0].taskId
          }
        }

        // Fallback - поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: { jobType: 'check-client-ready' }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (
              meta.datasetId === datasetId &&
              meta.socketId === socketId &&
              (meta.attempt || 0) === attempt
            ) {
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
    return
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  // Использует parentTaskId для надёжного поиска, если он передан
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../../tables/active-jobs.table')

      // ✅ ПРИОРИТЕТ 1: Если есть parentTaskId - ищем по нему (наиболее надёжный способ)
      const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
      if (normalizedParentTaskId) {
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'check-client-ready',
            parentTaskId: normalizedParentTaskId
          }
        })

        if (records.length > 0) {
          const foundTaskId = records[0].taskId
          Debug.info(
            ctx,
            `[cache-loader:check-ready-job] найден taskId ${foundTaskId} по parentTaskId ${parentTaskId}`
          )
          return foundTaskId
        }

        Debug.warn(
          ctx,
          `[cache-loader:check-ready-job] не найден taskId по parentTaskId ${parentTaskId}, пробуем поиск по metadata`
        )
      }

      // ✅ ПРИОРИТЕТ 2: Fallback - поиск по metadata (для первого джоба или если parentTaskId не помог)
      const records = await ActiveJobs.findAll(ctx, {
        where: { jobType: 'check-client-ready' }
      })

      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (
            meta.datasetId === datasetId &&
            meta.socketId === socketId &&
            (meta.attempt || 0) === attempt
          ) {
            Debug.info(
              ctx,
              `[cache-loader:check-ready-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, socketId=${socketId}, attempt=${attempt})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader:check-ready-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
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
        `[cache-loader:check-ready-job] удалён taskId ${taskIdToRemove} из списка активных джобов`
      )
    } else {
      Debug.warn(
        ctx,
        `[cache-loader:check-ready-job] taskId не найден в таблице для удаления (datasetId=${datasetId}, socketId=${socketId || 'не указан'}, attempt=${attempt})`
      )
    }
  }

  const readyKey = `dataset_delete_ready_${datasetId}`

  try {
    Debug.info(
      ctx,
      `[cache-loader:check-ready-job] проверка готовности клиента для датасета ${datasetId}, попытка ${attempt + 1}/${maxAttempts}`
    )

    // Проверяем флаг готовности
    const setting = await AnalyticsSettings.findOneBy(ctx, { key: readyKey })

    if (setting && setting.value === 'true') {
      Debug.info(
        ctx,
        `[cache-loader:check-ready-job] === КЛИЕНТ ПОДТВЕРДИЛ ГОТОВНОСТЬ === datasetId=${datasetId}, попытка ${attempt + 1}`
      )

      // Удаляем флаг после использования
      try {
        await AnalyticsSettings.delete(ctx, setting.id)
      } catch (deleteError) {
        Debug.warn(
          ctx,
          `[cache-loader:check-ready-job] ошибка удаления флага готовности: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`
        )
      }

      // Клиент готов - продолжаем удаление
      await continueEmptyDatasetDeletion(
        ctx,
        datasetId,
        socketId,
        shouldDeleteDataset,
        parentDeleteDatasetTaskId
      )

      // ✅ Удаляем taskId при завершении
      await removeCurrentJobFromList()
    } else {
      // Флаг еще не установлен - планируем следующую проверку
      if (attempt < maxAttempts - 1) {
        // Получаем taskId текущего джоба из таблицы (для parentTaskId)
        const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

        // Планируем следующую проверку через 0.2 секунды
        // @ts-ignore
        const nextTaskId = await checkClientReadyJob.scheduleJobAfter(ctx, 0.2, 'seconds', {
          datasetId,
          socketId,
          shouldDeleteDataset,
          attempt: attempt + 1,
          maxAttempts,
          parentTaskId: currentTaskIdFromTable || undefined, // ✅ Передаём taskId текущего джоба как parentTaskId
          parentDeleteDatasetTaskId // ✅ Передаём taskId родительского deleteDatasetJob дальше
        })

        // ✅ СРАЗУ записываем новый taskId в таблицу ActiveJobs
        await addActiveJobId(ctx, nextTaskId, {
          jobType: 'check-client-ready',
          parentTaskId: currentTaskIdFromTable || undefined,
          metadata: {
            datasetId,
            socketId,
            attempt: attempt + 1
          }
        })

        // ✅ Удаляем СВОЙ taskId из таблицы ПОСЛЕ того, как записали новый
        await removeCurrentJobFromList()
      } else {
        // Превышен таймаут (20 попыток * 0.2 сек = 4 секунды) - продолжаем без ожидания
        Debug.warn(
          ctx,
          `[cache-loader:check-ready-job] === ТАЙМАУТ ОЖИДАНИЯ === datasetId=${datasetId}, продолжаем без ожидания (попытка ${attempt + 1}/${maxAttempts})`
        )
        await continueEmptyDatasetDeletion(
          ctx,
          datasetId,
          socketId,
          shouldDeleteDataset,
          parentDeleteDatasetTaskId
        )

        // ✅ Удаляем taskId при завершении
        await removeCurrentJobFromList()
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    Debug.error(ctx, `[cache-loader:check-ready-job] ошибка проверки готовности: ${errorMessage}`)

    // При ошибке продолжаем без ожидания
    await continueEmptyDatasetDeletion(
      ctx,
      datasetId,
      socketId,
      shouldDeleteDataset,
      parentDeleteDatasetTaskId
    )

    // ✅ Удаляем taskId при ошибке
    await removeCurrentJobFromList()
  }
})

/**
 * Проверка готовности клиента (синхронная проверка несколько раз подряд)
 * Если клиент не готов - запускает джобу для повторных проверок
 */
async function waitForClientReady(
  ctx: app.Ctx,
  datasetId: string,
  socketId: string | null,
  shouldDeleteDataset: boolean,
  parentDeleteDatasetTaskId?: string // taskId родительского deleteDatasetJob для удаления из ActiveJobs после завершения
): Promise<void> {
  const readyKey = `dataset_delete_ready_${datasetId}`

  Debug.info(ctx, `[cache-loader] проверка готовности клиента для датасета ${datasetId}`)

  // Делаем несколько проверок с небольшими задержками, чтобы дать время БД записать флаг
  for (let i = 0; i < 10; i++) {
    try {
      const setting = await AnalyticsSettings.findOneBy(ctx, { key: readyKey })
      if (setting && setting.value === 'true') {
        Debug.info(
          ctx,
          `[cache-loader] === КЛИЕНТ ПОДТВЕРДИЛ ГОТОВНОСТЬ === datasetId=${datasetId}, проверка ${i + 1}/10`
        )

        // Удаляем флаг после использования
        try {
          await AnalyticsSettings.delete(ctx, setting.id)
        } catch (deleteError) {
          Debug.warn(
            ctx,
            `[cache-loader] ошибка удаления флага готовности: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`
          )
        }

        // Клиент готов - продолжаем удаление
        await continueEmptyDatasetDeletion(
          ctx,
          datasetId,
          socketId,
          shouldDeleteDataset,
          parentDeleteDatasetTaskId
        )
        return
      }

      // Добавляем небольшую задержку между проверками (кроме последней)
      if (i < 9) {
        await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms задержка
      }
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader] ошибка проверки флага готовности: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Если после 10 проверок клиент не готов - запускаем джобу для повторных проверок
  // Но также устанавливаем таймаут, после которого процесс продолжается даже без подтверждения
  Debug.info(
    ctx,
    `[cache-loader] клиент еще не готов после 10 проверок, запускаем джобу для повторных проверок с таймаутом`
  )

  // @ts-ignore
  const taskId = await checkClientReadyJob.scheduleJobAfter(ctx, 0.1, 'seconds', {
    datasetId,
    socketId,
    shouldDeleteDataset,
    attempt: 0,
    maxAttempts: 20, // Увеличиваем количество попыток до 20 (4 секунды максимум)
    parentTaskId: undefined, // Для первого джоба undefined
    parentDeleteDatasetTaskId // ✅ Передаём taskId родительского deleteDatasetJob
  })

  // Добавляем taskId в список активных джобов с jobType и metadata
  await addActiveJobId(ctx, taskId, {
    jobType: 'check-client-ready',
    parentTaskId: undefined, // Для первого джоба undefined
    metadata: {
      datasetId,
      socketId,
      attempt: 0
    }
  })
}

/**
 * Продолжение удаления датасета после подтверждения готовности клиента (или таймаута)
 */
async function continueEmptyDatasetDeletion(
  ctx: app.Ctx,
  datasetId: string,
  socketId: string | null,
  shouldDeleteDataset: boolean,
  parentDeleteDatasetTaskId?: string // taskId родительского deleteDatasetJob для удаления из ActiveJobs после завершения
): Promise<void> {
  Debug.info(
    ctx,
    `[cache-loader] продолжение удаления пустого датасета ${datasetId}, shouldDeleteDataset=${shouldDeleteDataset}`
  )

  // Отправляем начальное сообщение о начале удаления
  if (socketId) {
    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'dataset-delete-start',
        data: {
          datasetId,
          datasetName: 'Датасет'
        }
      })
      Debug.info(
        ctx,
        `[cache-loader] отправлено сообщение dataset-delete-start для датасета ${datasetId}`
      )
    } catch (socketError) {
      Debug.warn(
        ctx,
        `[cache-loader] ошибка отправки dataset-delete-start: ${socketError instanceof Error ? socketError.message : String(socketError)}`
      )
    }
  }

  // Отправляем сообщения о том, что удаление завершено (0 записей)
  if (socketId) {
    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'dataset-cache-delete-start',
        data: { datasetId, total: 0 }
      })
      await sendDataToSocket(ctx, socketId, {
        type: 'dataset-cache-delete-complete',
        data: { datasetId, deleted: 0 }
      })
      Debug.info(
        ctx,
        `[cache-loader] отправлены сообщения о завершении удаления пустого кэша для датасета ${datasetId}`
      )
    } catch (socketError) {
      Debug.warn(
        ctx,
        `[cache-loader] ошибка отправки сообщения о завершении удаления: ${socketError instanceof Error ? socketError.message : String(socketError)}`
      )
    }
  }

  // Если нужно удалить датасет после кэша - удаляем его сразу
  if (shouldDeleteDataset) {
    Debug.info(
      ctx,
      `[cache-loader] запуск удаления датасета ${datasetId} после завершения удаления кэша (кэш пуст)`
    )

    try {
      // Импортируем AnalyticsDatasets динамически, чтобы избежать циклических зависимостей
      const { AnalyticsDatasets } = await import('../../tables/datasets.table')

      // Проверяем, что датасет еще существует
      const dataset = await AnalyticsDatasets.findById(ctx, datasetId)
      if (!dataset) {
        Debug.warn(ctx, `[cache-loader] датасет ${datasetId} уже удалён, пропускаем удаление`)
      } else {
        // Удаляем датасет
        await AnalyticsDatasets.delete(ctx, datasetId)
        Debug.info(ctx, `[cache-loader] датасет ${datasetId} успешно удалён`)

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
              `[cache-loader] отправлено сообщение о завершении удаления датасета ${datasetId}`
            )
          } catch (socketError) {
            Debug.warn(
              ctx,
              `[cache-loader] ошибка отправки сообщения о завершении удаления датасета: ${socketError instanceof Error ? socketError.message : String(socketError)}`
            )
          }
        }

        // ✅ Удаляем taskId родительского deleteDatasetJob после успешного удаления датасета
        if (parentDeleteDatasetTaskId) {
          try {
            const { removeActiveJobId } = await import('../../api/settings')
            await removeActiveJobId(ctx, parentDeleteDatasetTaskId)
            Debug.info(
              ctx,
              `[cache-loader] удалён taskId родительского deleteDatasetJob ${parentDeleteDatasetTaskId} из списка активных джобов`
            )
          } catch (error) {
            Debug.warn(
              ctx,
              `[cache-loader] не удалось удалить taskId родительского deleteDatasetJob ${parentDeleteDatasetTaskId}: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }
      }
    } catch (deleteError) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError)
      Debug.error(ctx, `[cache-loader] ошибка удаления датасета ${datasetId}: ${errorMessage}`)

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
            `[cache-loader] ошибка отправки сообщения об ошибке удаления датасета: ${socketError instanceof Error ? socketError.message : String(socketError)}`
          )
        }
      }
    }
  }
}

/**
 * Интерфейс для прогресса загрузки
 */
export interface CacheLoadProgress {
  componentId: string
  componentTitle: string
  totalInClickHouse: number
  totalInHeap: number
  needToLoad: number
  loaded: number
  percentage: number
}

/**
 * Интерфейс для общего прогресса
 */
export interface OverallProgress {
  currentComponent: number
  totalComponents: number
  components: CacheLoadProgress[]
  overallPercentage: number
}

/**
 * Построить SQL условие для одного условия фильтра (новый формат)
 */
function buildFilterConditionSQL(condition: FilterCondition): string | null {
  const { property, operator, value } = condition

  // Экранируем значение, если оно есть
  const escapedValue = value ? value.replace(/'/g, "''") : null

  switch (operator) {
    case 'is':
      if (!escapedValue) return null
      return `${property} = '${escapedValue}'`

    case 'isNot':
      if (!escapedValue) return null
      return `${property} != '${escapedValue}'`

    case 'contains':
      if (!escapedValue) return null
      return `${property} LIKE '%${escapedValue}%'`

    case 'doesNotContain':
      if (!escapedValue) return null
      return `${property} NOT LIKE '%${escapedValue}%'`

    case 'startsWith':
      if (!escapedValue) return null
      return `${property} LIKE '${escapedValue}%'`

    case 'endsWith':
      if (!escapedValue) return null
      return `${property} LIKE '%${escapedValue}'`

    case 'isEmpty':
      return `(${property} IS NULL OR ${property} = '')`

    case 'isNotEmpty':
      return `(${property} IS NOT NULL AND ${property} != '')`

    default:
      Debug.warn(null, `[cache-loader] неизвестный оператор фильтра: ${operator}`)
      return null
  }
}

/**
 * Построить SQL условие для группы фильтров (новый формат)
 */
function buildFilterGroupSQL(group: FilterGroup): string | null {
  const conditions: string[] = []

  for (const item of group.conditions) {
    let conditionSQL: string | null = null

    // Проверяем, является ли элемент условием или группой
    if ('property' in item && 'operator' in item) {
      // Это FilterCondition
      conditionSQL = buildFilterConditionSQL(item as FilterCondition)
    } else if ('operator' in item && 'conditions' in item) {
      // Это FilterGroup (вложенная группа)
      conditionSQL = buildFilterGroupSQL(item as FilterGroup)
    }

    if (conditionSQL) {
      conditions.push(conditionSQL)
    }
  }

  if (conditions.length === 0) {
    return null
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  // Объединяем условия через оператор группы
  const operator = group.operator || 'AND'
  return `(${conditions.join(` ${operator} `)})`
}

/**
 * Построить SQL условие из корневого фильтра (новый формат)
 */
function buildFilterRootSQL(filterRoot: FilterRoot): string | null {
  let conditions: Array<FilterCondition | FilterGroup>
  let rootOperator: 'AND' | 'OR' = 'OR'

  // Проверяем формат FilterRoot
  if (Array.isArray(filterRoot)) {
    // Массив условий и групп
    conditions = filterRoot
  } else if (filterRoot && typeof filterRoot === 'object' && 'conditions' in filterRoot) {
    // Объект с operator и conditions
    conditions = filterRoot.conditions
    rootOperator = filterRoot.operator || 'OR'
  } else {
    return null
  }

  if (!conditions || conditions.length === 0) {
    return null
  }

  const sqlConditions: string[] = []

  for (const item of conditions) {
    let conditionSQL: string | null = null

    // Проверяем, является ли элемент условием или группой
    if ('property' in item && 'operator' in item) {
      // Это FilterCondition
      conditionSQL = buildFilterConditionSQL(item as FilterCondition)
    } else if ('operator' in item && 'conditions' in item) {
      // Это FilterGroup
      conditionSQL = buildFilterGroupSQL(item as FilterGroup)
    }

    if (conditionSQL) {
      sqlConditions.push(conditionSQL)
    }
  }

  if (sqlConditions.length === 0) {
    return null
  }

  if (sqlConditions.length === 1) {
    return sqlConditions[0]
  }

  // Объединяем условия через корневой оператор
  return `(${sqlConditions.join(` ${rootOperator} `)})`
}

/**
 * Построить SQL условие для одного URL фильтра
 * Обрабатывает как обычные URL, так и UTM параметры в формате utm_source=google
 */
function buildUrlCondition(url: string): string | null {
  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return null
  }

  // Проверяем, является ли это UTM параметром
  const utmMatch = trimmedUrl.match(
    /^(utm_source|utm_medium|utm_campaign|utm_term|utm_content)=(.+)$/
  )

  if (utmMatch) {
    // Это UTM параметр
    const utmParam = utmMatch[1] // utm_source, utm_medium и т.д.
    const utmValue = utmMatch[2].trim()

    if (utmValue) {
      const escapedValue = utmValue.replace(/'/g, "''")
      return `${utmParam} = '${escapedValue}'`
    }
  } else {
    // Это обычный URL - ищем в urlPath
    const escaped = trimmedUrl.replace(/'/g, "''")
    return `urlPath LIKE '%${escaped}%'`
  }

  return null
}

/**
 * Построить фильтр по URL для SQL запроса
 * Поддерживает:
 * 1. Новый формат фильтров (settings.filter) - иерархическая структура
 * 2. Формат с группами (urlGroups) - для обратной совместимости
 * 3. Старый формат (urls) - для обратной совместимости
 */
function buildUrlFilter(settings: any): string {
  // НОВЫЙ ФОРМАТ: settings.filter (иерархическая структура фильтров)
  if (settings.filter) {
    const filterSQL = buildFilterRootSQL(settings.filter)
    if (filterSQL) {
      return `AND ${filterSQL}`
    }
    // Если фильтр пустой - возвращаем пустую строку
    return ''
  }

  // СРЕДНИЙ ФОРМАТ: urlGroups (для обратной совместимости)
  if (settings.urlGroups && Array.isArray(settings.urlGroups) && settings.urlGroups.length > 0) {
    const groupConditions: string[] = []

    for (const group of settings.urlGroups) {
      if (!group.urls || !Array.isArray(group.urls) || group.urls.length === 0) {
        continue
      }

      // Фильтруем пустые URL и строим условия для группы
      const groupUrlConditions: string[] = []
      for (const url of group.urls) {
        const condition = buildUrlCondition(url)
        if (condition) {
          groupUrlConditions.push(condition)
        }
      }

      // Если в группе есть условия - добавляем группу (условия внутри группы объединяются через И)
      if (groupUrlConditions.length > 0) {
        if (groupUrlConditions.length === 1) {
          groupConditions.push(groupUrlConditions[0])
        } else {
          groupConditions.push(`(${groupUrlConditions.join(' AND ')})`)
        }
      }
    }

    // Группы объединяются через ИЛИ (OR)
    if (groupConditions.length > 0) {
      return `AND (${groupConditions.join(' OR ')})`
    }

    return ''
  }

  // Старый формат: urls (для обратной совместимости)
  if (settings.urls && Array.isArray(settings.urls) && settings.urls.length > 0) {
    const nonEmptyUrls = settings.urls.filter((url) => url && url.trim() !== '')
    if (nonEmptyUrls.length === 0) {
      return ''
    }

    const urlConditions: string[] = []
    const operator = settings.urlOperator || 'OR'

    for (const url of nonEmptyUrls) {
      const condition = buildUrlCondition(url)
      if (condition) {
        urlConditions.push(condition)
      }
    }

    if (urlConditions.length === 0) {
      return ''
    }

    // Объединяем условия через указанный оператор (AND или OR)
    const combinedConditions = urlConditions.join(` ${operator} `)
    return `AND (${combinedConditions})`
  }

  return ''
}

/**
 * Построить каскадное условие для компонента (включает условия всех предыдущих компонентов)
 * @param currentComponent - текущий компонент
 * @param previousComponents - массив предыдущих компонентов (для каскадных условий)
 * @returns SQL условие, объединяющее условия всех компонентов через AND
 */
function buildCascadingCondition(
  currentComponent: DatasetComponent,
  previousComponents: DatasetComponent[] = []
): string {
  const allConditions: string[] = []

  // Добавляем условия всех предыдущих компонентов
  for (const prevComponent of previousComponents) {
    const prevEventFilter = buildEventFilterConditions([prevComponent.eventType])
    const prevUrlFilter = buildUrlFilter(prevComponent.settings)

    // Строим условие для предыдущего компонента
    // urlFilter может быть пустой строкой или содержать "AND ..."
    const prevUrlCondition =
      prevUrlFilter && prevUrlFilter.trim() ? prevUrlFilter.replace(/^AND\s+/, '').trim() : null

    const prevCondition = prevUrlCondition
      ? `(${prevEventFilter}) AND ${prevUrlCondition}`
      : `(${prevEventFilter})`

    allConditions.push(prevCondition)
  }

  // Добавляем условие текущего компонента
  const currentEventFilter = buildEventFilterConditions([currentComponent.eventType])
  const currentUrlFilter = buildUrlFilter(currentComponent.settings)

  // urlFilter может быть пустой строкой или содержать "AND ..."
  const currentUrlCondition =
    currentUrlFilter && currentUrlFilter.trim()
      ? currentUrlFilter.replace(/^AND\s+/, '').trim()
      : null

  const currentCondition = currentUrlCondition
    ? `(${currentEventFilter}) AND ${currentUrlCondition}`
    : `(${currentEventFilter})`

  allConditions.push(currentCondition)

  // Объединяем все условия через AND
  if (allConditions.length === 0) {
    return '1 = 1' // Если нет условий - возвращаем условие, которое всегда true
  }

  if (allConditions.length === 1) {
    return allConditions[0]
  }

  return `(${allConditions.join(' AND ')})`
}

/**
 * Получить количество записей в ClickHouse для компонента
 * @param previousComponents - массив предыдущих компонентов для каскадных условий
 */
async function getClickHouseCount(
  ctx: app.Ctx,
  component: DatasetComponent,
  previousComponents: DatasetComponent[] = []
): Promise<number> {
  // Строим каскадное условие (включает условия всех предыдущих компонентов)
  const cascadingCondition = buildCascadingCondition(component, previousComponents)

  const query = `
    SELECT COUNT(*) as total
    FROM chatium_ai.access_log
    WHERE ${cascadingCondition}
      AND dt >= today() - 180
  `

  try {
    const result = await gcQueryAi(ctx, query)
    const count = Number(result.rows?.[0]?.total) || 0
    return count
  } catch (error) {
    Debug.error(
      ctx,
      `[cache-loader] ошибка подсчёта в ClickHouse для компонента ${component.id}: ${error instanceof Error ? error.message : String(error)}`
    )
    return 0
  }
}

/**
 * Получить количество записей в Heap для компонента
 */
async function getHeapCount(ctx: app.Ctx, datasetId: string, componentId: string): Promise<number> {
  try {
    const records = await AnalyticsDatasetCache.findAll(ctx, {
      where: {
        dataset_id: datasetId,
        component_id: componentId
      }
    })
    return records.length
  } catch (error) {
    Debug.error(
      ctx,
      `[cache-loader] ошибка подсчёта в Heap для компонента ${componentId}: ${error instanceof Error ? error.message : String(error)}`
    )
    return 0
  }
}

/**
 * Загрузить порцию событий из ClickHouse в Heap
 * @param previousComponents - массив предыдущих компонентов для каскадных условий
 * @returns количество загруженных событий, или -1 если произошла ошибка
 */
async function loadEventsBatch(
  ctx: app.Ctx,
  datasetId: string,
  componentId: string,
  component: DatasetComponent,
  offset: number,
  limit: number,
  previousComponents: DatasetComponent[] = []
): Promise<number> {
  const SEGMENT_SIZE = 1000 // Размер сегмента для батчевого удаления

  // Строим каскадное условие (включает условия всех предыдущих компонентов)
  const cascadingCondition = buildCascadingCondition(component, previousComponents)

  const query = `
    SELECT 
      ts, dt, url, urlPath, action, action_param1, action_param2, action_param3,
      action_param1_float, action_param1_int,
      uid, user_id, session_id, title, referer, user_agent,
      user_first_name, user_last_name, user_email, user_phone, user_account_role,
      ip, location_country, location_city, gc_visitor_id,
      ua_os_name, ua_device_type, ua_client_name, ua_client_version,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content
    FROM chatium_ai.access_log
    WHERE ${cascadingCondition}
      AND dt >= today() - 180
    ORDER BY ts ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  try {
    Debug.info(
      ctx,
      `[cache-loader] выполнение запроса ClickHouse для компонента ${componentId}: offset=${offset}, limit=${limit}`
    )
    Debug.info(
      ctx,
      `[cache-loader] SQL запрос для компонента ${componentId}: ${query.substring(0, 500)}...`
    )

    const result = await gcQueryAi(ctx, query)
    const events = result.rows || []

    Debug.info(
      ctx,
      `[cache-loader] получено ${events.length} событий из ClickHouse для компонента ${componentId}`
    )

    if (events.length === 0) {
      Debug.info(
        ctx,
        `[cache-loader] компонент ${componentId}: нет событий для загрузки (offset=${offset}, limit=${limit})`
      )
      return 0
    }

    // Логируем структуру первого события для отладки
    if (events.length > 0) {
      Debug.info(
        ctx,
        `[cache-loader] пример первого события для компонента ${componentId}: ${JSON.stringify(Object.keys(events[0]))}`
      )
      Debug.info(
        ctx,
        `[cache-loader] пример значений первого события (первые 200 символов): ${JSON.stringify(events[0]).substring(0, 200)}...`
      )
    }

    // Вычисляем номер сегмента на основе offset (каждые 1000 записей = один сегмент)
    const segment = String(Math.floor(offset / SEGMENT_SIZE))
    Debug.info(
      ctx,
      `[cache-loader] вычислен сегмент ${segment} для offset=${offset} (SEGMENT_SIZE=${SEGMENT_SIZE})`
    )

    // Вспомогательная функция для безопасной проверки строки
    const isNonEmptyString = (value: any): boolean => {
      return typeof value === 'string' && value.trim() !== ''
    }

    // Сохраняем события в Heap
    const recordsToCreate = events.map((event) => {
      // Проверяем, что обязательные поля не undefined
      if (!datasetId || !componentId) {
        throw new Error(
          `[cache-loader] Обязательные поля не могут быть undefined: dataset_id=${datasetId}, component_id=${componentId}`
        )
      }

      const record: any = {
        dataset_id: datasetId,
        component_id: componentId,
        segment: segment // Номер сегмента для батчевого удаления (каждые 1000 записей = один сегмент)
      }

      // Добавляем поля только если они есть (не пустые строки, не null и не undefined)
      // Преобразуем не-строки в строки, если они не null/undefined
      if (event.ts && isNonEmptyString(event.ts)) record.ts = String(event.ts)
      if (event.dt && isNonEmptyString(event.dt)) record.dt = String(event.dt)
      if (event.url && isNonEmptyString(event.url)) record.url = String(event.url)
      if (event.urlPath && isNonEmptyString(event.urlPath)) record.urlPath = String(event.urlPath)
      if (event.action && isNonEmptyString(event.action)) record.action = String(event.action)
      if (event.action_param1 && isNonEmptyString(event.action_param1))
        record.action_param1 = String(event.action_param1)
      if (event.action_param2 && isNonEmptyString(event.action_param2))
        record.action_param2 = String(event.action_param2)
      if (event.action_param3 && isNonEmptyString(event.action_param3))
        record.action_param3 = String(event.action_param3)
      if (event.action_param1_float != null && event.action_param1_float !== undefined)
        record.action_param1_float = Number(event.action_param1_float)
      if (event.action_param1_int != null && event.action_param1_int !== undefined)
        record.action_param1_int = Number(event.action_param1_int)
      if (event.uid && isNonEmptyString(event.uid)) record.uid = String(event.uid)
      if (event.user_id && isNonEmptyString(event.user_id)) record.user_id = String(event.user_id)
      if (event.session_id && isNonEmptyString(event.session_id))
        record.session_id = String(event.session_id)
      if (event.title && isNonEmptyString(event.title)) record.title = String(event.title)
      if (event.referer && isNonEmptyString(event.referer)) record.referer = String(event.referer)
      if (event.user_agent && isNonEmptyString(event.user_agent))
        record.user_agent = String(event.user_agent)
      if (event.user_first_name && isNonEmptyString(event.user_first_name))
        record.user_first_name = String(event.user_first_name)
      if (event.user_last_name && isNonEmptyString(event.user_last_name))
        record.user_last_name = String(event.user_last_name)
      if (event.user_email && isNonEmptyString(event.user_email))
        record.user_email = String(event.user_email)
      if (event.user_phone && isNonEmptyString(event.user_phone))
        record.user_phone = String(event.user_phone)
      if (event.user_account_role && isNonEmptyString(event.user_account_role))
        record.user_account_role = String(event.user_account_role)
      if (event.ip && isNonEmptyString(event.ip)) record.ip = String(event.ip)
      if (event.location_country && isNonEmptyString(event.location_country))
        record.location_country = String(event.location_country)
      if (event.location_city && isNonEmptyString(event.location_city))
        record.location_city = String(event.location_city)
      if (event.gc_visitor_id != null && event.gc_visitor_id !== undefined) {
        // gc_visitor_id может быть числом или строкой
        const gcVisitorIdStr = String(event.gc_visitor_id)
        if (gcVisitorIdStr.trim() !== '') record.gc_visitor_id = gcVisitorIdStr
      }
      if (event.ua_os_name && isNonEmptyString(event.ua_os_name))
        record.ua_os_name = String(event.ua_os_name)
      if (event.ua_device_type && isNonEmptyString(event.ua_device_type))
        record.ua_device_type = String(event.ua_device_type)
      if (event.ua_client_name && isNonEmptyString(event.ua_client_name))
        record.ua_client_name = String(event.ua_client_name)
      if (event.ua_client_version && isNonEmptyString(event.ua_client_version))
        record.ua_client_version = String(event.ua_client_version)
      if (event.utm_source && isNonEmptyString(event.utm_source))
        record.utm_source = String(event.utm_source)
      if (event.utm_medium && isNonEmptyString(event.utm_medium))
        record.utm_medium = String(event.utm_medium)
      if (event.utm_campaign && isNonEmptyString(event.utm_campaign))
        record.utm_campaign = String(event.utm_campaign)
      if (event.utm_term && isNonEmptyString(event.utm_term))
        record.utm_term = String(event.utm_term)
      if (event.utm_content && isNonEmptyString(event.utm_content))
        record.utm_content = String(event.utm_content)

      return record
    })

    // Создаём записи батчами по 50 для оптимизации
    const batchSize = 50
    let createdCount = 0
    for (let i = 0; i < recordsToCreate.length; i += batchSize) {
      const batch = recordsToCreate.slice(i, i + batchSize)
      Debug.info(
        ctx,
        `[cache-loader] создание батча ${Math.floor(i / batchSize) + 1} из ${Math.ceil(recordsToCreate.length / batchSize)} для компонента ${componentId} (${batch.length} записей)`
      )

      try {
        await Promise.all(batch.map((record) => AnalyticsDatasetCache.create(ctx, record)))
        createdCount += batch.length
        Debug.info(
          ctx,
          `[cache-loader] успешно создано ${batch.length} записей в батче для компонента ${componentId}, всего создано: ${createdCount}`
        )
      } catch (batchError) {
        const batchErrorMessage =
          batchError instanceof Error ? batchError.message : String(batchError)
        const batchErrorStack = batchError instanceof Error ? batchError.stack : undefined
        Debug.error(
          ctx,
          `[cache-loader] КРИТИЧЕСКАЯ ОШИБКА создания батча для компонента ${componentId} (батч ${Math.floor(i / batchSize) + 1}): ${batchErrorMessage}`
        )
        if (batchErrorStack) {
          Debug.error(ctx, `[cache-loader] stack trace создания батча: ${batchErrorStack}`)
        }
        // Логируем пример записи, которая вызвала ошибку
        if (batch.length > 0) {
          Debug.error(
            ctx,
            `[cache-loader] пример записи из проблемного батча (первые 500 символов): ${JSON.stringify(batch[0]).substring(0, 500)}...`
          )
        }
        throw batchError // Пробрасываем ошибку дальше
      }
    }

    Debug.info(
      ctx,
      `[cache-loader] успешно создано ${createdCount} записей из ${events.length} событий для компонента ${componentId}`
    )
    return events.length
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    Debug.error(
      ctx,
      `[cache-loader] КРИТИЧЕСКАЯ ОШИБКА загрузки батча для компонента ${componentId} (offset=${offset}, limit=${limit}): ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[cache-loader] stack trace: ${errorStack}`)
    }
    // Логируем детали запроса для отладки
    Debug.error(
      ctx,
      `[cache-loader] детали запроса: datasetId=${datasetId}, componentId=${componentId}, eventType=${component.eventType}, offset=${offset}, limit=${limit}`
    )
    // Возвращаем -1, чтобы отличить ошибку от отсутствия данных
    return -1
  }
}

/**
 * Загрузить все события для компонента
 * Теперь использует джобы для асинхронной загрузки, чтобы избежать таймаутов
 * @param previousComponents - массив предыдущих компонентов для каскадных условий
 */
async function loadComponentEvents(
  ctx: app.Ctx,
  datasetId: string,
  component: DatasetComponent,
  socketId: string | null,
  progress: CacheLoadProgress,
  overallProgress: OverallProgress | null = null,
  totalComponents: number = 0,
  currentComponentIndex: number = 0,
  previousComponents: DatasetComponent[] = []
): Promise<void> {
  const BATCH_SIZE = 200
  const originalNeedToLoad = progress.needToLoad

  Debug.info(
    ctx,
    `[cache-loader] начало загрузки компонента ${component.id}: нужно загрузить ${progress.needToLoad} записей, socketId: ${socketId || 'не указан'}, предыдущих компонентов: ${previousComponents.length}`
  )

  // Запускаем первый батч через джоб для асинхронной загрузки
  // Последовательность обеспечивается тем, что следующий батч планируется только после успешного завершения текущего
  if (progress.needToLoad > 0) {
    const firstBatchSize = Math.min(BATCH_SIZE, progress.needToLoad)
    Debug.info(
      ctx,
      `[cache-loader] планирование первого батча для компонента ${component.id} через джоб (offset=0, limit=${firstBatchSize})`
    )

    // Импортируем джоб (будет определен ниже)
    // @ts-ignore
    const taskId = await loadEventsBatchJob.scheduleJobAsap(ctx, {
      datasetId,
      componentId: component.id,
      component,
      offset: 0,
      limit: firstBatchSize,
      socketId,
      retryAttempt: 0,
      currentBatchSize: firstBatchSize,
      loadedBeforeBatch: 0,
      originalNeedToLoad,
      componentTitle: component.title,
      overallProgress: overallProgress ? JSON.parse(JSON.stringify(overallProgress)) : null, // Сериализуем для передачи в джоб
      totalComponents,
      currentComponentIndex,
      previousComponents: previousComponents.map((c) => JSON.parse(JSON.stringify(c))) // Сериализуем предыдущие компоненты
      // parentTaskId не передаём для первого джоба - он будет искать свой taskId по metadata
    })

    // Записываем taskId в таблицу сразу при создании джоба с метаданными для поиска
    await addActiveJobId(ctx, taskId, {
      jobType: 'load-cache-batch',
      metadata: { datasetId, componentId: component.id, offset: 0, retryAttempt: 0 }
    })

    Debug.info(
      ctx,
      `[cache-loader] первый батч для компонента ${component.id} запланирован, загрузка продолжится асинхронно через джобы, taskId=${taskId}`
    )
  } else {
    // Нет данных для загрузки
    progress.percentage = 100
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-progress',
          data: {
            componentId: component.id,
            progress: 100,
            loaded: 0,
            total: 0
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader] ошибка отправки прогресса: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }
  }

  // Загрузка теперь происходит асинхронно через джобы
  // Последовательность обеспечивается тем, что следующий батч планируется только после успешного завершения текущего
}

/**
 * Загрузить кэш для всех компонентов датасета
 */
export async function loadDatasetCache(
  ctx: app.Ctx,
  datasetId: string,
  components: DatasetComponent[],
  socketId: string | null = null,
  clearExisting: boolean = false
): Promise<OverallProgress> {
  Debug.info(
    ctx,
    `[cache-loader] начало загрузки кэша для датасета ${datasetId}, компонентов: ${components.length}, clearExisting: ${clearExisting}, socketId: ${socketId || 'не указан'}`
  )

  const overallProgress: OverallProgress = {
    currentComponent: 0,
    totalComponents: components.length,
    components: [],
    overallPercentage: 0
  }

  // Отправляем начальное сообщение о старте загрузки
  if (socketId) {
    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'dataset-cache-start',
        data: {
          datasetId,
          totalComponents: components.length
        }
      })
      Debug.info(
        ctx,
        `[cache-loader] отправлено начальное сообщение о старте загрузки для датасета ${datasetId}`
      )
    } catch (socketError) {
      Debug.warn(
        ctx,
        `[cache-loader] ошибка отправки начального сообщения: ${socketError instanceof Error ? socketError.message : String(socketError)}`
      )
    }
  }

  // Для каждого компонента считаем количество записей
  // Каждый следующий компонент включает условия всех предыдущих (каскадные условия)
  for (let i = 0; i < components.length; i++) {
    const component = components[i]

    // Получаем массив предыдущих компонентов для каскадных условий
    const previousComponents = components.slice(0, i)

    Debug.info(
      ctx,
      `[cache-loader] обработка компонента ${i + 1}/${components.length}: ${component.id} (${component.title}), предыдущих компонентов: ${previousComponents.length}`
    )

    // Если нужно очистить существующий кэш - удаляем его с прогрессом
    if (clearExisting) {
      await deleteComponentCache(ctx, datasetId, component.id, socketId)
    }

    const [clickHouseCount, heapCount] = await Promise.all([
      getClickHouseCount(ctx, component, previousComponents),
      getHeapCount(ctx, datasetId, component.id)
    ])

    // Рассчитываем needToLoad без буфера (буфер используется только для определения необходимости загрузки)
    const needToLoad = Math.max(0, clickHouseCount - heapCount)
    // Буфер +20 используется только для определения, нужно ли загружать данные
    const shouldLoad = clickHouseCount - heapCount + 20 > 0

    const componentProgress: CacheLoadProgress = {
      componentId: component.id,
      componentTitle: component.title,
      totalInClickHouse: clickHouseCount,
      totalInHeap: heapCount,
      needToLoad,
      loaded: 0,
      percentage: 0
    }

    overallProgress.components.push(componentProgress)

    // Если нужно загрузить - загружаем (используем shouldLoad для проверки с буфером)
    // Передаём предыдущие компоненты для каскадных условий
    if (shouldLoad && needToLoad > 0) {
      await loadComponentEvents(
        ctx,
        datasetId,
        component,
        socketId,
        componentProgress,
        overallProgress,
        components.length,
        i,
        previousComponents
      )
    } else {
      componentProgress.loaded = 0
      componentProgress.percentage = 100
      Debug.info(
        ctx,
        `[cache-loader] компонент ${component.id}: не требуется загрузка (в Heap уже есть ${heapCount} из ${clickHouseCount})`
      )

      // Отправляем прогресс даже если не нужно загружать
      // Используем реальные значения для консистентности
      if (socketId) {
        try {
          await sendDataToSocket(ctx, socketId, {
            type: 'dataset-cache-progress',
            data: {
              componentId: component.id,
              progress: 100,
              loaded: heapCount, // Уже загружено в Heap
              total: clickHouseCount // Всего в ClickHouse
            }
          })
          Debug.info(
            ctx,
            `[cache-loader] отправлен прогресс для компонента ${component.id}: 100% (не требуется загрузка, в Heap уже есть ${heapCount} из ${clickHouseCount})`
          )

          // Отправляем общий прогресс
          overallProgress.currentComponent = i + 1
          const totalLoaded = overallProgress.components.reduce((sum, c) => sum + c.loaded, 0)
          const totalNeed = overallProgress.components.reduce((sum, c) => sum + c.needToLoad, 0)
          overallProgress.overallPercentage =
            totalNeed > 0 ? Math.round((totalLoaded / totalNeed) * 100) : 100

          await sendDataToSocket(ctx, socketId, {
            type: 'dataset-cache-overall-progress',
            data: {
              currentComponent: i + 1,
              totalComponents: components.length,
              overallPercentage: overallProgress.overallPercentage
            }
          })
          Debug.info(
            ctx,
            `[cache-loader] отправлен общий прогресс: ${overallProgress.overallPercentage}% (компонент ${i + 1}/${components.length})`
          )
        } catch (socketError) {
          Debug.warn(
            ctx,
            `[cache-loader] ошибка отправки прогресса: ${socketError instanceof Error ? socketError.message : String(socketError)}`
          )
        }
      }
    }

    overallProgress.currentComponent = i + 1

    // Обновляем общий прогресс
    const totalLoaded = overallProgress.components.reduce((sum, c) => sum + c.loaded, 0)
    const totalNeed = overallProgress.components.reduce((sum, c) => sum + c.needToLoad, 0)
    overallProgress.overallPercentage =
      totalNeed > 0 ? Math.round((totalLoaded / totalNeed) * 100) : 100

    // Отправляем общий прогресс
    if (socketId) {
      await sendDataToSocket(ctx, socketId, {
        type: 'dataset-cache-overall-progress',
        data: {
          currentComponent: i + 1,
          totalComponents: components.length,
          overallPercentage: overallProgress.overallPercentage
        }
      })
    }
  }

  Debug.info(ctx, `[cache-loader] завершена загрузка кэша для датасета ${datasetId}`)

  // Отправляем финальное сообщение о завершении
  if (socketId) {
    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'dataset-cache-complete',
        data: {
          datasetId,
          overallProgress: JSON.parse(JSON.stringify(overallProgress)) as any
        }
      })
      Debug.info(
        ctx,
        `[cache-loader] отправлено финальное сообщение о завершении загрузки для датасета ${datasetId}`
      )
    } catch (socketError) {
      Debug.warn(
        ctx,
        `[cache-loader] ошибка отправки финального сообщения: ${socketError instanceof Error ? socketError.message : String(socketError)}`
      )
    }
  }

  return overallProgress
}

/**
 * Удалить кэш для компонента
 * Удаляет сегменты последовательно через джобу deleteCacheSegmentJob
 * Каждый сегмент содержит до 1000 записей (определяется при загрузке)
 */
export async function deleteComponentCache(
  ctx: app.Ctx,
  datasetId: string,
  componentId: string,
  socketId: string | null = null
): Promise<number> {
  Debug.info(
    ctx,
    `[cache-loader] удаление кэша для компонента ${componentId} датасета ${datasetId}`
  )

  try {
    // Шаг 1: Проверяем, что записи существуют через findOneBy
    const firstRecord = await AnalyticsDatasetCache.findOneBy(ctx, {
      dataset_id: datasetId,
      component_id: componentId
    })

    if (!firstRecord) {
      Debug.info(ctx, `[cache-loader] нет записей для удаления для компонента ${componentId}`)
      return 0
    }

    Debug.info(
      ctx,
      `[cache-loader] найдены записи для компонента ${componentId}, получение общего количества`
    )

    // Шаг 2: Получаем общее количество записей через countBy
    const totalCount = await AnalyticsDatasetCache.countBy(ctx, {
      dataset_id: datasetId,
      component_id: componentId
    })

    Debug.info(
      ctx,
      `[cache-loader] найдено ${totalCount} записей для удаления компонента ${componentId}`
    )

    // Шаг 3: Отправляем начальное сообщение о начале удаления с общим количеством
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-start',
          data: {
            componentId,
            total: totalCount
          }
        })
        // Отправляем прогресс 0%
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-progress',
          data: {
            componentId,
            deleted: 0,
            total: totalCount,
            progress: 0
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader] ошибка отправки сообщения о начале удаления: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // Шаг 4: Вычисляем количество сегментов (округление вверх)
    const SEGMENT_SIZE = 1000 // Размер сегмента (должен совпадать с загрузкой)
    const totalSegments = Math.ceil(totalCount / SEGMENT_SIZE)

    Debug.info(
      ctx,
      `[cache-loader] найдено ${totalSegments} сегментов для удаления компонента ${componentId} (${totalCount} записей, размер сегмента: ${SEGMENT_SIZE})`
    )

    // Шаг 5: Запускаем первый сегмент через джобу (сразу, без задержки, так как это первый)
    // Последовательность обеспечивается тем, что следующий сегмент планируется только после успешного удаления текущего
    if (totalSegments > 0) {
      Debug.info(
        ctx,
        `[cache-loader] планирование удаления первого сегмента (0) для компонента ${componentId} через джобу`
      )

      // @ts-ignore
      const taskId = await deleteCacheSegmentJob.scheduleJobAsap(ctx, {
        datasetId,
        componentId,
        segment: '0', // Первый сегмент - "0"
        socketId,
        retryAttempt: 0,
        deletedBeforeSegment: 0,
        totalSegments,
        currentSegmentIndex: 0,
        totalCount
        // parentTaskId не передаём для первого джоба - он будет искать свой taskId по metadata
      })

      // Записываем taskId в таблицу сразу при создании джоба с метаданными для поиска
      await addActiveJobId(ctx, taskId, {
        jobType: 'delete-cache-segment',
        metadata: { datasetId, componentId, segment: '0', retryAttempt: 0 }
      })

      Debug.info(
        ctx,
        `[cache-loader] первый сегмент для компонента ${componentId} запланирован, удаление продолжится асинхронно через джобы с интервалом 2 секунды, taskId=${taskId}`
      )

      // Возвращаем общее количество записей (удаление продолжится асинхронно)
      return totalCount
    }

    return 0
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    Debug.error(
      ctx,
      `[cache-loader] КРИТИЧЕСКАЯ ОШИБКА удаления кэша для компонента ${componentId}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[cache-loader] stack trace: ${errorStack}`)
    }

    // Отправляем сообщение об ошибке
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-error',
          data: {
            componentId,
            error: errorMessage
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader] ошибка отправки сообщения об ошибке удаления: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    return 0
  }
}

/**
 * Удалить весь кэш для датасета
 * Удаляет сегменты последовательно через джобу deleteCacheSegmentJob
 * Каждый сегмент содержит до 1000 записей (определяется при загрузке)
 */
export async function deleteDatasetCache(
  ctx: app.Ctx,
  datasetId: string,
  socketId: string | null = null,
  shouldDeleteDataset: boolean = false, // Если true, после завершения удаления кэша будет удалён датасет
  parentDeleteDatasetTaskId?: string // taskId родительского deleteDatasetJob для удаления из ActiveJobs после завершения
): Promise<number> {
  Debug.info(ctx, `[cache-loader] удаление всего кэша для датасета ${datasetId}`)

  try {
    // Шаг 1: Проверяем, что записи существуют через findOneBy
    const firstRecord = await AnalyticsDatasetCache.findOneBy(ctx, {
      dataset_id: datasetId
    })

    if (!firstRecord) {
      Debug.info(ctx, `[cache-loader] нет записей для удаления для датасета ${datasetId}`)

      // Если есть socketId - ждем подтверждения готовности клиента
      // Делаем несколько быстрых проверок подряд, если не готово - запускаем джобу
      if (socketId) {
        await waitForClientReady(
          ctx,
          datasetId,
          socketId,
          shouldDeleteDataset,
          parentDeleteDatasetTaskId
        )
      } else {
        // Если нет socketId - сразу продолжаем удаление без ожидания
        await continueEmptyDatasetDeletion(
          ctx,
          datasetId,
          socketId,
          shouldDeleteDataset,
          parentDeleteDatasetTaskId
        )
      }

      return 0
    }

    Debug.info(
      ctx,
      `[cache-loader] найдены записи для датасета ${datasetId}, получение общего количества`
    )

    // Шаг 2: Получаем общее количество записей через countBy
    const totalCount = await AnalyticsDatasetCache.countBy(ctx, {
      dataset_id: datasetId
    })

    Debug.info(
      ctx,
      `[cache-loader] найдено ${totalCount} записей для удаления кэша датасета ${datasetId}`
    )

    // Шаг 3: Отправляем начальное сообщение о начале удаления с общим количеством
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-start',
          data: {
            datasetId,
            total: totalCount
          }
        })
        // Отправляем прогресс 0%
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-progress',
          data: {
            datasetId,
            deleted: 0,
            total: totalCount,
            progress: 0
          }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader] ошибка отправки сообщения о начале удаления: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // Шаг 4: Вычисляем количество сегментов (округление вверх)
    const SEGMENT_SIZE = 1000 // Размер сегмента (должен совпадать с загрузкой)
    const totalSegments = Math.ceil(totalCount / SEGMENT_SIZE)

    Debug.info(
      ctx,
      `[cache-loader] найдено ${totalSegments} сегментов для удаления датасета ${datasetId} (${totalCount} записей, размер сегмента: ${SEGMENT_SIZE})`
    )

    // Шаг 5: Запускаем первый сегмент через джобу (сразу, без задержки, так как это первый)
    // Последовательность обеспечивается тем, что следующий сегмент планируется только после успешного удаления текущего
    if (totalSegments > 0) {
      Debug.info(
        ctx,
        `[cache-loader] планирование удаления первого сегмента (0) для датасета ${datasetId} через джобу`
      )

      // @ts-ignore
      const taskId = await deleteCacheSegmentJob.scheduleJobAsap(ctx, {
        datasetId,
        componentId: null, // Для удаления всего датасета componentId не указываем
        segment: '0', // Первый сегмент - "0"
        socketId,
        retryAttempt: 0,
        deletedBeforeSegment: 0,
        totalSegments,
        currentSegmentIndex: 0,
        totalCount,
        shouldDeleteDataset, // Передаем флаг для удаления датасета после кэша
        parentDeleteDatasetTaskId // ✅ Передаём taskId родительского deleteDatasetJob для удаления из ActiveJobs после завершения
        // parentTaskId не передаём для первого джоба - он будет искать свой taskId по metadata
      })

      // Записываем taskId в таблицу сразу при создании джоба с метаданными для поиска
      await addActiveJobId(ctx, taskId, {
        jobType: 'delete-cache-segment',
        metadata: { datasetId, componentId: null, segment: '0', retryAttempt: 0 }
      })

      Debug.info(
        ctx,
        `[cache-loader] первый сегмент для датасета ${datasetId} запланирован, удаление продолжится асинхронно через джобы с интервалом 2 секунды, taskId=${taskId}`
      )

      // Возвращаем общее количество записей (удаление продолжится асинхронно)
      return totalCount
    }

    return 0
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    Debug.error(
      ctx,
      `[cache-loader] КРИТИЧЕСКАЯ ОШИБКА удаления кэша для датасета ${datasetId}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[cache-loader] stack trace: ${errorStack}`)
    }

    // Отправляем сообщение об ошибке
    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-error',
          data: {
            datasetId,
            error: errorMessage
          }
        })
        Debug.info(
          ctx,
          `[cache-loader] отправлено сообщение об ошибке удаления для датасета ${datasetId}`
        )
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader] ошибка отправки сообщения об ошибке удаления: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    throw error // Пробрасываем ошибку дальше, чтобы job мог её обработать
  }
}

/**
 * Cleanup джоб для подчистки хвостов - удаляет taskId из таблицы, если джоб завершился слишком быстро
 * Запускается через 3 секунды после завершения быстрого джоба
 */
/**
 * Cleanup джоб для подчистки хвостов - удаляет taskId из таблицы, если джоб завершился слишком быстро
 * Запускается через 3 секунды после завершения быстрого джоба
 */
// @ts-ignore
const cleanupJobTaskIdJob = app.job('/cleanup-job-taskid', async (ctx, params) => {
  const { jobType, datasetId, componentId, offset, retryAttempt, segment } = params as any

  try {
    const { removeActiveJobId } = await import('../../api/settings')
    const { ActiveJobs } = await import('../../tables/active-jobs.table')

    Debug.info(
      ctx,
      `[cache-loader:cleanup-job] подчистка хвостов для jobType=${jobType}, datasetId=${datasetId}`
    )

    // Ищем запись в таблице по метаданным
    // Используем where для фильтрации по jobType - это эффективнее
    const records = await ActiveJobs.findAll(ctx, {
      where: {
        jobType: jobType
      }
    })
    for (const record of records) {
      if (record.metadata && typeof record.metadata === 'object') {
        const meta = record.metadata as any
        let matches = true

        if (jobType === 'load-cache-batch') {
          matches =
            meta.datasetId === datasetId &&
            meta.componentId === componentId &&
            meta.offset === offset &&
            (meta.retryAttempt || 0) === retryAttempt
        } else if (jobType === 'delete-cache-segment') {
          matches =
            meta.datasetId === datasetId &&
            ((meta.componentId === null && componentId === null) ||
              meta.componentId === componentId) &&
            meta.segment === segment &&
            (meta.retryAttempt || 0) === retryAttempt
        }

        if (matches) {
          await removeActiveJobId(ctx, record.taskId)
          Debug.info(
            ctx,
            `[cache-loader:cleanup-job] удален taskId ${record.taskId} из списка активных джобов`
          )
          return
        }
      }
    }

    Debug.info(ctx, `[cache-loader:cleanup-job] запись не найдена в таблице, возможно уже удалена`)
  } catch (error) {
    Debug.warn(
      ctx,
      `[cache-loader:cleanup-job] ошибка подчистки: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    // Удаляем себя из таблицы после выполнения
    try {
      const { removeActiveJobId } = await import('../../api/settings')
      const { ActiveJobs } = await import('../../tables/active-jobs.table')
      // Используем where для фильтрации по jobType - это эффективнее
      const records = await ActiveJobs.findAll(ctx, {
        where: {
          jobType: 'cleanup-job-taskid'
        }
      })
      // Ищем все cleanup джобы для данного jobType и удаляем их (включая себя)
      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (
            meta.originalJobType === jobType &&
            meta.datasetId === datasetId &&
            ((jobType === 'load-cache-batch' &&
              meta.componentId === componentId &&
              meta.offset === offset &&
              (meta.retryAttempt || 0) === retryAttempt) ||
              (jobType === 'delete-cache-segment' &&
                ((meta.componentId === null && componentId === null) ||
                  meta.componentId === componentId) &&
                meta.segment === segment &&
                (meta.retryAttempt || 0) === retryAttempt))
          ) {
            await removeActiveJobId(ctx, record.taskId)
            Debug.info(
              ctx,
              `[cache-loader:cleanup-job] удален cleanup taskId ${record.taskId} из списка активных джобов`
            )
          }
        }
      }
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader:cleanup-job] ошибка удаления cleanup taskId: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
})

/**
 * Джоб для загрузки одного батча событий из ClickHouse в Heap
 * Используется для асинхронной загрузки, чтобы избежать таймаутов
 * ВАЖНО: Батчи выполняются ПОСЛЕДОВАТЕЛЬНО - следующий батч планируется только после успешного завершения текущего
 */
// @ts-ignore
export const loadEventsBatchJob = app.job('/load-events-batch', async (ctx, params) => {
  const {
    datasetId,
    componentId,
    component, // DatasetComponent
    offset,
    limit,
    socketId,
    retryAttempt = 0,
    currentBatchSize,
    loadedBeforeBatch,
    originalNeedToLoad,
    componentTitle,
    overallProgress,
    totalComponents,
    currentComponentIndex,
    previousComponents = [], // Массив предыдущих компонентов для каскадных условий
    parentTaskId // taskId родительского джоба для поиска текущего taskId в таблице
  } = params as any

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet } = await import('../../api/settings')
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(
      ctx,
      '[cache-loader:batch-job] обнаружен флаг остановки всех джобов, прекращаем работу'
    )
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../../tables/active-jobs.table')

        // Сначала ищем по parentTaskId, если он есть
        const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
        if (normalizedParentTaskId) {
          const records = await ActiveJobs.findAll(ctx, {
            where: {
              jobType: 'load-cache-batch',
              parentTaskId: normalizedParentTaskId
            }
          })
          if (records.length > 0) {
            return records[0].taskId
          }
        }

        // Fallback - поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'load-cache-batch'
          }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (
              meta.datasetId === datasetId &&
              meta.componentId === componentId &&
              meta.offset === offset &&
              (meta.retryAttempt || 0) === retryAttempt
            ) {
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
      const { removeActiveJobId } = await import('../../api/settings')
      await removeActiveJobId(ctx, taskIdToRemove)
    }
    return // Самоуничтожение
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  // Использует parentTaskId для надёжного поиска, если он передан
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../../tables/active-jobs.table')

      // ✅ ПРИОРИТЕТ 1: Если есть parentTaskId - ищем по нему (наиболее надёжный способ)
      const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
      if (normalizedParentTaskId) {
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'load-cache-batch',
            parentTaskId: normalizedParentTaskId
          }
        })

        // Находим запись, которая является дочерней для parentTaskId
        // Такая запись должна быть одна, т.к. каждый джоб создаёт только одного наследника
        if (records.length > 0) {
          const foundTaskId = records[0].taskId
          Debug.info(
            ctx,
            `[cache-loader:batch-job] найден taskId ${foundTaskId} по parentTaskId ${parentTaskId}`
          )
          return foundTaskId
        }

        Debug.warn(
          ctx,
          `[cache-loader:batch-job] не найден taskId по parentTaskId ${parentTaskId}, пробуем поиск по metadata`
        )
      }

      // ✅ ПРИОРИТЕТ 2: Fallback - поиск по metadata (для первого джоба или если parentTaskId не помог)
      const records = await ActiveJobs.findAll(ctx, {
        where: {
          jobType: 'load-cache-batch'
        }
      })

      // Ищем запись, которая соответствует текущему джобу по datasetId, componentId, offset и retryAttempt
      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (
            meta.datasetId === datasetId &&
            meta.componentId === componentId &&
            meta.offset === offset &&
            (meta.retryAttempt || 0) === retryAttempt
          ) {
            Debug.info(
              ctx,
              `[cache-loader:batch-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, componentId=${componentId}, offset=${offset}, retryAttempt=${retryAttempt})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader:batch-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  // Функция для удаления taskId текущего джоба из списка активных
  // ВАЖНО: Всегда читает taskId из таблицы в конце, не использует переданный currentTaskId
  const removeCurrentJobFromList = async () => {
    // ВСЕГДА читаем taskId из таблицы в конце джоба
    const taskIdToRemove = await getCurrentTaskIdFromTable()

    if (!taskIdToRemove) {
      // Если taskId не найден в таблице - возможно, джоб завершился слишком быстро
      // Планируем cleanup джоб через 3 секунды для подчистки хвостов
      Debug.warn(
        ctx,
        '[cache-loader:batch-job] taskId не найден в таблице, планируем cleanup джоб через 3 секунды'
      )

      // @ts-ignore
      const cleanupTaskId = await cleanupJobTaskIdJob.scheduleJobAfter(ctx, 3, 'seconds', {
        jobType: 'load-cache-batch',
        datasetId,
        componentId,
        offset,
        retryAttempt
      })

      await addActiveJobId(ctx, cleanupTaskId, {
        jobType: 'cleanup-job-taskid',
        metadata: {
          originalJobType: 'load-cache-batch',
          datasetId,
          componentId,
          offset,
          retryAttempt
        }
      })

      return
    }

    try {
      const { removeActiveJobId } = await import('../../api/settings')
      await removeActiveJobId(ctx, taskIdToRemove)
      Debug.info(
        ctx,
        `[cache-loader:batch-job] удален taskId ${taskIdToRemove} из списка активных джобов`
      )
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader:batch-job] не удалось удалить taskId ${taskIdToRemove}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const MAX_RETRIES = 3
  const RETRY_DELAY_SECONDS = 10 // 10 секунд задержка при ретраях
  const BATCH_DELAY_SECONDS = 2 // 2 секунды задержка между батчами

  try {
    Debug.info(
      ctx,
      `[cache-loader:batch-job] начало загрузки батча для компонента ${componentId}: offset=${offset}, limit=${limit}, попытка ${retryAttempt + 1}/${MAX_RETRIES + 1}`
    )

    // Загружаем батч (без ретраев - они обрабатываются в джобе через scheduleJobAfter)
    // Передаём предыдущие компоненты для каскадных условий
    const batchLoaded = await loadEventsBatch(
      ctx,
      datasetId,
      componentId,
      component,
      offset,
      limit,
      previousComponents || []
    )

    if (batchLoaded === -1) {
      // Произошла ошибка - планируем ретрай через 10 секунд
      if (retryAttempt < MAX_RETRIES) {
        Debug.warn(
          ctx,
          `[cache-loader:batch-job] ошибка при загрузке батча для компонента ${componentId}, планирование ретрая через ${RETRY_DELAY_SECONDS} секунд (попытка ${retryAttempt + 1}/${MAX_RETRIES})`
        )

        // Получаем taskId текущего джоба из таблицы в конце (для parentTaskId)
        const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

        const retryTaskId = await loadEventsBatchJob.scheduleJobAfter(
          ctx,
          RETRY_DELAY_SECONDS,
          'seconds',
          {
            datasetId,
            componentId,
            component,
            offset,
            limit: Math.max(50, Math.floor((limit || currentBatchSize || 200) / 2)), // Уменьшаем размер батча при ретраях
            socketId,
            retryAttempt: retryAttempt + 1,
            currentBatchSize: Math.max(50, Math.floor((currentBatchSize || 200) / 2)),
            loadedBeforeBatch,
            originalNeedToLoad,
            componentTitle,
            overallProgress,
            totalComponents,
            currentComponentIndex,
            previousComponents: previousComponents || [], // Передаём предыдущие компоненты
            parentTaskId: currentTaskIdFromTable || undefined // ✅ Передаём taskId текущего джоба как parentTaskId
          }
        )

        // ✅ ИСПРАВЛЕНО: Сначала добавляем новый job в список активных, чтобы stopAllJobs() мог его увидеть
        // Записываем taskId в таблицу сразу при создании джоба с метаданными для поиска
        await addActiveJobId(ctx, retryTaskId, {
          jobType: 'load-cache-batch',
          parentTaskId: currentTaskIdFromTable || undefined,
          metadata: { datasetId, componentId, offset, retryAttempt: retryAttempt + 1 }
        })

        // Удаляем taskId текущего джоба из списка активных ПОСЛЕ добавления нового
        await removeCurrentJobFromList()

        return
      } else {
        Debug.error(
          ctx,
          `[cache-loader:batch-job] КРИТИЧЕСКАЯ ОШИБКА: компонент ${componentId}: превышено максимальное количество попыток (${MAX_RETRIES})`
        )

        // Отправляем сообщение об ошибке через WebSocket
        if (socketId) {
          try {
            await sendDataToSocket(ctx, socketId, {
              type: 'dataset-cache-error',
              data: {
                componentId,
                error: `Превышено максимальное количество попыток загрузки батча (offset=${offset})`
              }
            })
          } catch (socketError) {
            Debug.warn(
              ctx,
              `[cache-loader:batch-job] ошибка отправки сообщения об ошибке: ${socketError instanceof Error ? socketError.message : String(socketError)}`
            )
          }
        }

        // Удаляем taskId текущего джоба из списка активных при завершении с ошибкой
        await removeCurrentJobFromList()

        return
      }
    }

    if (batchLoaded === 0) {
      // Больше записей нет - компонент загружен
      // Если originalNeedToLoad = 0, то загружено должно быть 0, независимо от loadedBeforeBatch
      const loaded = originalNeedToLoad === 0 ? 0 : (loadedBeforeBatch || 0) + batchLoaded
      const progress = 100

      Debug.info(
        ctx,
        `[cache-loader:batch-job] компонент ${componentId}: загрузка завершена, загружено ${loaded} записей (originalNeedToLoad=${originalNeedToLoad}, loadedBeforeBatch=${loadedBeforeBatch}, batchLoaded=${batchLoaded})`
      )

      // Отправляем финальный прогресс
      // Если originalNeedToLoad = 0, то total = 0
      // Если originalNeedToLoad > 0, то total = originalNeedToLoad
      const total = originalNeedToLoad > 0 ? originalNeedToLoad : 0

      if (socketId) {
        try {
          await sendDataToSocket(ctx, socketId, {
            type: 'dataset-cache-progress',
            data: {
              componentId,
              progress,
              loaded,
              total
            }
          })

          // Общий прогресс вычисляется на клиенте на основе прогресса компонентов
          // Не отправляем его из джоба, т.к. у нас нет актуальных данных о всех компонентах
        } catch (socketError) {
          Debug.warn(
            ctx,
            `[cache-loader:batch-job] ошибка отправки финального прогресса: ${socketError instanceof Error ? socketError.message : String(socketError)}`
          )
        }
      }

      // Удаляем taskId текущего джоба из списка активных при завершении
      await removeCurrentJobFromList()

      return
    }

    // Успешно загрузили батч
    // Если originalNeedToLoad = 0, то загружено должно быть 0, независимо от loadedBeforeBatch
    const loaded = originalNeedToLoad === 0 ? 0 : (loadedBeforeBatch || 0) + batchLoaded
    const nextOffset = offset + batchLoaded
    const remaining = (originalNeedToLoad || 0) - loaded
    const progress =
      (originalNeedToLoad || 0) > 0
        ? Math.round((loaded / (originalNeedToLoad || loaded)) * 100)
        : 100

    Debug.info(
      ctx,
      `[cache-loader:batch-job] компонент ${componentId}: успешно загружено ${batchLoaded} записей, всего ${loaded} из ${originalNeedToLoad || loaded} (${progress}%, originalNeedToLoad=${originalNeedToLoad}, loadedBeforeBatch=${loadedBeforeBatch})`
    )

    // Отправляем прогресс
    // Если originalNeedToLoad = 0, то total = 0
    // Если originalNeedToLoad > 0, то total = originalNeedToLoad
    const total = originalNeedToLoad > 0 ? originalNeedToLoad : 0

    if (socketId) {
      try {
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-progress',
          data: {
            componentId,
            progress,
            loaded,
            total
          }
        })

        // Общий прогресс вычисляется на клиенте на основе прогресса компонентов
        // Не отправляем его из джоба, т.к. у нас нет актуальных данных о всех компонентах
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader:batch-job] ошибка отправки прогресса: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // ВАЖНО: Если есть еще записи для загрузки - планируем следующий батч через 2 секунды
    // Это обеспечивает ПОСЛЕДОВАТЕЛЬНОЕ выполнение - следующий батч начнется только после успешного завершения текущего
    if (remaining > 0) {
      const nextBatchSize = Math.min(currentBatchSize || 200, remaining)
      Debug.info(
        ctx,
        `[cache-loader:batch-job] компонент ${componentId}: планирование следующего батча через ${BATCH_DELAY_SECONDS} секунд (offset=${nextOffset}, limit=${nextBatchSize}, осталось=${remaining})`
      )

      // Получаем taskId текущего джоба из таблицы в конце (для parentTaskId)
      const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

      const nextTaskId = await loadEventsBatchJob.scheduleJobAfter(
        ctx,
        BATCH_DELAY_SECONDS,
        'seconds',
        {
          datasetId,
          componentId,
          component,
          offset: nextOffset,
          limit: nextBatchSize,
          socketId,
          retryAttempt: 0, // Сбрасываем счетчик попыток для следующего батча
          currentBatchSize: nextBatchSize,
          loadedBeforeBatch: loaded,
          originalNeedToLoad,
          componentTitle,
          overallProgress,
          totalComponents,
          currentComponentIndex,
          previousComponents: previousComponents || [], // Передаём предыдущие компоненты
          parentTaskId: currentTaskIdFromTable || undefined // ✅ Передаём taskId текущего джоба как parentTaskId
        }
      )

      // ✅ ИСПРАВЛЕНО: Сначала добавляем новый job в список активных, чтобы stopAllJobs() мог его увидеть
      // Записываем taskId следующего джоба в таблицу сразу при создании с метаданными для поиска
      await addActiveJobId(ctx, nextTaskId, {
        jobType: 'load-cache-batch',
        parentTaskId: currentTaskIdFromTable || undefined,
        metadata: { datasetId, componentId, offset: nextOffset, retryAttempt: 0 }
      })

      // Удаляем taskId текущего джоба из списка активных ПОСЛЕ добавления нового
      await removeCurrentJobFromList()
    } else {
      // Все загружено
      Debug.info(
        ctx,
        `[cache-loader:batch-job] компонент ${componentId}: загрузка завершена, загружено ${loaded} записей`
      )

      // Удаляем taskId текущего джоба из списка активных при завершении
      await removeCurrentJobFromList()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    Debug.error(
      ctx,
      `[cache-loader:batch-job] КРИТИЧЕСКАЯ ОШИБКА при загрузке батча для компонента ${componentId}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[cache-loader:batch-job] stack trace: ${errorStack}`)
    }

    // Планируем ретрай через 10 секунд
    if (retryAttempt < MAX_RETRIES) {
      Debug.warn(
        ctx,
        `[cache-loader:batch-job] планирование ретрая через ${RETRY_DELAY_SECONDS} секунд (попытка ${retryAttempt + 1}/${MAX_RETRIES})`
      )

      // Получаем taskId текущего джоба из таблицы в конце (для parentTaskId)
      const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

      const retryTaskId = await loadEventsBatchJob.scheduleJobAfter(
        ctx,
        RETRY_DELAY_SECONDS,
        'seconds',
        {
          datasetId,
          componentId,
          component,
          offset,
          limit: Math.max(50, Math.floor((limit || currentBatchSize || 200) / 2)),
          socketId,
          retryAttempt: retryAttempt + 1,
          currentBatchSize: Math.max(50, Math.floor((currentBatchSize || 200) / 2)),
          loadedBeforeBatch,
          originalNeedToLoad,
          componentTitle,
          overallProgress,
          totalComponents,
          currentComponentIndex,
          previousComponents: previousComponents || [], // Передаём предыдущие компоненты
          parentTaskId: currentTaskIdFromTable || undefined // ✅ Передаём taskId текущего джоба как parentTaskId
        }
      )

      // ✅ ИСПРАВЛЕНО: Сначала добавляем новый job в список активных, чтобы stopAllJobs() мог его увидеть
      // Записываем taskId в таблицу сразу при создании джоба с метаданными для поиска
      await addActiveJobId(ctx, retryTaskId, {
        jobType: 'load-cache-batch',
        parentTaskId: currentTaskIdFromTable || undefined,
        metadata: { datasetId, componentId, offset, retryAttempt: retryAttempt + 1 }
      })

      // Удаляем taskId текущего джоба из списка активных ПОСЛЕ добавления нового
      await removeCurrentJobFromList()
    } else {
      // Превышено максимальное количество попыток - удаляем taskId
      await removeCurrentJobFromList()
    }
  }
})

/**
 * Джоб для удаления одного сегмента кэша
 * Удаляет сегмент через deleteAll с условием where по dataset_id, component_id (опционально) и segment
 * ВАЖНО: Сегменты удаляются ПОСЛЕДОВАТЕЛЬНО - следующий сегмент планируется только после успешного удаления текущего
 */
// @ts-ignore
export const deleteCacheSegmentJob = app.job('/delete-cache-segment', async (ctx, params) => {
  const {
    datasetId,
    componentId, // Опционально - если не указан, удаляем для всего датасета
    segment,
    socketId,
    retryAttempt = 0,
    deletedBeforeSegment = 0,
    totalSegments = 0,
    currentSegmentIndex = 0,
    totalCount = 0,
    shouldDeleteDataset = false, // Если true, после завершения удаления кэша будет удалён датасет
    parentTaskId, // taskId родительского джоба для поиска текущего taskId в таблице
    parentDeleteDatasetTaskId // taskId родительского deleteDatasetJob для удаления из ActiveJobs после завершения
  } = params as any

  // ✅ ПРОВЕРКА ФЛАГА ОСТАНОВКИ В НАЧАЛЕ ДЖОБА
  const { isStopAllJobsFlagSet } = await import('../../api/settings')
  if (await isStopAllJobsFlagSet(ctx)) {
    Debug.info(
      ctx,
      '[cache-loader:delete-segment-job] обнаружен флаг остановки всех джобов, прекращаем работу'
    )
    // Удаляем taskId из списка активных - используем ту же логику, что и в конце джоба
    const getCurrentTaskIdFromTableForStop = async (): Promise<string | null> => {
      try {
        const { ActiveJobs } = await import('../../tables/active-jobs.table')

        // Сначала ищем по parentTaskId, если он есть
        const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
        if (normalizedParentTaskId) {
          const records = await ActiveJobs.findAll(ctx, {
            where: {
              jobType: 'delete-cache-segment',
              parentTaskId: normalizedParentTaskId
            }
          })
          if (records.length > 0) {
            return records[0].taskId
          }
        }

        // Fallback - поиск по metadata
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'delete-cache-segment'
          }
        })
        for (const record of records) {
          if (record.metadata && typeof record.metadata === 'object') {
            const meta = record.metadata as any
            if (
              meta.datasetId === datasetId &&
              ((meta.componentId === null && componentId === null) ||
                meta.componentId === componentId) &&
              meta.segment === segment &&
              (meta.retryAttempt || 0) === retryAttempt
            ) {
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
      const { removeActiveJobId } = await import('../../api/settings')
      await removeActiveJobId(ctx, taskIdToRemove)
    }
    return // Самоуничтожение
  }

  // Функция для получения taskId текущего джоба из таблицы ActiveJobs
  // ВАЖНО: Вызывается только в конце джоба, непосредственно перед удалением
  // Использует parentTaskId для надёжного поиска, если он передан
  const getCurrentTaskIdFromTable = async (): Promise<string | null> => {
    try {
      const { ActiveJobs } = await import('../../tables/active-jobs.table')

      // ✅ ПРИОРИТЕТ 1: Если есть parentTaskId - ищем по нему (наиболее надёжный способ)
      const normalizedParentTaskId = normalizeParentTaskId(parentTaskId)
      if (normalizedParentTaskId) {
        const records = await ActiveJobs.findAll(ctx, {
          where: {
            jobType: 'delete-cache-segment',
            parentTaskId: normalizedParentTaskId
          }
        })

        // Находим запись, которая является дочерней для parentTaskId
        // Такая запись должна быть одна, т.к. каждый джоб создаёт только одного наследника
        if (records.length > 0) {
          const foundTaskId = records[0].taskId
          Debug.info(
            ctx,
            `[cache-loader:delete-segment-job] найден taskId ${foundTaskId} по parentTaskId ${parentTaskId}`
          )
          return foundTaskId
        }

        Debug.warn(
          ctx,
          `[cache-loader:delete-segment-job] не найден taskId по parentTaskId ${parentTaskId}, пробуем поиск по metadata`
        )
      }

      // ✅ ПРИОРИТЕТ 2: Fallback - поиск по metadata (для первого джоба или если parentTaskId не помог)
      const records = await ActiveJobs.findAll(ctx, {
        where: {
          jobType: 'delete-cache-segment'
        }
      })

      // Ищем запись, которая соответствует текущему джобу по datasetId, componentId, segment и retryAttempt
      for (const record of records) {
        if (record.metadata && typeof record.metadata === 'object') {
          const meta = record.metadata as any
          if (
            meta.datasetId === datasetId &&
            ((meta.componentId === null && componentId === null) ||
              meta.componentId === componentId) &&
            meta.segment === segment &&
            (meta.retryAttempt || 0) === retryAttempt
          ) {
            Debug.info(
              ctx,
              `[cache-loader:delete-segment-job] найден taskId ${record.taskId} по metadata (datasetId=${datasetId}, componentId=${componentId}, segment=${segment}, retryAttempt=${retryAttempt})`
            )
            return record.taskId
          }
        }
      }

      return null
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader:delete-segment-job] ошибка получения taskId из таблицы: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  // Функция для удаления taskId текущего джоба из списка активных
  // ВАЖНО: Всегда читает taskId из таблицы в конце, не использует переданный currentTaskId
  const removeCurrentJobFromList = async () => {
    // ВСЕГДА читаем taskId из таблицы в конце джоба
    const taskIdToRemove = await getCurrentTaskIdFromTable()

    if (!taskIdToRemove) {
      // Если taskId не найден в таблице - возможно, джоб завершился слишком быстро
      // Планируем cleanup джоб через 3 секунды для подчистки хвостов
      Debug.warn(
        ctx,
        '[cache-loader:delete-segment-job] taskId не найден в таблице, планируем cleanup джоб через 3 секунды'
      )

      // @ts-ignore
      const cleanupTaskId = await cleanupJobTaskIdJob.scheduleJobAfter(ctx, 3, 'seconds', {
        jobType: 'delete-cache-segment',
        datasetId,
        componentId,
        segment,
        retryAttempt
      })

      await addActiveJobId(ctx, cleanupTaskId, {
        jobType: 'cleanup-job-taskid',
        metadata: {
          originalJobType: 'delete-cache-segment',
          datasetId,
          componentId,
          segment,
          retryAttempt
        }
      })

      return
    }

    try {
      const { removeActiveJobId } = await import('../../api/settings')
      await removeActiveJobId(ctx, taskIdToRemove)
      Debug.info(
        ctx,
        `[cache-loader:delete-segment-job] удален taskId ${taskIdToRemove} из списка активных джобов`
      )
    } catch (error) {
      Debug.warn(
        ctx,
        `[cache-loader:delete-segment-job] не удалось удалить taskId ${taskIdToRemove}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const MAX_RETRIES = 3
  const RETRY_DELAY_SECONDS = 10 // 10 секунд задержка при ретраях
  const SEGMENT_DELAY_SECONDS = 2 // 2 секунды задержка между сегментами

  try {
    Debug.info(
      ctx,
      `[cache-loader:delete-segment-job] начало удаления сегмента ${segment} для датасета ${datasetId}${componentId ? `, компонента ${componentId}` : ''} (попытка ${retryAttempt + 1}/${MAX_RETRIES + 1})`
    )

    // Формируем условие where для удаления сегмента
    const whereCondition: any = {
      dataset_id: datasetId,
      segment: segment
    }

    if (componentId) {
      whereCondition.component_id = componentId
    }

    // Удаляем сегмент через deleteAll (без limit, т.к. мы знаем, что записей <= 1000)
    const deleted = await AnalyticsDatasetCache.deleteAll(ctx, {
      where: whereCondition,
      limit: null // Удаляем все записи сегмента
    })

    Debug.info(
      ctx,
      `[cache-loader:delete-segment-job] сегмент ${segment}: удалено ${deleted} записей`
    )

    const totalDeleted = deletedBeforeSegment + deleted

    // Отправляем прогресс
    if (socketId) {
      try {
        const progress = totalCount > 0 ? Math.round((totalDeleted / totalCount) * 100) : 0
        await sendDataToSocket(ctx, socketId, {
          type: 'dataset-cache-delete-progress',
          data: componentId
            ? {
                componentId,
                deleted: totalDeleted,
                total: totalCount,
                progress
              }
            : {
                datasetId,
                deleted: totalDeleted,
                total: totalCount,
                progress
              }
        })
      } catch (socketError) {
        Debug.warn(
          ctx,
          `[cache-loader:delete-segment-job] ошибка отправки прогресса: ${socketError instanceof Error ? socketError.message : String(socketError)}`
        )
      }
    }

    // Планируем следующий сегмент
    const nextSegmentIndex = currentSegmentIndex + 1
    if (nextSegmentIndex < totalSegments) {
      const nextSegment = String(nextSegmentIndex)
      Debug.info(
        ctx,
        `[cache-loader:delete-segment-job] планирование следующего сегмента ${nextSegment} через ${SEGMENT_DELAY_SECONDS} секунд (сегмент ${nextSegmentIndex + 1}/${totalSegments})`
      )

      // Получаем taskId текущего джоба из таблицы в конце (для parentTaskId)
      const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

      const nextTaskId = await deleteCacheSegmentJob.scheduleJobAfter(
        ctx,
        SEGMENT_DELAY_SECONDS,
        'seconds',
        {
          datasetId,
          componentId,
          segment: nextSegment,
          socketId,
          retryAttempt: 0, // Сбрасываем счетчик попыток для следующего сегмента
          deletedBeforeSegment: totalDeleted,
          totalSegments,
          currentSegmentIndex: nextSegmentIndex,
          totalCount,
          shouldDeleteDataset, // Передаем флаг дальше
          parentTaskId: currentTaskIdFromTable || undefined, // ✅ Передаём taskId текущего джоба как parentTaskId
          parentDeleteDatasetTaskId // ✅ Передаём taskId родительского deleteDatasetJob дальше
        }
      )

      // ✅ ИСПРАВЛЕНО: Сначала добавляем новый job в список активных, чтобы stopAllJobs() мог его увидеть
      // Записываем taskId следующего джоба в таблицу сразу при создании с метаданными для поиска
      await addActiveJobId(ctx, nextTaskId, {
        jobType: 'delete-cache-segment',
        parentTaskId: currentTaskIdFromTable || undefined,
        metadata: { datasetId, componentId, segment: nextSegment, retryAttempt: 0 }
      })

      // Удаляем taskId текущего джоба из списка активных ПОСЛЕ добавления нового
      await removeCurrentJobFromList()
    } else {
      // Все сегменты удалены - проверяем, что записей действительно больше нет
      Debug.info(
        ctx,
        `[cache-loader:delete-segment-job] удаление завершено: удалено ${totalDeleted} записей из ${totalSegments} сегментов`
      )

      // Проверяем через countBy, что записей действительно больше нет
      const whereCondition: any = { dataset_id: datasetId }
      if (componentId) {
        whereCondition.component_id = componentId
      }

      const remainingCount = await AnalyticsDatasetCache.countBy(ctx, whereCondition)

      if (remainingCount > 0) {
        // Еще есть записи - продолжаем удаление
        Debug.warn(
          ctx,
          `[cache-loader:delete-segment-job] обнаружены дополнительные записи (${remainingCount}), продолжаем удаление`
        )

        // Вычисляем количество оставшихся сегментов
        const SEGMENT_SIZE = 1000
        const remainingSegments = Math.ceil(remainingCount / SEGMENT_SIZE)
        const newTotalSegments = currentSegmentIndex + 1 + remainingSegments
        const newTotalCount = totalCount + remainingCount

        // Запускаем удаление следующего сегмента (сегмент с индексом currentSegmentIndex + 1)
        const nextSegmentIndex = currentSegmentIndex + 1
        const nextSegment = String(nextSegmentIndex)

        Debug.info(
          ctx,
          `[cache-loader:delete-segment-job] планирование дополнительного сегмента ${nextSegment} (всего сегментов: ${newTotalSegments})`
        )

        // Получаем taskId текущего джоба из таблицы в конце (для parentTaskId)
        const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

        const nextTaskId = await deleteCacheSegmentJob.scheduleJobAfter(
          ctx,
          SEGMENT_DELAY_SECONDS,
          'seconds',
          {
            datasetId,
            componentId,
            segment: nextSegment,
            socketId,
            retryAttempt: 0,
            deletedBeforeSegment: totalDeleted,
            totalSegments: newTotalSegments,
            currentSegmentIndex: nextSegmentIndex,
            totalCount: newTotalCount,
            shouldDeleteDataset,
            parentTaskId: currentTaskIdFromTable || undefined, // ✅ Передаём taskId текущего джоба как parentTaskId
            parentDeleteDatasetTaskId // ✅ Передаём taskId родительского deleteDatasetJob дальше
          }
        )

        // ✅ ИСПРАВЛЕНО: Сначала добавляем новый job в список активных, чтобы stopAllJobs() мог его увидеть
        // Записываем taskId следующего джоба в таблицу сразу при создании с метаданными для поиска
        await addActiveJobId(ctx, nextTaskId, {
          jobType: 'delete-cache-segment',
          parentTaskId: currentTaskIdFromTable || undefined,
          metadata: { datasetId, componentId, segment: nextSegment, retryAttempt: 0 }
        })

        // Удаляем taskId текущего джоба из списка активных ПОСЛЕ добавления нового
        await removeCurrentJobFromList()
      } else {
        // Записей больше нет - удаление кэша завершено
        Debug.info(
          ctx,
          `[cache-loader:delete-segment-job] подтверждено отсутствие записей (countBy вернул 0), удаление кэша завершено`
        )

        // Отправляем финальное сообщение
        if (socketId) {
          try {
            await sendDataToSocket(ctx, socketId, {
              type: 'dataset-cache-delete-complete',
              data: componentId
                ? {
                    componentId,
                    deleted: totalDeleted
                  }
                : {
                    datasetId,
                    deleted: totalDeleted
                  }
            })
          } catch (socketError) {
            Debug.warn(
              ctx,
              `[cache-loader:delete-segment-job] ошибка отправки финального сообщения: ${socketError instanceof Error ? socketError.message : String(socketError)}`
            )
          }
        }

        // Если нужно удалить датасет (для удаления всего датасета, а не компонента)
        if (shouldDeleteDataset && !componentId) {
          Debug.info(
            ctx,
            `[cache-loader:delete-segment-job] запуск удаления датасета ${datasetId} после завершения удаления кэша`
          )

          try {
            // Импортируем deleteDatasetJob динамически, чтобы избежать циклических зависимостей
            const { AnalyticsDatasets } = await import('../../tables/datasets.table')

            // Проверяем, что датасет еще существует
            const dataset = await AnalyticsDatasets.findById(ctx, datasetId)
            if (!dataset) {
              Debug.warn(
                ctx,
                `[cache-loader:delete-segment-job] датасет ${datasetId} уже удалён, пропускаем удаление`
              )
            } else {
              // Удаляем датасет
              await AnalyticsDatasets.delete(ctx, datasetId)
              Debug.info(
                ctx,
                `[cache-loader:delete-segment-job] датасет ${datasetId} успешно удалён`
              )

              // Отправляем сообщение о завершении удаления датасета
              if (socketId) {
                try {
                  await sendDataToSocket(ctx, socketId, {
                    type: 'dataset-delete-complete',
                    data: {
                      datasetId
                    }
                  })
                } catch (socketError) {
                  Debug.warn(
                    ctx,
                    `[cache-loader:delete-segment-job] ошибка отправки сообщения о завершении удаления датасета: ${socketError instanceof Error ? socketError.message : String(socketError)}`
                  )
                }
              }

              // ✅ Удаляем taskId родительского deleteDatasetJob после успешного удаления датасета
              if (parentDeleteDatasetTaskId) {
                try {
                  const { removeActiveJobId } = await import('../../api/settings')
                  await removeActiveJobId(ctx, parentDeleteDatasetTaskId)
                  Debug.info(
                    ctx,
                    `[cache-loader:delete-segment-job] удалён taskId родительского deleteDatasetJob ${parentDeleteDatasetTaskId} из списка активных джобов`
                  )
                } catch (error) {
                  Debug.warn(
                    ctx,
                    `[cache-loader:delete-segment-job] не удалось удалить taskId родительского deleteDatasetJob ${parentDeleteDatasetTaskId}: ${error instanceof Error ? error.message : String(error)}`
                  )
                }
              }
            }
          } catch (deleteError) {
            const errorMessage =
              deleteError instanceof Error ? deleteError.message : String(deleteError)
            Debug.error(
              ctx,
              `[cache-loader:delete-segment-job] ошибка удаления датасета ${datasetId}: ${errorMessage}`
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
                  `[cache-loader:delete-segment-job] ошибка отправки сообщения об ошибке удаления датасета: ${socketError instanceof Error ? socketError.message : String(socketError)}`
                )
              }
            }
          }
        }

        // Удаляем taskId текущего джоба из списка активных при завершении
        await removeCurrentJobFromList()
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    Debug.error(
      ctx,
      `[cache-loader:delete-segment-job] КРИТИЧЕСКАЯ ОШИБКА при удалении сегмента ${segment}: ${errorMessage}`
    )
    if (errorStack) {
      Debug.error(ctx, `[cache-loader:delete-segment-job] stack trace: ${errorStack}`)
    }

    // Планируем ретрай через 10 секунд
    if (retryAttempt < MAX_RETRIES) {
      Debug.warn(
        ctx,
        `[cache-loader:delete-segment-job] планирование ретрая через ${RETRY_DELAY_SECONDS} секунд (попытка ${retryAttempt + 1}/${MAX_RETRIES})`
      )

      // Получаем taskId текущего джоба из таблицы в конце (для parentTaskId)
      const currentTaskIdFromTable = await getCurrentTaskIdFromTable()

      const retryTaskId = await deleteCacheSegmentJob.scheduleJobAfter(
        ctx,
        RETRY_DELAY_SECONDS,
        'seconds',
        {
          datasetId,
          componentId,
          segment,
          socketId,
          retryAttempt: retryAttempt + 1,
          deletedBeforeSegment,
          totalSegments,
          currentSegmentIndex,
          totalCount,
          shouldDeleteDataset, // Передаем флаг дальше
          parentTaskId: currentTaskIdFromTable || undefined, // ✅ Передаём taskId текущего джоба как parentTaskId
          parentDeleteDatasetTaskId // ✅ Передаём taskId родительского deleteDatasetJob дальше
        }
      )

      // ✅ ИСПРАВЛЕНО: Сначала добавляем новый job в список активных, чтобы stopAllJobs() мог его увидеть
      // Записываем taskId в таблицу сразу при создании джоба с метаданными для поиска
      await addActiveJobId(ctx, retryTaskId, {
        jobType: 'delete-cache-segment',
        parentTaskId: currentTaskIdFromTable || undefined,
        metadata: { datasetId, componentId, segment, retryAttempt: retryAttempt + 1 }
      })

      // Удаляем taskId текущего джоба из списка активных ПОСЛЕ добавления нового
      await removeCurrentJobFromList()
    } else {
      // Превышено максимальное количество попыток
      Debug.error(
        ctx,
        `[cache-loader:delete-segment-job] КРИТИЧЕСКАЯ ОШИБКА: превышено максимальное количество попыток удаления сегмента ${segment}`
      )

      // Отправляем сообщение об ошибке
      if (socketId) {
        try {
          await sendDataToSocket(ctx, socketId, {
            type: 'dataset-cache-delete-error',
            data: componentId
              ? {
                  componentId,
                  error: `Превышено максимальное количество попыток удаления сегмента ${segment}`
                }
              : {
                  datasetId,
                  error: `Превышено максимальное количество попыток удаления сегмента ${segment}`
                }
          })
        } catch (socketError) {
          Debug.warn(
            ctx,
            `[cache-loader:delete-segment-job] ошибка отправки сообщения об ошибке: ${socketError instanceof Error ? socketError.message : String(socketError)}`
          )
        }
      }

      // Удаляем taskId текущего джоба из списка активных при завершении с ошибкой
      await removeCurrentJobFromList()
    }
  }
})
