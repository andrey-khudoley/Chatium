import Applications from '../tables/applications.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

// @shared-route
export const apiCreateApplicationRoute = app.post('/create', async (ctx, req) => {
  const { name, phone, email, message } = req.body

  if (!name || !phone || !email || !message) {
    return { success: false, error: 'Все поля обязательны для заполнения' }
  }

  try {
    const application = await Applications.create(ctx, {
      name,
      phone,
      email,
      message,
      status: 'new',
      createdAt: new Date()
    })

    // Отправляем уведомление администраторам
    await sendNotificationToAccountOwners(ctx, {
      title: 'Новая заявка с сайта БолтПром',
      html: `
        <h2>Получена новая заявка с сайта</h2>
        <p><strong>Имя:</strong> ${name}</p>
        <p><strong>Телефон:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Сообщение:</strong></p>
        <p>${message}</p>
      `,
      plain: `Новая заявка с сайта БолтПром\n\nИмя: ${name}\nТелефон: ${phone}\nEmail: ${email}\nСообщение: ${message}`,
      md: `**Новая заявка с сайта БолтПром**\n\n**Имя:** ${name}\n**Телефон:** ${phone}\n**Email:** ${email}\n**Сообщение:** ${message}`
    })

    return { success: true, applicationId: application.id }
  } catch (error) {
    ctx.account.log('Failed to create application', {
      level: 'error',
      json: { error: String(error), body: req.body }
    })
    return { success: false, error: 'Произошла ошибка при отправке заявки' }
  }
})
