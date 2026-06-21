import { requireRealUser, findUserById } from '@app/auth'
import PrivacySettings from '../tables/user-privacy-settings.table'

// Получить настройки приватности текущего пользователя
export const apiPrivacySettingsGetRoute = app.get('/', async (ctx, req) => {
  requireRealUser(ctx)

  let settings = await PrivacySettings.findOneBy(ctx, {
    user: ctx.user.id,
  })

  if (!settings) {
    // Создаем дефолтные настройки
    settings = await PrivacySettings.create(ctx, {
      user: ctx.user.id,
      allowDirectMessages: 'everyone', // 'everyone' | 'contacts' | 'none'
      allowedUsers: [],
      blockedUsers: [],
    })
  }

  return {
    allowDirectMessages: settings.allowDirectMessages || 'everyone',
    allowedUsers: settings.allowedUsers || [],
    blockedUsers: settings.blockedUsers || [],
  }
})

// Обновить настройки приватности
export const apiPrivacySettingsUpdateRoute = app
  .body((s) => ({
    allowDirectMessages: s.string().optional(), // 'everyone' | 'contacts' | 'none'
    allowedUsers: s.array(s.string()).optional(),
    blockedUsers: s.array(s.string()).optional(),
  }))
  .post('/update', async (ctx, req) => {
    requireRealUser(ctx)

    let settings = await PrivacySettings.findOneBy(ctx, {
      user: ctx.user.id,
    })

    const updateData: any = {}
    if (req.body.allowDirectMessages !== undefined) {
      updateData.allowDirectMessages = req.body.allowDirectMessages
    }
    if (req.body.allowedUsers !== undefined) {
      updateData.allowedUsers = req.body.allowedUsers
    }
    if (req.body.blockedUsers !== undefined) {
      updateData.blockedUsers = req.body.blockedUsers
    }

    if (settings) {
      settings = await PrivacySettings.update(ctx, {
        id: settings.id,
        ...updateData,
      })
    } else {
      settings = await PrivacySettings.create(ctx, {
        user: ctx.user.id,
        allowDirectMessages: updateData.allowDirectMessages || 'everyone',
        allowedUsers: updateData.allowedUsers || [],
        blockedUsers: updateData.blockedUsers || [],
      })
    }

    return {
      success: true,
      settings: {
        allowDirectMessages: settings.allowDirectMessages,
        allowedUsers: settings.allowedUsers || [],
        blockedUsers: settings.blockedUsers || [],
      },
    }
  })

// Проверить, может ли пользователь писать в личку другому пользователю
export const apiPrivacySettingsCanMessageRoute = app
  .body((s) => ({
    targetUserId: s.string(),
  }))
  .post('/can-message', async (ctx, req) => {
    requireRealUser(ctx)

    const result = await canSendDirectMessage(ctx, ctx.user.id, req.body.targetUserId)

    return result
  })

// Вспомогательная функция для проверки возможности отправки личного сообщения
export async function canSendDirectMessage(ctx, senderId: string, targetUserId: string) {
  // Нельзя писать самому себе
  if (senderId === targetUserId) {
    return { allowed: false, reason: 'Нельзя отправить сообщение самому себе' }
  }

  // Проверяем настройки приватности целевого пользователя
  const settings = await PrivacySettings.findOneBy(ctx, {
    user: targetUserId,
  })

  const allowMode = settings?.allowDirectMessages || 'everyone'
  const blockedUsers = settings?.blockedUsers || []
  const allowedUsers = settings?.allowedUsers || []

  // Проверяем, не в блок-листе ли отправитель
  if (blockedUsers.includes(senderId)) {
    return { allowed: false, reason: 'Пользователь ограничил получение сообщений от вас' }
  }

  // Проверяем режим приватности
  switch (allowMode) {
    case 'everyone':
      return { allowed: true }
    case 'contacts':
      // Проверяем, есть ли отправитель в списке разрешенных
      if (allowedUsers.includes(senderId)) {
        return { allowed: true }
      }
      return { 
        allowed: false, 
        reason: 'Пользователь принимает сообщения только от избранных контактов' 
      }
    case 'none':
      return { allowed: false, reason: 'Пользователь отключил личные сообщения' }
    default:
      return { allowed: true }
  }
}

// Добавить пользователя в список разрешенных
export const apiPrivacySettingsAllowUserRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/allow-user', async (ctx, req) => {
    requireRealUser(ctx)

    let settings = await PrivacySettings.findOneBy(ctx, {
      user: ctx.user.id,
    })

    if (!settings) {
      settings = await PrivacySettings.create(ctx, {
        user: ctx.user.id,
        allowDirectMessages: 'contacts',
        allowedUsers: [req.body.userId],
        blockedUsers: [],
      })
    } else {
      const allowedUsers = settings.allowedUsers || []
      if (!allowedUsers.includes(req.body.userId)) {
        allowedUsers.push(req.body.userId)
        settings = await PrivacySettings.update(ctx, {
          id: settings.id,
          allowedUsers,
        })
      }
    }

    return { success: true }
  })

// Удалить пользователя из списка разрешенных
export const apiPrivacySettingsRemoveAllowedRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/remove-allowed', async (ctx, req) => {
    requireRealUser(ctx)

    const settings = await PrivacySettings.findOneBy(ctx, {
      user: ctx.user.id,
    })

    if (settings) {
      const allowedUsers = (settings.allowedUsers || []).filter(id => id !== req.body.userId)
      await PrivacySettings.update(ctx, {
        id: settings.id,
        allowedUsers,
      })
    }

    return { success: true }
  })
