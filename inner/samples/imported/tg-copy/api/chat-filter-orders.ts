import { requireRealUser } from '@app/auth'
import UserChatFilterOrders from '../tables/user-chat-filter-orders.table'

// Получить порядок фильтров пользователя
export const apiChatFilterOrdersGetRoute = app.get('/', async (ctx, req) => {
  requireRealUser(ctx)
  
  const orders = await UserChatFilterOrders.findAll(ctx, {
    where: { userId: ctx.user.id },
    order: [{ position: 'asc' }],
  })
  
  return orders
})

// Обновить порядок фильтров
export const apiChatFilterOrdersUpdateRoute = app.post('/update', async (ctx, req) => {
  requireRealUser(ctx)
  
  const { orders } = req.body // массив { filterId, filterType, position }
  
  // Удаляем старые записи
  const existingOrders = await UserChatFilterOrders.findAll(ctx, {
    where: { userId: ctx.user.id },
  })
  
  for (const order of existingOrders) {
    await UserChatFilterOrders.delete(ctx, order.id)
  }
  
  // Создаём новые записи
  for (const order of orders) {
    await UserChatFilterOrders.create(ctx, {
      userId: ctx.user.id,
      filterId: order.filterId,
      filterType: order.filterType,
      position: order.position,
    })
  }
  
  return { success: true }
})
