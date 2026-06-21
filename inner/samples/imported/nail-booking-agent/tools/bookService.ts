import Bookings from '../tables/Bookings.table'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { servicesConfig } from '../config/services'

app.accountHook('@start/agent/tools', async (ctx, params) => {
  return bookServiceTool
})

export const bookServiceTool = app
  .function('/book-service')
  .meta({
    name: 'book-service',
    description: `Use this tool to book a client for a nail service. Use this when a client wants to make a booking. Required information: client name, phone, service ID, date (YYYY-MM-DD), and time (HH:MM). Optional: email and notes.`
  })
  .body((s) =>
    s.object(
      {
        context: s.object(
          {
            userId: s.string().optional(),
            chainId: s.string().optional()
          },
          { additionalProperties: true }
        ),
        input: s.object({
          clientName: s.string().describe('Имя клиента'),
          clientPhone: s.string().describe('Телефон клиента в формате +7XXXXXXXXXX'),
          clientEmail: s.string().optional().describe('Email клиента (опционально)'),
          serviceId: s.string().describe('ID услуги из списка услуг'),
          date: s.string().describe('Дата записи в формате YYYY-MM-DD'),
          time: s.string().describe('Время записи в формате HH:MM'),
          notes: s.string().optional().describe('Дополнительные пожелания клиента')
        })
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('🛠️ bookServiceTool', { json: body })

    const input = body.input

    try {
      // Проверяем существование услуги
      const service = servicesConfig.services.find((s) => s.id === input.serviceId)
      if (!service) {
        return {
          ok: false,
          error: `Услуга с ID "${input.serviceId}" не найдена. Доступные услуги: ${servicesConfig.services.map((s) => `${s.id} (${s.name})`).join(', ')}`
        }
      }

      // Валидируем формат даты
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(input.date)) {
        return {
          ok: false,
          error: 'Неверный формат даты. Используй формат YYYY-MM-DD (например, 2025-01-15)'
        }
      }

      // Валидируем формат времени
      const timeRegex = /^\d{2}:\d{2}$/
      if (!timeRegex.test(input.time)) {
        return {
          ok: false,
          error: 'Неверный формат времени. Используй формат HH:MM (например, 14:30)'
        }
      }

      // Создаем запись
      const booking = await Bookings.create(ctx, {
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail || '',
        service: service.name,
        date: new Date(input.date),
        time: input.time,
        status: 'pending',
        notes: input.notes || ''
      })

      // Отправляем уведомление администратору
      await sendNotificationToAccountOwners(ctx, {
        title: 'Новая запись на маникюр через AI-помощника',
        html: `<h2>Новая запись</h2>
          <p><strong>Клиент:</strong> ${input.clientName}</p>
          <p><strong>Телефон:</strong> ${input.clientPhone}</p>
          <p><strong>Email:</strong> ${input.clientEmail || 'не указан'}</p>
          <p><strong>Услуга:</strong> ${service.name} (${service.price} ₽, ${service.duration} мин)</p>
          <p><strong>Дата:</strong> ${new Date(input.date).toLocaleDateString('ru-RU')}</p>
          <p><strong>Время:</strong> ${input.time}</p>
          ${input.notes ? `<p><strong>Комментарий:</strong> ${input.notes}</p>` : ''}`,
        plain: `Новая запись на маникюр через AI-помощника\n\nКлиент: ${input.clientName}\nТелефон: ${input.clientPhone}\nEmail: ${input.clientEmail || 'не указан'}\nУслуга: ${service.name} (${service.price} ₽, ${service.duration} мин)\nДата: ${new Date(input.date).toLocaleDateString('ru-RU')}\nВремя: ${input.time}${input.notes ? `\nКомментарий: ${input.notes}` : ''}`,
        md: `**Новая запись на маникюр через AI-помощника**\n\n**Клиент:** ${input.clientName}\n**Телефон:** ${input.clientPhone}\n**Email:** ${input.clientEmail || 'не указан'}\n**Услуга:** ${service.name} (${service.price} ₽, ${service.duration} мин)\n**Дата:** ${new Date(input.date).toLocaleDateString('ru-RU')}\n**Время:** ${input.time}${input.notes ? `\n**Комментарий:** ${input.notes}` : ''}`
      })

      return {
        ok: true,
        message: `Запись успешно создана! Клиент ${input.clientName} записан на ${service.name} на ${new Date(input.date).toLocaleDateString('ru-RU')} в ${input.time}. ID записи: ${booking.id}`,
        bookingId: booking.id
      }
    } catch (error) {
      return {
        ok: false,
        error: `Ошибка при создании записи: ${error.message}`
      }
    }
  })
