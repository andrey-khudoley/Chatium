import { scheduleConfig } from '../config/schedule'

app.accountHook('@start/agent/tools', async (ctx, params) => {
  return getScheduleTool
})

export const getScheduleTool = app
  .function('/get-schedule')
  .meta({
    name: 'get-schedule',
    description: `Use this tool to get the working schedule and hours. Use this when user asks about working hours, when the master is available, or what days the salon is open.`
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
        input: s.object({}, { additionalProperties: true })
      },
      { additionalProperties: true }
    )
  )
  .handle(async (ctx, body) => {
    ctx.account.log('🛠️ getScheduleTool', { json: body })

    const daysMap = {
      monday: 'Понедельник',
      tuesday: 'Вторник',
      wednesday: 'Среда',
      thursday: 'Четверг',
      friday: 'Пятница',
      saturday: 'Суббота',
      sunday: 'Воскресенье'
    }

    const workingHours = scheduleConfig.workingHours
    const schedule = Object.entries(workingHours).map(([day, hours]) => {
      const dayName = daysMap[day] || day
      if (!hours.isOpen) {
        return `${dayName}: Выходной`
      }

      let scheduleText = `${dayName}: ${hours.start} - ${hours.end}`

      if (hours.breaks && hours.breaks.length > 0) {
        const breaksText = hours.breaks.map((b) => `${b.start}-${b.end}`).join(', ')
        scheduleText += ` (Перерыв: ${breaksText})`
      }

      return scheduleText
    })

    const result = `Рабочий график:\n\n${schedule.join('\n')}\n\nДлительность одного слота: ${scheduleConfig.timeSlotDuration} минут\nМожно записаться заранее на: ${scheduleConfig.bookingAdvanceDays} дней`

    return {
      ok: true,
      result
    }
  })
