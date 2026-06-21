// @shared

import { ProjectSettings } from '../tables/settings.table'
import { request } from '@app/request'

/**
 * Операции с таблицей логов.
 * Таблица передаётся извне через setProjectLogsTable() (из logs-init), чтобы избежать
 * проблем с порядком загрузки модулей в бандле.
 */

export type LogLevel = 'info' | 'warn' | 'error'

const LOGS_LIMIT = 1000
const LOGS_WEBHOOK_ENABLED_KEY = 'logs_webhook_enabled'
const LOGS_WEBHOOK_URL_KEY = 'logs_webhook_url'

// Таблица логов (инжектируется из logs-init при загрузке)
let projectLogsTable: {
  create: Function
  findAll: Function
  countBy: Function
  delete: Function
} | null = null

/**
 * Установить таблицу логов. Вызывается из logs-init при инициализации.
 */
export function setProjectLogsTable(table: {
  create: Function
  findAll: Function
  countBy: Function
  delete: Function
}): void {
  projectLogsTable = table
}

function getProjectLogs(): {
  create: Function
  findAll: Function
  countBy: Function
  delete: Function
} {
  if (!projectLogsTable) {
    throw new Error(
      '[logs-operations] Таблица ProjectLogs не инициализирована. Убедитесь, что logs-init загружен до вызова API логов.'
    )
  }
  return projectLogsTable
}

/**
 * Вернуть инжектированную таблицу логов или null (без выброса).
 * Используется в API admin-logs как fallback, когда статический импорт недоступен.
 */
export function getProjectLogsOrNull(): {
  create: Function
  findAll: Function
  countBy: Function
  delete: Function
} | null {
  return projectLogsTable
}

// Callbacks для инкремента счётчиков (устанавливаются извне, чтобы избежать циклической зависимости)
let incrementErrorCallback: ((ctx: RichUgcCtx) => Promise<void>) | null = null
let incrementWarnCallback: ((ctx: RichUgcCtx) => Promise<void>) | null = null

/**
 * Установить callbacks для инкремента счётчиков.
 * Вызывается из logs-init.ts при инициализации.
 */
export function setCounterCallbacks(
  incrementError: (ctx: RichUgcCtx) => Promise<void>,
  incrementWarn: (ctx: RichUgcCtx) => Promise<void>
): void {
  incrementErrorCallback = incrementError
  incrementWarnCallback = incrementWarn
}

/**
 * Проверить, установлены ли callbacks (для диагностики)
 */
export function checkCallbacksStatus(): { errorCallbackSet: boolean; warnCallbackSet: boolean } {
  return {
    errorCallbackSet: incrementErrorCallback !== null,
    warnCallbackSet: incrementWarnCallback !== null
  }
}

/**
 * Сохранение лога в БД с автоматической очисткой старых записей.
 * Экспортируется для использования в качестве callback из debug.ts.
 * В контексте API (@shared-route) Heap может быть не инициализирован — тогда запись в БД и trim пропускаются.
 */
export async function persistLog(
  ctx: RichUgcCtx,
  level: LogLevel,
  message: string,
  code?: string
): Promise<void> {
  const ProjectLogs = getProjectLogsOrNull()
  if (ProjectLogs) {
    await ProjectLogs.create(ctx, {
      level,
      message,
      code
    })
    await trimLogsIfNeeded(ctx, ProjectLogs)
  }

  try {
    if (level === 'error' && incrementErrorCallback) await incrementErrorCallback(ctx)
    else if (level === 'warn' && incrementWarnCallback) await incrementWarnCallback(ctx)
  } catch {
    // не ломаем основной поток
  }

  // При активном вебхуке отправляем новый лог в настроенный URL (только если есть настройки)
  try {
    const [enabledRow, urlRow] = await Promise.all([
      ProjectSettings.findOneBy(ctx, { key: LOGS_WEBHOOK_ENABLED_KEY }).catch(() => null),
      ProjectSettings.findOneBy(ctx, { key: LOGS_WEBHOOK_URL_KEY }).catch(() => null)
    ])
    const enabled = enabledRow?.value === true || enabledRow?.value === 'true'
    const url = typeof urlRow?.value === 'string' ? urlRow.value.trim() : ''
    if (enabled && url) {
      await request({
        url,
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        json: {
          level,
          message,
          code: code ?? null,
          createdAt: new Date().toISOString()
        },
        throwHttpErrors: false
      })
    }
  } catch {
    // не ломаем основной поток при ошибке вебхука
  }
}

/**
 * Очистка старых логов при превышении лимита (вызывается только при доступной таблице)
 */
async function trimLogsIfNeeded(
  ctx: RichUgcCtx,
  table?: { findAll: Function; countBy: Function; delete: Function }
): Promise<void> {
  const ProjectLogs = table ?? getProjectLogsOrNull()
  if (!ProjectLogs) return
  try {
    const total = await ProjectLogs.countBy(ctx)
    if (total <= LOGS_LIMIT) return

    const overflow = total - LOGS_LIMIT
    const deleteCount = Math.min(overflow, LOGS_LIMIT)

    const oldest = await ProjectLogs.findAll(ctx, {
      order: [{ createdAt: 'asc' }],
      limit: deleteCount
    })

    for (const log of oldest) {
      try {
        await ProjectLogs.delete(ctx, log.id)
      } catch {
        // Продолжаем даже если удаление отдельной записи не удалось
      }
    }
  } catch {
    // Игнорируем ошибки очистки
  }
}

/** Тип таблицы логов (create, findAll, countBy, delete) */
export type ProjectLogsTable = {
  create: Function
  findAll: Function
  countBy: Function
  delete: Function
}

/**
 * Получение логов с фильтрацией и пагинацией.
 * @param table — таблица логов; если не передана, используется глобальная (setProjectLogsTable).
 */
export async function getLogs(
  ctx: RichUgcCtx,
  options: {
    level?: LogLevel
    limit?: number
    offset?: number
    before?: Date | string
  } = {},
  table?: ProjectLogsTable
) {
  const { level, limit = 50, offset = 0, before } = options

  const where: Record<string, any> = {}
  if (level) {
    where.level = level
  }
  if (before) {
    const beforeDate = before instanceof Date ? before : new Date(before)
    if (!Number.isNaN(beforeDate.getTime())) {
      where.createdAt = { $lt: beforeDate }
    }
  }
  const normalizedWhere = Object.keys(where).length ? where : undefined

  const ProjectLogs = table ?? getProjectLogsOrNull()
  if (!ProjectLogs || typeof ProjectLogs.findAll !== 'function') {
    return []
  }
  const logs = await ProjectLogs.findAll(ctx, {
    where: normalizedWhere,
    order: [{ createdAt: 'desc' }],
    limit,
    ...(before ? {} : { offset })
  })

  return logs.map((log: any) => ({
    id: log.id,
    level: log.level,
    message: log.message,
    code: log.code,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt
  }))
}

/**
 * Получение счётчиков логов по уровням.
 * @param table — таблица логов; если не передана, используется глобальная (setProjectLogsTable).
 */
export async function getLogCounts(ctx: RichUgcCtx, table?: ProjectLogsTable) {
  const ProjectLogs = table ?? getProjectLogsOrNull()
  if (!ProjectLogs || typeof ProjectLogs.countBy !== 'function') {
    return { info: 0, warn: 0, error: 0 }
  }
  const [infoCount, warnCount, errorCount] = await Promise.all([
    ProjectLogs.countBy(ctx, { level: 'info' }),
    ProjectLogs.countBy(ctx, { level: 'warn' }),
    ProjectLogs.countBy(ctx, { level: 'error' })
  ])

  return {
    info: infoCount,
    warn: warnCount,
    error: errorCount
  }
}

/**
 * Проверка доступности таблицы логов
 */
export async function checkLogsTableAvailable(ctx: RichUgcCtx): Promise<boolean> {
  const ProjectLogs = getProjectLogs()
  await ProjectLogs.findAll(ctx, { limit: 1 })
  return true
}
