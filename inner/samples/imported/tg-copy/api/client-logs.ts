import ClientLogs from "../tables/client-logs.table"

export const apiClientLogRoute = app.post('/log', async (ctx, req) => {
  const { type, message, details } = req.body
  
  await ClientLogs.create(ctx, {
    userId: ctx.user?.id || 'anonymous',
    type: type || 'log',
    message: String(message).slice(0, 1000),
    details: details ? String(details).slice(0, 5000) : null,
    userAgent: req.headers['user-agent'] || 'unknown',
    url: req.headers.referer || 'unknown',
  })

  return { success: true }
})

export const apiClientLogsListRoute = app.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  
  const logs = await ClientLogs.findAll(ctx, {
    limit: 100,
    order: [{ createdAt: 'desc' }],
  })
  
  return logs
})
