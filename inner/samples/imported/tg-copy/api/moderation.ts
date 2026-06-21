import { requireRealUser } from '@app/auth'
import { findFeedParticipants, deleteFeedParticipant } from '@app/feed'
import Chats from '../tables/chats.table'
import Moderations from '../tables/chat-moderations.table'
import { canManageChat } from '../shared/permissions'

// Проверить активную модерацию для пользователя в чате
export const apiModerationCheckRoute = app
  .body((s) => ({
    feedId: s.string(),
    userId: s.string(),
  }))
  .post('/check', async (ctx, req) => {
    requireRealUser(ctx)

    const moderation = await Moderations.findOneBy(ctx, {
      chatId: req.body.feedId,
      userId: req.body.userId,
      isActive: true,
    })

    if (!moderation) {
      return { moderation: null }
    }

    // Проверяем, не истекла ли модерация
    if (!moderation.isPermanent && moderation.expiresAt && new Date() > moderation.expiresAt) {
      // Деактивируем истекшую модерацию
      await Moderations.update(ctx, {
        id: moderation.id,
        isActive: false,
      })
      return { moderation: null }
    }

    return { moderation }
  })

// Установить мьют/бан пользователю
export const apiModerationSetRoute = app
  .body((s) => ({
    feedId: s.string(),
    userId: s.string(),
    type: s.string(), // 'mute' | 'ban'
    reason: s.string().optional(),
    duration: s.number().optional(), // в минутах, если не указано - навсегда
  }))
  .post('/set', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.body.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только админ или владелец могут модерировать
    const canManage = await canManageChat(ctx, req.body.feedId, ctx.user.id)
    if (!canManage) {
      throw new Error('Только администратор или владелец могут модерировать участников')
    }

    // Нельзя модерировать владельца
    const participants = await findFeedParticipants(ctx, req.body.feedId)
    const targetParticipant = participants.find((p) => p.userId === req.body.userId)
    if (targetParticipant?.role === 'owner') {
      throw new Error('Нельзя модерировать владельца чата')
    }

    // Нельзя модерировать самого себя
    if (req.body.userId === ctx.user.id) {
      throw new Error('Нельзя модерировать самого себя')
    }

    // Проверяем валидность типа
    if (req.body.type !== 'mute' && req.body.type !== 'ban') {
      throw new Error('Недопустимый тип модерации. Допустимые значения: mute, ban')
    }

    // Деактивируем предыдущие модерации этого типа
    const existingModerations = await Moderations.findAll(ctx, {
      where: {
        chatId: req.body.feedId,
        userId: req.body.userId,
        type: req.body.type,
        isActive: true,
      },
    })

    for (const mod of existingModerations) {
      await Moderations.update(ctx, {
        id: mod.id,
        isActive: false,
      })
    }

    // Создаём новую модерацию
    const isPermanent = !req.body.duration
    const expiresAt = req.body.duration
      ? new Date(Date.now() + req.body.duration * 60 * 1000)
      : null

    const moderation = await Moderations.create(ctx, {
      chatId: req.body.feedId,
      userId: req.body.userId,
      moderatedBy: ctx.user.id,
      type: req.body.type,
      reason: req.body.reason || '',
      duration: req.body.duration || null,
      expiresAt,
      isPermanent,
      isActive: true,
    })

    // При бане удаляем пользователя из участников чата
    if (req.body.type === 'ban') {
      try {
        await deleteFeedParticipant(ctx, req.body.feedId, req.body.userId)
      } catch (err) {
        // Если пользователь уже не участник — игнорируем ошибку
        console.log('User already not a participant:', err.message)
      }
    }

    // Если модерация временная - планируем job на снятие
    if (!isPermanent && expiresAt) {
      await apiModerationExpireJob.scheduleJobAt(ctx, expiresAt, {
        moderationId: moderation.id,
      })
    }

    return {
      success: true,
      moderation,
    }
  })

// Снять модерацию
export const apiModerationRemoveRoute = app
  .body((s) => ({
    feedId: s.string(),
    userId: s.string(),
    type: s.string(), // 'mute' | 'ban'
  }))
  .post('/remove', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.body.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только админ или владелец могут снимать модерацию
    const canManage = await canManageChat(ctx, req.body.feedId, ctx.user.id)
    if (!canManage) {
      throw new Error('Только администратор или владелец могут снимать модерацию')
    }

    // Деактивируем активные модерации этого типа
    const moderations = await Moderations.findAll(ctx, {
      where: {
        chatId: req.body.feedId,
        userId: req.body.userId,
        type: req.body.type,
        isActive: true,
      },
    })

    for (const mod of moderations) {
      await Moderations.update(ctx, {
        id: mod.id,
        isActive: false,
      })
    }

    return {
      success: true,
    }
  })

// Проверить, забанен ли пользователь в чате (для внутреннего использования)
export async function isUserBanned(ctx, feedId: string, userId: string): Promise<boolean> {
  const moderation = await Moderations.findOneBy(ctx, {
    chatId: feedId,
    userId: userId,
    type: 'ban',
    isActive: true,
  })

  if (!moderation) return false

  // Проверяем, не истекла ли модерация
  if (!moderation.isPermanent && moderation.expiresAt && new Date() > moderation.expiresAt) {
    await Moderations.update(ctx, {
      id: moderation.id,
      isActive: false,
    })
    return false
  }

  return true
}

// Получить список модераций для чата
export const apiModerationListRoute = app
  .query((s) => ({
    feedId: s.string(),
    onlyActive: s.boolean().optional(),
  }))
  .get('/list', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.query.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только админ или владелец могут видеть список модераций
    const canManage = await canManageChat(ctx, req.query.feedId, ctx.user.id)
    if (!canManage) {
      throw new Error('Только администратор или владелец могут просматривать модерации')
    }

    const where: any = {
      chatId: req.query.feedId,
    }

    if (req.query.onlyActive !== false) {
      where.isActive = true
    }

    const moderations = await Moderations.findAll(ctx, {
      where,
      order: [{ createdAt: 'desc' }],
      limit: 100,
    })

    return {
      moderations,
    }
  })

// Job для автоматического снятия модерации по истечении времени
export const apiModerationExpireJob = app
  .body((s) => ({
    moderationId: s.string(),
  }))
  .job('/expire', async (ctx, params) => {
    const moderation = await Moderations.findById(ctx, params.moderationId)

    if (!moderation || !moderation.isActive) {
      return { success: true, message: 'Модерация уже неактивна' }
    }

    // Проверяем, что время действительно истекло
    if (moderation.expiresAt && new Date() >= moderation.expiresAt) {
      await Moderations.update(ctx, {
        id: moderation.id,
        isActive: false,
      })

      ctx.account.log('Moderation expired', {
        level: 'info',
        json: {
          moderationId: moderation.id,
          userId: moderation.userId.id,
          chatId: moderation.chatId,
          type: moderation.type,
        },
      })
    }

    return { success: true }
  })
