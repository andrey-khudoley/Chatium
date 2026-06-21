// API для сохранения результатов квиза
import QuizLeads from '../tables/quiz_leads.table'

export interface QuizAnswer {
  question: string
  answer: string
}

// @shared-route
export const apiSaveQuizRoute = app.post('/save-quiz', async (ctx, req) => {
  const { name, email, phone, answers } = req.body

  try {
    // Валидация
    if (!name || !email || !phone) {
      return { success: false, error: 'Пожалуйста, заполните все поля' }
    }

    // Базовая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Пожалуйста, введите корректный email' }
    }

    // Сохраняем в таблицу
    const result = await QuizLeads.create(ctx, {
      name,
      email,
      phone,
      answers,
      completedAt: new Date()
    })

    return { success: true, message: 'Спасибо! Данные сохранены', leadId: result.id }
  } catch (error) {
    ctx.account.log('Error saving quiz lead', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: 'Произошла ошибка. Попробуйте еще раз.' }
  }
})
