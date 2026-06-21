import Appointments from '../tables/appointments.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { writeWorkspaceEvent } from '@start/sdk'

export interface AppointmentDto {
  id: string
  clientName: string
  clientPhone: string
  service: string
  date: string
  time: string
  comment?: string
  status: string
}

// @shared-route
export const apiCreateAppointmentRoute = app.post('/create', async (ctx, req) => {
  const { clientName, clientPhone, service, date, time, comment } = req.body

  if (!clientName || !clientPhone || !service || !date || !time) {
    throw new Error('Все поля обязательны для заполнения')
  }

  const appointment = await Appointments.create(ctx, {
    clientName,
    clientPhone,
    service,
    date,
    time,
    comment: comment || '',
    status: 'pending'
  })

  await writeWorkspaceEvent(ctx, 'appointment_created', {
    user: {
      phone: clientPhone,
      firstName: clientName
    },
    action_params: {
      service,
      date,
      time
    }
  })

  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая запись на прием!',
    html: `
      <h2>Новая запись</h2>
      <p><strong>Клиент:</strong> ${clientName}</p>
      <p><strong>Телефон:</strong> ${clientPhone}</p>
      <p><strong>Услуга:</strong> ${service}</p>
      <p><strong>Дата:</strong> ${date}</p>
      <p><strong>Время:</strong> ${time}</p>
      ${comment ? `<p><strong>Комментарий:</strong> ${comment}</p>` : ''}
    `,
    plain: `Новая запись от ${clientName} (${clientPhone}) на услугу "${service}" ${date} в ${time}`,
    md: `**Новая запись**\n\nКлиент: ${clientName}\nТелефон: ${clientPhone}\nУслуга: ${service}\nДата: ${date}\nВремя: ${time}${comment ? `\nКомментарий: ${comment}` : ''}`
  })

  return { success: true, appointment }
})

// @shared-route
export const apiGetAppointmentsRoute = app.get('/list', async (ctx, req) => {
  const appointments = await Appointments.findAll(ctx, {
    limit: 100,
    order: [{ date: 'desc' }]
  })

  return appointments
})
