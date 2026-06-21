/**
 * Интерфейс заказа
 */
export interface Order {
  lend?: string
  createdAt?: any // timestamp, Date, или строка
  date?: string // старое поле для совместимости
  status?: string
  [key: string]: any
}

/**
 * Интерфейс оплаты
 */
export interface Payment {
  lend?: string
  paidAt?: any // основное поле даты оплаты (timestamp, Date, или строка)
  'дата оплаты'?: any // альтернативное поле
  date?: string // старое поле для совместимости
  amount?: number
  status?: string
  [key: string]: any
}

/**
 * Загружает заказы из внешнего воркспейса
 */
export async function loadExternalOrders(ctx: app.Ctx, workspacePath: string): Promise<Order[]> {
  try {
    // Получаем список всех таблиц в воркспейсе
    const tables = await ctx.heap.getWorkspaceTables(workspacePath)

    // Ищем таблицу с заказами по названию
    const orderTable = tables.find(
      (t) =>
        t.title.toLowerCase().includes('заказ') ||
        t.title.toLowerCase().includes('order') ||
        t.name.toLowerCase().includes('order')
    )

    if (!orderTable) {
      ctx.account.log('Orders table not found', {
        level: 'warn',
        json: { workspacePath }
      })
      return []
    }

    // Загружаем все данные из таблицы с пагинацией
    const allOrders: Order[] = []
    let offset = 0
    const batchSize = 1000

    while (true) {
      const batch = await ctx.heap.loadExternalTableData(orderTable.path, {
        limit: batchSize,
        offset: offset
      })

      if (batch.length === 0) break
      allOrders.push(...batch)

      if (batch.length < batchSize) break
      offset += batchSize
    }

    ctx.account.log('External orders loaded', {
      level: 'info',
      json: { workspacePath, tablePath: orderTable.path, count: allOrders.length }
    })

    return allOrders
  } catch (error) {
    ctx.account.log('Error loading external orders', {
      level: 'warn',
      json: { error: error.message, workspacePath }
    })
    return []
  }
}

/**
 * Загружает оплаты из внешнего воркспейса
 */
export async function loadExternalPayments(
  ctx: app.Ctx,
  workspacePath: string
): Promise<Payment[]> {
  try {
    // Получаем список всех таблиц в воркспейсе
    const tables = await ctx.heap.getWorkspaceTables(workspacePath)

    // Ищем таблицу с оплатами по названию
    const paymentTable = tables.find(
      (t) =>
        t.title.toLowerCase().includes('оплат') ||
        t.title.toLowerCase().includes('pay') ||
        t.name.toLowerCase().includes('payment')
    )

    if (!paymentTable) {
      ctx.account.log('Payments table not found', {
        level: 'warn',
        json: { workspacePath }
      })
      return []
    }

    // Загружаем все данные из таблицы с пагинацией
    const allPayments: Payment[] = []
    let offset = 0
    const batchSize = 1000

    while (true) {
      const batch = await ctx.heap.loadExternalTableData(paymentTable.path, {
        limit: batchSize,
        offset: offset
      })

      if (batch.length === 0) break
      allPayments.push(...batch)

      if (batch.length < batchSize) break
      offset += batchSize
    }

    ctx.account.log('External payments loaded', {
      level: 'info',
      json: { workspacePath, tablePath: paymentTable.path, count: allPayments.length }
    })

    return allPayments
  } catch (error) {
    ctx.account.log('Error loading external payments', {
      level: 'warn',
      json: { error: error.message, workspacePath }
    })
    return []
  }
}

/**
 * Универсальная функция загрузки заказов
 */
export async function loadOrders(ctx: app.Ctx, workspacePath: string): Promise<Order[]> {
  if (!workspacePath || workspacePath === ctx.workspacePath) {
    return []
  }

  return await loadExternalOrders(ctx, workspacePath)
}

/**
 * Универсальная функция загрузки оплат
 */
export async function loadPayments(ctx: app.Ctx, workspacePath: string): Promise<Payment[]> {
  if (!workspacePath || workspacePath === ctx.workspacePath) {
    return []
  }

  return await loadExternalPayments(ctx, workspacePath)
}

/**
 * Парсит дату из различных форматов (DD.MM.YYYY, YYYY-MM-DD, timestamp)
 */
export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null

  // Если это строка
  if (typeof dateValue === 'string') {
    // Формат DD.MM.YYYY
    if (dateValue.includes('.')) {
      const parts = dateValue.split('.')
      if (parts.length !== 3) return null
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      return new Date(year, month, day)
    }
    // Формат YYYY-MM-DD или ISO
    return new Date(dateValue)
  }

  // Если это число (timestamp)
  if (typeof dateValue === 'number') {
    return new Date(dateValue)
  }

  // Если это уже Date
  if (dateValue instanceof Date) {
    return dateValue
  }

  return null
}

/**
 * Фильтрует заказы по диапазону дат
 */
export function filterOrdersByPeriod(orders: Order[], periodStart: Date, periodEnd: Date): Order[] {
  return orders.filter((order) => {
    // Пробуем сначала createdAt, потом date для совместимости
    const orderDate = parseDate(order.createdAt || order.date)
    if (!orderDate) return false
    return orderDate >= periodStart && orderDate <= periodEnd
  })
}

/**
 * Фильтрует оплаты по диапазону дат
 */
export function filterPaymentsByPeriod(
  payments: Payment[],
  periodStart: Date,
  periodEnd: Date
): Payment[] {
  return payments.filter((payment) => {
    // Пробуем paidAt, потом 'дата оплаты', потом date для совместимости
    const paymentDate = parseDate(payment.paidAt || payment['дата оплаты'] || payment.date)
    if (!paymentDate) return false
    return paymentDate >= periodStart && paymentDate <= periodEnd
  })
}

/**
 * Вычисляет общую сумму оплат
 */
export function calculateTotalPayments(payments: Payment[]): number {
  return payments.reduce((sum, payment) => {
    const amount = typeof payment.amount === 'number' ? payment.amount : 0
    return sum + amount
  }, 0)
}
