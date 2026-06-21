import { requireRealUser } from '@app/auth'
import ChatFolders from '../tables/chat-folders.table'
import ChatFolderItems from '../tables/chat-folder-items.table'

export const apiChatFoldersListRoute = app.get('/list', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folders = await ChatFolders.findAll(ctx, {
    where: { userId: ctx.user.id },
    order: [{ sortOrder: 'asc' }],
  })
  
  return folders
})

export const apiChatFoldersCreateRoute = app.post('/create', async (ctx, req) => {
  requireRealUser(ctx)
  
  const { name, icon, selectedChats = [] } = req.body
  
  // Получаем максимальный sortOrder
  const existingFolders = await ChatFolders.findAll(ctx, {
    where: { userId: ctx.user.id },
    order: [{ sortOrder: 'desc' }],
    limit: 1,
  })
  
  const maxOrder = existingFolders[0]?.sortOrder ?? 0
  
  const folder = await ChatFolders.create(ctx, {
    name,
    userId: ctx.user.id,
    sortOrder: maxOrder + 1,
    icon: icon || '📁',
    color: '#008069', // Устаревшее поле, оставляем для совместимости
  })
  
  // Добавляем выбранные чаты в папку
  for (const feedId of selectedChats) {
    const existing = await ChatFolderItems.findOneBy(ctx, {
      folderId: folder.id,
      feedId,
      userId: ctx.user.id,
    })
    
    if (!existing) {
      await ChatFolderItems.create(ctx, {
        folderId: folder.id,
        feedId,
        userId: ctx.user.id,
        addedAt: new Date(),
      })
    }
  }
  
  return folder
})

export const apiChatFoldersUpdateRoute = app.post('/:id/update', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folder = await ChatFolders.findById(ctx, req.params.id)
  if (!folder || folder.userId !== ctx.user.id) {
    throw new Error('Folder not found')
  }
  
  const { name, icon, selectedChats } = req.body
  
  const updated = await ChatFolders.update(ctx, {
    id: folder.id,
    name: name ?? folder.name,
    icon: icon ?? folder.icon,
    color: folder.color, // Сохраняем старый цвет
  })
  
  // Если передан список чатов — обновляем состав папки
  if (selectedChats && Array.isArray(selectedChats)) {
    // Получаем текущие чаты в папке
    const currentItems = await ChatFolderItems.findAll(ctx, {
      where: { folderId: folder.id },
    })
    
    const currentChatIds = currentItems.map(item => item.feedId)
    
    // Чаты которые нужно добавить
    const toAdd = selectedChats.filter(id => !currentChatIds.includes(id))
    // Чаты которые нужно удалить
    const toRemove = currentChatIds.filter(id => !selectedChats.includes(id))
    
    // Добавляем новые
    for (const feedId of toAdd) {
      await ChatFolderItems.create(ctx, {
        folderId: folder.id,
        feedId,
        userId: ctx.user.id,
        addedAt: new Date(),
      })
    }
    
    // Удаляем старые
    for (const feedId of toRemove) {
      const item = currentItems.find(i => i.feedId === feedId)
      if (item) {
        await ChatFolderItems.delete(ctx, item.id)
      }
    }
  }
  
  return updated
})

export const apiChatFoldersDeleteRoute = app.post('/:id/delete', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folder = await ChatFolders.findById(ctx, req.params.id)
  if (!folder || folder.userId !== ctx.user.id) {
    throw new Error('Folder not found')
  }
  
  // Удаляем все связи чатов с этой папкой
  const items = await ChatFolderItems.findAll(ctx, {
    where: { folderId: folder.id },
  })
  
  for (const item of items) {
    await ChatFolderItems.delete(ctx, item.id)
  }
  
  await ChatFolders.delete(ctx, folder.id)
  
  return { success: true }
})

export const apiChatFoldersReorderRoute = app.post('/reorder', async (ctx, req) => {
  requireRealUser(ctx)
  
  const { folderIds } = req.body // массив ID в новом порядке
  
  for (let i = 0; i < folderIds.length; i++) {
    const folder = await ChatFolders.findById(ctx, folderIds[i])
    if (folder && folder.userId === ctx.user.id) {
      await ChatFolders.update(ctx, {
        id: folder.id,
        sortOrder: i,
      })
    }
  }
  
  return { success: true }
})

// Добавить чат в папку
export const apiChatFoldersAddChatRoute = app.post('/:id/add-chat', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folder = await ChatFolders.findById(ctx, req.params.id)
  if (!folder || folder.userId !== ctx.user.id) {
    throw new Error('Folder not found')
  }
  
  const { feedId } = req.body
  
  // console.log('add-chat debug:', { folderId: folder.id, feedId, userId: ctx.user.id })
  // console.log('add-chat debug types:', { folderIdType: typeof folder.id, feedIdType: typeof feedId, userIdType: typeof ctx.user.id })
  
  // Проверяем, не добавлен ли уже чат в эту папку
  const existing = await ChatFolderItems.findOneBy(ctx, {
    folderId: folder.id,
    feedId,
    userId: ctx.user.id,
  })
  
  // console.log('add-chat existing:', existing)
  
  if (existing) {
    return existing
  }
  
  const item = await ChatFolderItems.create(ctx, {
    folderId: folder.id,
    feedId,
    userId: ctx.user.id,
    addedAt: new Date(),
  })
  
  // console.log('add-chat created:', item)
  // console.log('add-chat created folderId type:', typeof item.folderId, 'value:', item.folderId)
  
  return item
})

// Удалить чат из папки
export const apiChatFoldersRemoveChatRoute = app.post('/:id/remove-chat', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folder = await ChatFolders.findById(ctx, req.params.id)
  if (!folder || folder.userId !== ctx.user.id) {
    throw new Error('Folder not found')
  }
  
  const { feedId } = req.body
  
  const item = await ChatFolderItems.findOneBy(ctx, {
    folderId: folder.id,
    feedId,
    userId: ctx.user.id,
  })
  
  if (item) {
    await ChatFolderItems.delete(ctx, item.id)
  }
  
  return { success: true }
})

// Получить чаты в папке
export const apiChatFoldersGetChatsRoute = app.get('/:id/chats', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folder = await ChatFolders.findById(ctx, req.params.id)
  if (!folder || folder.userId !== ctx.user.id) {
    throw new Error('Folder not found')
  }
  
  // console.log('get-chats debug: folderId =', folder.id, 'type =', typeof folder.id)
  
  // Пробуем найти все записи для этого пользователя
  const allItems = await ChatFolderItems.findAll(ctx, {
    where: { userId: ctx.user.id },
    limit: 100,
  })
  // console.log('get-chats debug: all user items =', allItems.length, allItems.map(i => ({ folderId: i.folderId, feedId: i.feedId })))
  
  // Теперь фильтруем по folderId
  const items = await ChatFolderItems.findAll(ctx, {
    where: { folderId: folder.id },
    order: [{ addedAt: 'desc' }],
  })
  
  // console.log('get-chats debug: filtered items =', items.length)
  
  return items.map(item => item.feedId)
})

// Получить все папки пользователя с ID чатов в них
export const apiChatFoldersGetAllWithChatsRoute = app.get('/all-with-chats', async (ctx, req) => {
  requireRealUser(ctx)
  
  const folders = await ChatFolders.findAll(ctx, {
    where: { userId: ctx.user.id },
    order: [{ sortOrder: 'asc' }],
  })
  
  const result = await Promise.all(
    folders.map(async (folder) => {
      const items = await ChatFolderItems.findAll(ctx, {
        where: { folderId: folder.id },
      })
      return {
        ...folder,
        chatIds: items.map(item => item.feedId),
      }
    })
  )
  
  return result
})

// Получить папки, в которых находится чат
export const apiChatFoldersGetForChatRoute = app.get('/for-chat/:feedId', async (ctx, req) => {
  requireRealUser(ctx)
  
  const items = await ChatFolderItems.findAll(ctx, {
    where: { 
      feedId: req.params.feedId,
      userId: ctx.user.id,
    },
  })
  
  const folderIds = items.map(item => item.folderId)
  
  return folderIds
})
