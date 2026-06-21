import Registrations from '../tables/registrations.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

// @shared-route
export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const { firstName, phone, email, testScore, speedLevel, answers } = req.body

  // Валидация
  if (!firstName || !phone) {
    return { success: false, error: 'Имя и телефон обязательны' }
  }

  // Создаем регистрацию
  const registration = await Registrations.create(ctx, {
    firstName,
    phone,
    email: email || '',
    testScore: testScore || 0,
    speedLevel: speedLevel || '',
    answers: answers || {},
    registeredAt: new Date()
  })

  // Отправляем уведомление администратору
  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая регистрация на марафон!',
    html: `
      <h2>Новая регистрация на марафон по скоростному наращиванию</h2>
      <p><strong>Имя:</strong> ${firstName}</p>
      <p><strong>Телефон:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email || 'не указан'}</p>
      <p><strong>Результат теста:</strong> ${testScore}%</p>
      <p><strong>Уровень скорости:</strong> ${speedLevel}</p>
    `,
    plain: `Новая регистрация на марафон!\nИмя: ${firstName}\nТелефон: ${phone}\nEmail: ${email || 'не указан'}\nРезультат: ${testScore}%\nУровень: ${speedLevel}`,
    md: `**Новая регистрация на марафон!**\n\n**Имя:** ${firstName}\n**Телефон:** ${phone}\n**Email:** ${email || 'не указан'}\n**Результат:** ${testScore}%\n**Уровень:** ${speedLevel}`
  })

  return { success: true, registration }
})
