import LeadsTable from '../tables/leads.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

// @shared-route
export const apiCreateLeadRoute = app.post('/', async (ctx, req) => {
  const { name, phone, email, message } = req.body

  if (!name || !phone) {
    return { success: false, error: 'Имя и телефон обязательны' }
  }

  try {
    const lead = await LeadsTable.create(ctx, {
      name,
      phone,
      email: email || '',
      message: message || '',
      status: 'new'
    })

    // Отправляем уведомление администратору
    await sendNotificationToAccountOwners(ctx, {
      title: 'Новая заявка с сайта',
      html: `
        <h2>Новая заявка от клиента</h2>
        <p><strong>Имя:</strong> ${name}</p>
        <p><strong>Телефон:</strong> ${phone}</p>
        ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
        ${message ? `<p><strong>Сообщение:</strong> ${message}</p>` : ''}
      `,
      plain: `Новая заявка от ${name}. Телефон: ${phone}${email ? `, Email: ${email}` : ''}${message ? `, Сообщение: ${message}` : ''}`,
      md: `**Новая заявка**\n\nИмя: ${name}\nТелефон: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nСообщение: ${message}` : ''}`
    })

    return { success: true, leadId: lead.id }
  } catch (error) {
    ctx.account.log('Error creating lead', {
      level: 'error',
      json: { error: error.message, body: req.body }
    })
    return { success: false, error: 'Ошибка при сохранении заявки' }
  }
})
