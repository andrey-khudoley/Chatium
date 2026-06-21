import ClientLogs from "../tables/client-logs.table"

// Простой endpoint для логирования из Service Worker (без авторизации, с ограничениями)
export const apiClientLogSimpleRoute = app.post('/log-simple', async (ctx, req) => {
  const { type, message, details, deviceId } = req.body
  
  // Базовая защита - максимум 100 логов в час с одного IP
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentLogs = await ClientLogs.select({
    count: { $count: ['id'] }
  })
  .where({
    createdAt: { $gte: hourAgo },
    userAgent: req.headers['user-agent'] || 'unknown'
  })
  .run(ctx)
  
  if (recentLogs?.[0]?.count > 100) {
    return { success: false, error: 'Rate limit exceeded' }
  }
  
  await ClientLogs.create(ctx, {
    userId: deviceId || 'sw-anonymous',
    type: type || 'sw-log',
    message: String(message).slice(0, 500),
    details: details ? String(details).slice(0, 2000) : null,
    userAgent: req.headers['user-agent'] || 'sw-unknown',
    url: req.headers.referer || 'sw-unknown',
  })

  return { success: true }
})
