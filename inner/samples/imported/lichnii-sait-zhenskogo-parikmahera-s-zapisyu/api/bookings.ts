import Bookings from '../tables/bookings.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { writeWorkspaceEvent } from '@start/sdk'

// @shared-route
export const apiCreateBookingRoute = app.post('/create', async (ctx, req) => {
  const { clientName, clientPhone, clientEmail, service, date, time, notes } = req.body

  // Проверка обязательных полей
  if (!clientName || !clientPhone || !service || !date || !time) {
    return { success: false, error: 'Пожалуйста, заполните все обязательные поля' }
  }

  try {
    // Создаем запись
    const booking = await Bookings.create(ctx, {
      clientName,
      clientPhone,
      clientEmail: clientEmail || '',
      service,
      date: new Date(date),
      time,
      status: 'pending',
      notes: notes || ''
    })

    // Отправляем уведомление администратору
    await sendNotificationToAccountOwners(ctx, {
      title: 'Новая запись на сайте!',
      html: `
        <h2>Новая запись к парикмахеру</h2>
        <p><strong>Клиент:</strong> ${clientName}</p>
        <p><strong>Телефон:</strong> ${clientPhone}</p>
        ${clientEmail ? `<p><strong>Email:</strong> ${clientEmail}</p>` : ''}
        <p><strong>Услуга:</strong> ${service}</p>
        <p><strong>Дата:</strong> ${date}</p>
        <p><strong>Время:</strong> ${time}</p>
        ${notes ? `<p><strong>Примечания:</strong> ${notes}</p>` : ''}
      `,
      plain: `Новая запись!\nКлиент: ${clientName}\nТелефон: ${clientPhone}\nУслуга: ${service}\nДата: ${date}\nВремя: ${time}`,
      md: `**Новая запись!**\n*Клиент:* ${clientName}\n*Телефон:* ${clientPhone}\n*Услуга:* ${service}\n*Дата:* ${date}\n*Время:* ${time}`
    })

    // Записываем событие
    await writeWorkspaceEvent(ctx, 'booking_created', {
      user: {
        phone: clientPhone,
        email: clientEmail,
        firstName: clientName.split(' ')[0],
        lastName: clientName.split(' ').slice(1).join(' ')
      },
      action_params: {
        service,
        date,
        time
      },
      action_param1: service,
      action_param2: date,
      utm_source: req.query.utm_source,
      utm_medium: req.query.utm_medium,
      utm_content: req.query.utm_content,
      utm_campaign: req.query.utm_campaign,
      utm_term: req.query.utm_term
    })

    return { success: true, booking }
  } catch (error) {
    ctx.account.log('apiCreateBookingRoute ERROR', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: 'Произошла ошибка при создании записи' }
  }
})

// @shared-route
export const apiGetAvailableTimesRoute = app.post('/available-times', async (ctx, req) => {
  const { date } = req.body

  try {
    // Получаем все записи на выбранную дату
    const bookings = await Bookings.findAll(ctx, {
      where: {
        date: new Date(date),
        status: { $not: 'cancelled' }
      }
    })

    // Все возможные временные слоты (с 9:00 до 19:00)
    const allTimes = [
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00'
    ]

    // Занятые слоты
    const bookedTimes = bookings.map((b) => b.time)

    // Доступные слоты
    const availableTimes = allTimes.filter((time) => !bookedTimes.includes(time))

    return { success: true, availableTimes, bookedTimes }
  } catch (error) {
    ctx.account.log('apiGetAvailableTimesRoute ERROR', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: 'Произошла ошибка при получении доступного времени' }
  }
})
