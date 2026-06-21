// @shared
import { ref } from 'vue'
import { apiClientLogRoute } from '../api/client-logs'

const pendingLogs: Array<{type: string, message: string, details?: string}> = []
let flushTimer: any = null

async function flushLogs() {
  if (pendingLogs.length === 0) return
  
  const logs = [...pendingLogs]
  pendingLogs.length = 0
  
  for (const log of logs) {
    try {
      await apiClientLogRoute.run(window.ctx, log)
    } catch (e) {
      // Silent fail
    }
  }
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushLogs, 1000)
}

export function useClientLogger() {
  function log(type: string, message: string, details?: any) {
    const detailsStr = details ? JSON.stringify(details, null, 2).slice(0, 5000) : undefined
    
    pendingLogs.push({
      type,
      message: message.slice(0, 1000),
      details: detailsStr,
    })
    
    scheduleFlush()
  }
  
  function error(message: string, details?: any) {
    log('error', message, details)
  }
  
  function info(message: string, details?: any) {
    log('info', message, details)
  }
  
  function warn(message: string, details?: any) {
    log('warn', message, details)
  }
  
  return {
    log,
    error,
    info,
    warn,
    flush: flushLogs,
  }
}

// Global error handler
export function setupGlobalErrorHandler() {
  const logger = useClientLogger()
  
  window.addEventListener('error', (event) => {
    logger.error('Global error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    })
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason?.message || event.reason,
      stack: event.reason?.stack,
    })
  })
}
