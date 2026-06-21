import { requireRealUser } from '@app/auth'
import { getInboxData, resetInboxBadge } from '@app/inbox'

export const apiInboxBadgesGetRoute = app.get('/get', async (ctx, req) => {
  requireRealUser(ctx)

  const inboxData = await getInboxData(ctx, ctx.user)

  // Создаем map subjectId -> badge
  const badges = {}
  inboxData.items.forEach((item) => {
    if (item.subject_id && item.badge > 0) {
      badges[item.subject_id] = item.badge
    }
  })

  return { badges }
})

export const apiInboxBadgeResetRoute = app
  .body((s) => ({
    subjectId: s.string(),
    url: s.string().optional()
  }))
  .post('/reset', async (ctx, req) => {
    requireRealUser(ctx)

    await resetInboxBadge(ctx, ctx.user, {
      subjectId: req.body.subjectId,
      url: req.body.url
    })

    return { success: true }
  })
