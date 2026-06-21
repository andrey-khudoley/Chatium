import { requireRealUser } from '@app/auth'
import { getInboxData, resetInboxBadge } from '@app/inbox'
import Chats from '../tables/chats.table'
import ChatInvites from '../tables/chat-invites.table'
import Subscriptions from '../tables/chat-subscriptions.table'
import PlanChats from '../tables/chat-plan-chats.table'
import { findFeedParticipants } from '@app/feed'
import { isUserBanned } from './moderation'

export const apiInboxBadgesGetRoute = app.get('/get', async (ctx, req) => {
  requireRealUser(ctx)

  // Получаем все чаты из нашей таблицы (только чаты проекта)
  const allChats = await Chats.findAll(ctx, {
    order: [{ updatedAt: 'desc' }],
    limit: 1000,
  })

  // Проверяем доступ к каждому чату (участник, публичный или подписка)
  const accessibleSubjectIds = new Set<string>()
  
  // Получаем подписки пользователя
  const userSubscriptions = await Subscriptions.findAll(ctx, {
    where: {
      userId: ctx.user.id,
      status: ['active', 'pending']
    }
  })
  
  const subscriptionChatIds = new Set<string>()
  for (const sub of userSubscriptions) {
    const planChats = await PlanChats.findAll(ctx, {
      where: { planId: sub.planId.id }
    })
    for (const pc of planChats) {
      subscriptionChatIds.add(pc.feedId)
    }
  }

  for (const chat of allChats) {
    try {
      // Проверяем бан
      const isBanned = await isUserBanned(ctx, chat.feedId, ctx.user.id)
      if (isBanned) continue

      // Проверяем участие
      const participants = await findFeedParticipants(ctx, chat.feedId)
      const isParticipant = participants.some((p) => p.userId === ctx.user.id)
      
      // Проверяем приглашение
      let hasAcceptedInvite = false
      if (!isParticipant) {
        const acceptedInvite = await ChatInvites.findOneBy(ctx, {
          chat: chat.id,
          invitedUser: ctx.user.id,
          status: 'accepted',
        })
        hasAcceptedInvite = !!acceptedInvite
      }

      // Доступ есть если: участник, публичный, или по подписке
      if (isParticipant || chat.isPublic || subscriptionChatIds.has(chat.feedId) || hasAcceptedInvite) {
        // Используем inboxSubjectId из чата или feedId как fallback
        const subjectId = chat.inboxSubjectId || chat.feedId
        accessibleSubjectIds.add(subjectId)
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  // Получаем inbox данные
  const inboxData = await getInboxData(ctx, ctx.user)
  
  // Фильтруем badges только для наших чатов
  const badges: Record<string, number> = {}
  inboxData.items.forEach(item => {
    if (item.subject_id && item.badge > 0) {
      // Проверяем, принадлежит ли subject_id нашему приложению
      if (accessibleSubjectIds.has(item.subject_id)) {
        badges[item.subject_id] = item.badge
      }
    }
  })

  return { badges }
})

export const apiInboxBadgeResetRoute = app
  .body(s => ({
    subjectId: s.string(),
    url: s.string().optional(),
  }))
  .post('/reset', async (ctx, req) => {
    requireRealUser(ctx)

    await resetInboxBadge(ctx, ctx.user, {
      subjectId: req.body.subjectId,
      url: req.body.url,
    })

    return { success: true }
  })
