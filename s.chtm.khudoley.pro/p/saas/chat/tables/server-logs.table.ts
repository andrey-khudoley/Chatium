import { Heap } from '@app/heap'

/**
 * Серверные логи приложения (уровень, сообщение, payload, timestamp).
 * Используется lib/logger.lib и repos/server-logs.repo.
 */
export const ServerLogs = Heap.Table('t_projekt_chat_server_logs_L0g', {
  message: Heap.String({ customMeta: { title: 'Сообщение' } }),
  payload: Heap.Optional(Heap.String({ customMeta: { title: 'Данные (JSON)' } })),
  severity: Heap.Number({ customMeta: { title: 'Severity (syslog 0–7)' } }),
  level: Heap.String({ customMeta: { title: 'Уровень (emergency…debug)' } }),
  timestamp: Heap.Number({ customMeta: { title: 'Время (Unix ms)' } })
})

export default ServerLogs
export type ServerLogsRow = typeof ServerLogs.T
export type ServerLogsRowJson = typeof ServerLogs.JsonT
