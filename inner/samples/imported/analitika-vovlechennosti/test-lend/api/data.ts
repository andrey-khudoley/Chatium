import RegistrationsTable from '../../tables/registrations.table'
import OrdersTable from '../../tables/orders.table'
import PaymentsTable from '../../tables/payments.table'

// Интерфейс для запроса
interface DataRequest {
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

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

// @shared-route
export const apiGetDataRoute = app
  .body((s) => ({
    startDate: s.string().optional(),
    endDate: s.string().optional()
  }))
  .post('/get-data', async (ctx, req) => {
    try {
      let periodStart: Date | null = null
      let periodEnd: Date | null = null

      if (req.body.startDate) {
        periodStart = new Date(req.body.startDate)
        periodStart.setHours(0, 0, 0, 0)
      }

      if (req.body.endDate) {
        periodEnd = new Date(req.body.endDate)
        periodEnd.setHours(23, 59, 59, 999)
      }

      // Загружаем все данные
      const allRegistrations = await RegistrationsTable.findAll(ctx, { limit: 1000 })
      const allOrders = await OrdersTable.findAll(ctx, { limit: 1000 })
      const allPayments = await PaymentsTable.findAll(ctx, { limit: 1000 })

      // Фильтруем по датам если указаны
      const filterByDate = (items: any[], dateField: string, altDateField?: string) => {
        if (!periodStart || !periodEnd) return items

        return items.filter((item) => {
          const itemDate = parseDate(item[dateField] || (altDateField ? item[altDateField] : null))
          if (!itemDate) return false
          return itemDate >= periodStart && itemDate <= periodEnd
        })
      }

      const registrations = filterByDate(allRegistrations, 'createdAt', 'date_reg')
      const orders = filterByDate(allOrders, 'createdAt', 'date')
      const payments = filterByDate(allPayments, 'paymentDate', 'date')

      // Подсчитываем сумму оплат
      const totalPaymentsAmount = payments.reduce((sum, p) => {
        const amount = typeof p.amount === 'number' ? p.amount : 0
        return sum + amount
      }, 0)

      return {
        success: true,
        registrations: registrations,
        orders: orders,
        payments: payments,
        stats: {
          registrationsCount: registrations.length,
          ordersCount: orders.length,
          paymentsCount: payments.length,
          totalPaymentsAmount: totalPaymentsAmount
        }
      }
    } catch (error) {
      ctx.account.log('Error in apiGetDataRoute', {
        level: 'error',
        json: { error: error.message, stack: error.stack }
      })
      return {
        success: false,
        error: error.message
      }
    }
  })
