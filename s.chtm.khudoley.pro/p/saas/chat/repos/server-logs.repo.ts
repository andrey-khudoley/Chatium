import ServerLogs from '../tables/server-logs.table'

/**
 * Репозиторий серверных логов. Только запись; без логирования внутри, чтобы избежать рекурсии с logger.lib.
 */
export async function create(
  ctx: app.Ctx,
  data: {
    message: string
    payload: string | null
    severity: number
    level: string
    timestamp: number
  }
) {
  return ServerLogs.create(ctx, data)
}
