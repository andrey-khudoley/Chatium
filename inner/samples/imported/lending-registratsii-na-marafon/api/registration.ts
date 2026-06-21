import Registrations from '../tables/registrations.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { writeWorkspaceEvent } from '@start/sdk'

// @shared-route
export const registerRoute = app
  .body((s) => ({
    firstName: s.string(),
    phone: s.string(),
    email: s.string().optional()
  }))
  .post('/register', async (ctx, req) => {
    try {
      const registration = await Registrations.create(ctx, {
        firstName: req.body.firstName,
        phone: req.body.phone,
        email: req.body.email || '',
        registeredAt: new Date()
      })

      await writeWorkspaceEvent(ctx, 'registration', {
        user: {
          firstName: req.body.firstName,
          phone: req.body.phone,
          email: req.body.email || ''
        },
        action_params: {}
      })

      await sendNotificationToAccountOwners(ctx, {
        title: 'Новая регистрация на мероприятие EMI',
        html: `<h2>Новая регистрация!</h2>
        <p><strong>Имя:</strong> ${req.body.firstName}</p>
        <p><strong>Телефон:</strong> ${req.body.phone}</p>
        <p><strong>Email:</strong> ${req.body.email || 'не указан'}</p>`,
        plain: `Новая регистрация на мероприятие!\n\nИмя: ${req.body.firstName}\nТелефон: ${req.body.phone}\nEmail: ${req.body.email || 'не указан'}`,
        md: `**Новая регистрация на мероприятие!**\n\n*Имя:* ${req.body.firstName}\n*Телефон:* ${req.body.phone}\n*Email:* ${req.body.email || 'не указан'}`
      })

      return { success: true, id: registration.id }
    } catch (error) {
      ctx.account.log('Registration error', {
        level: 'error',
        json: { error: error.message, body: req.body }
      })
      return { success: false, error: 'Ошибка при регистрации. Попробуйте еще раз.' }
    }
  })

// @shared-route
export const statsRoute = app.get('/stats', async (ctx, req) => {
  const count = await Registrations.countBy(ctx, {})
  return { count }
})
