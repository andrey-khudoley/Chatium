// @shared
import { servicesConfig } from '../config/services'
import { scheduleConfig } from '../config/schedule'

// @shared-route
export const apiGetServicesRoute = app.get('/services', async (ctx, req) => {
  return servicesConfig.services
})

// @shared-route
export const apiGetScheduleRoute = app.get('/schedule', async (ctx, req) => {
  return scheduleConfig
})

// Helper function to generate time slots based on schedule
export function generateTimeSlots(dayOfWeek: string, date?: Date): string[] {
  const daySchedule = scheduleConfig.workingHours[dayOfWeek.toLowerCase()]

  if (!daySchedule || !daySchedule.isOpen) {
    return []
  }

  const slots: string[] = []
  const [startHour, startMinute] = daySchedule.start.split(':').map(Number)
  const [endHour, endMinute] = daySchedule.end.split(':').map(Number)

  const startTime = startHour * 60 + startMinute
  const endTime = endHour * 60 + endMinute

  for (let time = startTime; time < endTime; time += scheduleConfig.timeSlotDuration) {
    const hours = Math.floor(time / 60)
    const minutes = time % 60
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    // Check if time is not in break periods
    const isInBreak = daySchedule.breaks.some((breakPeriod) => {
      const [breakStartHour, breakStartMinute] = breakPeriod.start.split(':').map(Number)
      const [breakEndHour, breakEndMinute] = breakPeriod.end.split(':').map(Number)
      const breakStart = breakStartHour * 60 + breakStartMinute
      const breakEnd = breakEndHour * 60 + breakEndMinute
      return time >= breakStart && time < breakEnd
    })

    if (!isInBreak) {
      slots.push(timeStr)
    }
  }

  return slots
}

// @shared-route
export const apiGetTimeSlotsRoute = app.get('/timeslots/:date?', async (ctx, req) => {
  const date = req.params.date ? new Date(req.params.date) : new Date()
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    date.getDay()
  ]

  return generateTimeSlots(dayOfWeek, date)
})
