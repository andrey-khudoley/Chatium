import QuizLeads from '../tables/quiz_leads.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { writeWorkspaceEvent } from '@start/sdk'

// @shared-route
export const apiSubmitQuizRoute = app.post('/submit-quiz', async (ctx, req) => {
  const { name, email, phone, answers, utm_source, utm_medium, utm_campaign } = req.body

  // Сохраняем лид в таблицу
  const lead = await QuizLeads.create(ctx, {
    name,
    email,
    phone,
    answers,
    utm_source,
    utm_medium,
    utm_campaign
  })

  // Отправляем уведомление администратору
  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая заявка с теста для мастеров!',
    html: `
      <h2>Новая заявка с теста</h2>
      <p><strong>Имя:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Телефон:</strong> ${phone}</p>
      <p><strong>Ответы:</strong></p>
      <pre>${JSON.stringify(answers, null, 2)}</pre>
    `,
    plain: `Новая заявка с теста\nИмя: ${name}\nEmail: ${email}\nТелефон: ${phone}`,
    md: `**Новая заявка с теста**\nИмя: ${name}\nEmail: ${email}\nТелефон: ${phone}`
  })

  // Записываем событие
  await writeWorkspaceEvent(ctx, 'quiz_completed', {
    user: {
      email,
      phone,
      firstName: name
    },
    action_params: answers,
    utm_source,
    utm_medium,
    utm_campaign
  })

  return { success: true, leadId: lead.id }
})
