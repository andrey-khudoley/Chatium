import BookingsTable from '../tables/bookings.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { writeWorkspaceEvent, getWorkspaceEventUrl } from '@start/sdk'

// @shared-route
export const apiBookingsCreateRoute = app.post('/create', async (ctx, req) => {
  const { name, phone, service, date, time, comment } = req.body

  // Валидация данных
  if (!name || !phone || !service || !date || !time) {
    return { success: false, error: 'Заполните все обязательные поля' }
  }

  // Создание записи
  const booking = await BookingsTable.create(ctx, {
    name,
    phone,
    service,
    date,
    time,
    comment: comment || '',
    status: 'pending'
  })

  // Отправка уведомления владельцу
  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая запись на маникюр',
    html: `
      <h2>Новая запись на прием</h2>
      <p><strong>Клиент:</strong> ${name}</p>
      <p><strong>Телефон:</strong> ${phone}</p>
      <p><strong>Услуга:</strong> ${service}</p>
      <p><strong>Дата:</strong> ${date}</p>
      <p><strong>Время:</strong> ${time}</p>
      ${comment ? `<p><strong>Комментарий:</strong> ${comment}</p>` : ''}
    `,
    plain: `Новая запись на прием\nКлиент: ${name}\nТелефон: ${phone}\nУслуга: ${service}\nДата: ${date}\nВремя: ${time}${comment ? `\nКомментарий: ${comment}` : ''}`,
    md: `**Новая запись на прием**\n\n**Клиент:** ${name}\n**Телефон:** ${phone}\n**Услуга:** ${service}\n**Дата:** ${date}\n**Время:** ${time}${comment ? `\n**Комментарий:** ${comment}` : ''}`
  })

  // Записываем событие
  await writeWorkspaceEvent(ctx, 'booking_created', {
    user: {
      phone,
      firstName: name
    },
    action_params: {
      service,
      date,
      time
    },
    action_param1: service,
    action_param2: date,
    action_param3: time
  })

  return { success: true, booking }
})

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Создана запись на маникюр',
      url: await getWorkspaceEventUrl(ctx, 'booking_created')
    }
  ]
})
