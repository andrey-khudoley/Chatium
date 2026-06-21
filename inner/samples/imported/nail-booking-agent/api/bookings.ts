import Bookings from '../tables/Bookings.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

// @shared-route
export const apiBookingsCreateRoute = app.post('/create', async (ctx, req) => {
  const { clientName, clientPhone, clientEmail, service, date, time, notes } = req.body

  const booking = await Bookings.create(ctx, {
    clientName,
    clientPhone,
    clientEmail,
    service,
    date: new Date(date),
    time,
    status: 'pending',
    notes: notes || ''
  })

  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая запись на маникюр',
    html: `<h2>Новая запись</h2>
      <p><strong>Клиент:</strong> ${clientName}</p>
      <p><strong>Телефон:</strong> ${clientPhone}</p>
      <p><strong>Email:</strong> ${clientEmail || 'не указан'}</p>
      <p><strong>Услуга:</strong> ${service}</p>
      <p><strong>Дата:</strong> ${new Date(date).toLocaleDateString('ru-RU')}</p>
      <p><strong>Время:</strong> ${time}</p>
      ${notes ? `<p><strong>Комментарий:</strong> ${notes}</p>` : ''}`,
    plain: `Новая запись на маникюр\n\nКлиент: ${clientName}\nТелефон: ${clientPhone}\nEmail: ${clientEmail || 'не указан'}\nУслуга: ${service}\nДата: ${new Date(date).toLocaleDateString('ru-RU')}\nВремя: ${time}${notes ? `\nКомментарий: ${notes}` : ''}`,
    md: `**Новая запись на маникюр**\n\n**Клиент:** ${clientName}\n**Телефон:** ${clientPhone}\n**Email:** ${clientEmail || 'не указан'}\n**Услуга:** ${service}\n**Дата:** ${new Date(date).toLocaleDateString('ru-RU')}\n**Время:** ${time}${notes ? `\n**Комментарий:** ${notes}` : ''}`
  })

  return { success: true, booking }
})

// @shared-route
export const apiBookingsListRoute = app.get('/list', async (ctx, req) => {
  const bookings = await Bookings.findAll(ctx, {
    limit: 100,
    order: [{ date: 'desc' }]
  })

  return { success: true, bookings }
})

// @shared-route
export const apiBookingsUpdateRoute = app.post('/update/:id', async (ctx, req) => {
  const { id } = req.params
  const updates = req.body

  // Если передана дата, преобразуем её в Date объект
  if (updates.date && typeof updates.date === 'string') {
    updates.date = new Date(updates.date)
  }

  const booking = await Bookings.update(ctx, {
    id,
    ...updates
  })

  return { success: true, booking }
})

// @shared-route
export const apiBookingsDeleteRoute = app.post('/delete/:id', async (ctx, req) => {
  const { id } = req.params

  await Bookings.delete(ctx, id)

  return { success: true }
})
