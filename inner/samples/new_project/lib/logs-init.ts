// @shared

import { ProjectLogs } from '../tables/projectLogs.table'
import { setProjectLogsTable, persistLog, setCounterCallbacks } from './logs-operations'
import { setPersistLogCallback } from '../shared/debug'
import { incrementErrorCountSilent, incrementWarnCountSilent } from './logging'

// Инжектируем таблицу логов до любого использования logs-operations (избегаем undefined в бандле)
setProjectLogsTable(ProjectLogs)

let initialized = false

/**
 * Инициализация системы логирования
 * Устанавливает callbacks для сохранения логов и инкремента счётчиков
 */
export function initializeLogging(): void {
  if (initialized) {
    return // Инициализация уже выполнена
  }

  // Инициализация модуля логов (устанавливает callback для Debug → logs-operations)
  setPersistLogCallback(async (ctx, payload) => {
    await persistLog(ctx, payload.level, payload.message, payload.code)
  })

  // Инициализация callbacks для инкремента счётчиков (избегаем циклической зависимости)
  setCounterCallbacks(incrementErrorCountSilent, incrementWarnCountSilent)

  initialized = true
}

// Автоматическая инициализация при импорте (на случай, если это сработает)
initializeLogging()
