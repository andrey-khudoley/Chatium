import Appointments from '../tables/appointments.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { writeWorkspaceEvent, getWorkspaceEventUrl } from '@start/sdk'

// @shared-route
export const apiCreateAppointmentRoute = app.post('/create', async (ctx, req) => {
  const { clientName, phone, email, service, date, time, comment } = req.body

  if (!clientName || !phone || !service || !date || !time) {
    return { success: false, error: 'Заполните все обязательные поля' }
  }

  const appointment = await Appointments.create(ctx, {
    clientName,
    phone,
    email: email || '',
    service,
    date,
    time,
    comment: comment || '',
    status: 'new',
    createdAt: new Date()
  })

  await writeWorkspaceEvent(ctx, 'appointment_created', {
    user: {
      phone: phone,
      email: email || '',
      firstName: clientName
    },
    action_params: {
      service,
      date,
      time
    }
  })

  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая запись на сайте',
    html: `<h2>Новая запись</h2>
           <p><strong>Клиент:</strong> ${clientName}</p>
           <p><strong>Телефон:</strong> ${phone}</p>
           ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
           <p><strong>Услуга:</strong> ${service}</p>
           <p><strong>Дата:</strong> ${date}</p>
           <p><strong>Время:</strong> ${time}</p>
           ${comment ? `<p><strong>Комментарий:</strong> ${comment}</p>` : ''}`,
    plain: `Новая запись от ${clientName}, телефон: ${phone}, услуга: ${service}, дата: ${date}, время: ${time}`,
    md: `**Новая запись**\n\n*Клиент:* ${clientName}\n*Телефон:* ${phone}\n*Услуга:* ${service}\n*Дата:* ${date}\n*Время:* ${time}`
  })

  return { success: true, appointment }
})

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Создана запись на прием',
      url: await getWorkspaceEventUrl(ctx, 'appointment_created')
    }
  ]
})
