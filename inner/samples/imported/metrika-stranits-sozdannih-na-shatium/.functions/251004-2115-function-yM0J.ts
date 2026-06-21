import Orders from '../tables/orders.table'

async function main(ctx) {
  // Проверим, какие заказы есть за сегодня
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const ordersToday = await Orders.findAll(ctx, {
    where: {
      createdAt: { $gte: startOfToday },
      tags: 'ПУ-Ленд'
    },
    limit: 100
  })

  return {
    count: ordersToday.length,
    orders: ordersToday.map((o) => ({
      id: o.id,
      clientId: o.clientId,
      createdAt: o.createdAt,
      tags: o.tags
    }))
  }
}

app.function('/').handle(async (ctx) => {
  try {
    return {
      success: true,
      result: await main(ctx)
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message
    }
  }
})
