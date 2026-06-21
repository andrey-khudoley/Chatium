import { writeWorkspaceEvent } from '@start/sdk'

interface RegistrationData {
  name: string
  email: string
  phone: string
  cardId: string
  cardTitle: string
}

// @shared-route
export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const data: RegistrationData = req.body

  // Записываем событие регистрации
  await writeWorkspaceEvent(ctx, 'cardRegistration', {
    user: {
      email: data.email,
      phone: data.phone,
      firstName: data.name
    },
    action_params: {
      cardId: data.cardId,
      cardTitle: data.cardTitle
    },
    action_param1: data.cardId,
    action_param2: data.cardTitle
  })

  // Здесь можно добавить интеграцию с CRM или отправку в Telegram

  return { success: true, message: 'Регистрация успешна!' }
})
