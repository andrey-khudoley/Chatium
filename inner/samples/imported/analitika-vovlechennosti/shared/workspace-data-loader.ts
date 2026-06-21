/**
 * Универсальный загрузчик данных из разных воркспейсов
 * Автоматически ищет таблицы по ключевым словам в любом воркспейсе
 */

// Парсит дату из различных форматов
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null

  if (typeof dateValue === 'string') {
    if (dateValue.includes('.')) {
      const parts = dateValue.split('.')
      if (parts.length !== 3) return null
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      return new Date(year, month, day)
    }
    return new Date(dateValue)
  }

  if (typeof dateValue === 'number') {
    return new Date(dateValue)
  }

  if (dateValue instanceof Date) {
    return dateValue
  }

  return null
}

// Фильтрует данные по периоду
function filterByPeriod(
  items: any[],
  periodStart: Date,
  periodEnd: Date,
  dateField: string,
  altDateField?: string
): any[] {
  return items.filter((item) => {
    const itemDate = parseDate(item[dateField] || (altDateField ? item[altDateField] : null))
    if (!itemDate) return false
    return itemDate >= periodStart && itemDate <= periodEnd
  })
}

/**
 * Проверяет доступность воркспейса
 */
async function isWorkspaceAccessible(ctx: app.Ctx, workspacePath: string): Promise<boolean> {
  try {
    await ctx.heap.getWorkspaceTables(workspacePath)
    return true
  } catch (error) {
    ctx.account.log(`Workspace ${workspacePath} is not accessible`, {
      level: 'warn',
      json: { error: error.message, workspacePath }
    })
    return false
  }
}

/**
 * Ищет таблицу в воркспейсе по ключевым словам
 */
async function findTableByKeywords(
  ctx: app.Ctx,
  workspacePath: string,
  keywords: string[]
): Promise<any | null> {
  try {
    const tables = await ctx.heap.getWorkspaceTables(workspacePath)

    for (const table of tables) {
      const titleLower = (table.title || '').toLowerCase()
      const nameLower = (table.name || '').toLowerCase()

      for (const keyword of keywords) {
        if (
          titleLower.includes(keyword.toLowerCase()) ||
          nameLower.includes(keyword.toLowerCase())
        ) {
          return table
        }
      }
    }

    return null
  } catch (error) {
    ctx.account.log(`Error finding table in ${workspacePath}`, {
      level: 'warn',
      json: { error: error.message, workspacePath, keywords }
    })
    return null
  }
}

/**
 * Загружает данные из таблицы (локальной или внешней)
 */
async function loadTableData(ctx: app.Ctx, table: any, isLocal: boolean): Promise<any[]> {
  try {
    if (isLocal) {
      // Локальная таблица - прямой вызов
      return await table.findAll(ctx, { limit: 1000 })
    } else {
      // Внешняя таблица - через API
      return await ctx.heap.loadExternalTableData(table.path, { limit: 1000 })
    }
  } catch (error) {
    ctx.account.log(`Error loading table data`, {
      level: 'warn',
      json: { error: error.message, tablePath: table?.path }
    })
    return []
  }
}

/**
 * Загружает данные из воркспейса и фильтрует по периоду
 */
export async function loadWorkspaceData(
  ctx: app.Ctx,
  workspacePath: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  registrations: any[]
  orders: any[]
  payments: any[]
  totalPaymentsAmount: number
}> {
  try {
    // Проверяем доступность воркспейса
    let isLocal = !workspacePath || workspacePath === '' || workspacePath === ctx.workspacePath

    // Если указан внешний воркспейс, проверяем его доступность
    if (!isLocal) {
      const isAccessible = await isWorkspaceAccessible(ctx, workspacePath)
      if (!isAccessible) {
        ctx.account.log(`Workspace ${workspacePath} is not accessible, using local tables`, {
          level: 'warn',
          json: { workspacePath, currentWorkspace: ctx.workspacePath }
        })
        isLocal = true // Используем локальные таблицы
        workspacePath = '' // Сбрасываем путь
      }
    }

    const finalIsLocal = isLocal

    let registrationsTable
    let ordersTable
    let paymentsTable

    if (finalIsLocal) {
      // Текущий воркспейс - используем локальные таблицы
      registrationsTable = (await import('../tables/registrations.table')).default
      ordersTable = (await import('../tables/orders.table')).default
      paymentsTable = (await import('../tables/payments.table')).default

      ctx.account.log('Using local tables', {
        level: 'info',
        json: {
          workspacePath: ctx.workspacePath,
          reason: isLocal ? 'local workspace' : 'external workspace not accessible'
        }
      })
    } else {
      // Внешний воркспейс - ищем таблицы динамически
      ctx.account.log('Searching tables in external workspace', {
        level: 'info',
        json: { workspacePath }
      })

      registrationsTable = await findTableByKeywords(ctx, workspacePath, ['регистр', 'registr'])
      ordersTable = await findTableByKeywords(ctx, workspacePath, ['заказ', 'order'])
      paymentsTable = await findTableByKeywords(ctx, workspacePath, ['оплат', 'payment', 'pay'])

      ctx.account.log('Found tables', {
        level: 'info',
        json: {
          workspacePath,
          registrations: registrationsTable?.title || 'not found',
          orders: ordersTable?.title || 'not found',
          payments: paymentsTable?.title || 'not found'
        }
      })
    }

    // Загружаем все данные
    const allRegistrations = registrationsTable
      ? await loadTableData(ctx, registrationsTable, finalIsLocal)
      : []
    const allOrders = ordersTable ? await loadTableData(ctx, ordersTable, finalIsLocal) : []
    const allPayments = paymentsTable ? await loadTableData(ctx, paymentsTable, finalIsLocal) : []

    // Фильтруем по периоду
    const registrations = filterByPeriod(
      allRegistrations,
      periodStart,
      periodEnd,
      'createdAt',
      'date_reg'
    )
    const orders = filterByPeriod(allOrders, periodStart, periodEnd, 'createdAt', 'date')
    const payments = filterByPeriod(allPayments, periodStart, periodEnd, 'paidAt', 'date')

    // Считаем сумму оплат (amount может быть Money объектом, массивом или числом)
    const totalPaymentsAmount = payments.reduce((sum, p) => {
      let amount = 0
      if (p.amount && typeof p.amount[0] === 'number') {
        // Money type или массив: [value, currency]
        amount = p.amount[0]
      } else if (typeof p.amount === 'number') {
        amount = p.amount
      }
      return sum + amount
    }, 0)

    ctx.account.log(`Data loaded and filtered`, {
      level: 'info',
      json: {
        workspacePath: workspacePath || 'current',
        registrations: registrations.length,
        orders: orders.length,
        payments: payments.length,
        totalAmount: totalPaymentsAmount
      }
    })

    return {
      registrations,
      orders,
      payments,
      totalPaymentsAmount
    }
  } catch (error) {
    ctx.account.log(`Error loading data from ${workspacePath}`, {
      level: 'error',
      json: { error: error.message, workspacePath }
    })

    return {
      registrations: [],
      orders: [],
      payments: [],
      totalPaymentsAmount: 0
    }
  }
}

/**
 * Вспомогательная функция для парсинга даты (экспортируем для использования в других местах)
 */
export { parseDate }
