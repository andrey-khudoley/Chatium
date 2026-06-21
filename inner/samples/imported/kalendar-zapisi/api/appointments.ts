import AppointmentsTable from '../tables/appointments.table'
import CalendarSettingsTable from '../tables/calendarSettings.table'
import AdminUsersTable from '../tables/adminUsers.table'
import { getMoscowNow, getMoscowDateString } from '../shared/timeUtils'

// @shared-route
export const apiCalendarSettingsRoute = app.get('/settings', async (ctx, req) => {
  const settings = await CalendarSettingsTable.findAll(ctx, { limit: 1 })
  return settings[0] || null
})

// @shared-route
export const apiScheduleRoute = app.post('/schedule', async (ctx, req) => {
  const { startDate, days, isAdmin } = req.body
  const daysCount = Math.min(days || 7, 14)

  const settings = await CalendarSettingsTable.findAll(ctx, { limit: 1 })
  if (!settings[0]) {
    return { error: 'Calendar not configured' }
  }

  const calendarSettings = settings[0]

  if (!calendarSettings.isActive) {
    return { schedule: {} }
  }

  const schedule: Record<string, Array<any>> = {}
  const startDateObj = new Date(startDate + 'T00:00:00')

  const endDate = new Date(startDateObj)
  endDate.setDate(endDate.getDate() + daysCount)

  const allAppointments = await AppointmentsTable.findAll(ctx, {
    where: {
      appointmentDate: { $gte: startDateObj, $lt: endDate },
      status: { $not: 'cancelled' }
    },
    limit: 1000
  })

  const now = getMoscowNow()
  const minNoticeMs = calendarSettings.noticeBeforeMinutes * 60 * 1000
  const workDays = calendarSettings.workDaysOfWeek.split(',').map((d: string) => parseInt(d.trim()))
  const slotDuration = calendarSettings.slotDurationMinutes

  function isSlotBooked(dateStr: string, timeStr: string): boolean {
    const dayAppointments = allAppointments.filter((apt: any) => {
      const aptDate = apt.appointmentDate.toISOString().split('T')[0]
      return aptDate === dateStr && apt.status !== 'cancelled'
    })

    for (const apt of dayAppointments) {
      const [aptHour, aptMin] = apt.appointmentTime.split(':').map(Number)
      const [slotHour, slotMin] = timeStr.split(':').map(Number)

      const aptTimeMinutes = aptHour * 60 + aptMin
      const slotTimeMinutes = slotHour * 60 + slotMin
      const aptDuration = apt.duration || slotDuration
      const aptEndTime = aptTimeMinutes + aptDuration

      if (slotTimeMinutes >= aptTimeMinutes && slotTimeMinutes < aptEndTime) {
        return true
      }
    }

    return false
  }

  for (let i = 0; i < daysCount; i++) {
    const currentDate = new Date(startDateObj)
    currentDate.setDate(currentDate.getDate() + i)
    const dateStr = currentDate.toISOString().split('T')[0]

    let dayOfWeek = currentDate.getDay()
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek

    const isWorkDay = workDays.includes(dayOfWeek)

    // Если это запрос от клиента (не админа) и день нерабочий - показываем недоступные слоты
    if (!isAdmin && !isWorkDay) {
      const daySlots: Array<any> = []
      const [startHour, startMin] = calendarSettings.workStartTime.split(':').map(Number)
      const [endHour, endMin] = calendarSettings.workEndTime.split(':').map(Number)

      let slotTime = new Date(dateStr + 'T00:00:00')
      slotTime.setHours(startHour, startMin, 0, 0)

      const endTime = new Date(dateStr + 'T00:00:00')
      endTime.setHours(endHour, endMin, 0, 0)

      while (slotTime < endTime) {
        const hours = String(slotTime.getHours()).padStart(2, '0')
        const minutes = String(slotTime.getMinutes()).padStart(2, '0')
        const timeStr = `${hours}:${minutes}`

        daySlots.push({ time: timeStr, available: false, booked: false })
        slotTime.setMinutes(slotTime.getMinutes() + slotDuration)
      }

      schedule[dateStr] = daySlots
      continue
    }

    const daySlots: Array<any> = []

    const [startHour, startMin] = calendarSettings.workStartTime.split(':').map(Number)
    const [endHour, endMin] = calendarSettings.workEndTime.split(':').map(Number)

    let slotTime = new Date(dateStr + 'T00:00:00')
    slotTime.setHours(startHour, startMin, 0, 0)

    const endTime = new Date(dateStr + 'T00:00:00')
    endTime.setHours(endHour, endMin, 0, 0)

    const isToday = dateStr === getMoscowDateString()

    while (slotTime < endTime) {
      const hours = String(slotTime.getHours()).padStart(2, '0')
      const minutes = String(slotTime.getMinutes()).padStart(2, '0')
      const timeStr = `${hours}:${minutes}`

      const booked = isSlotBooked(dateStr, timeStr)
      let available = !booked

      // Проверка минимального времени только для клиентов, не для админов
      if (!isAdmin && available && isToday) {
        const earliestAllowedTime = new Date(now.getTime() + minNoticeMs)
        if (slotTime <= earliestAllowedTime) {
          available = false
        }
      }

      daySlots.push({ time: timeStr, available, booked })
      slotTime.setMinutes(slotTime.getMinutes() + slotDuration)
    }

    schedule[dateStr] = daySlots
  }

  return { schedule, settings: calendarSettings }
})

// @shared-route
export const apiAvailableSlotsRoute = app.post('/available-slots', async (ctx, req) => {
  const { date } = req.body

  const settings = await CalendarSettingsTable.findAll(ctx, { limit: 1 })
  if (!settings[0]) {
    return { error: 'Calendar not configured' }
  }

  const calendarSettings = settings[0]

  if (!calendarSettings.isActive) {
    return { slots: [] }
  }
  const targetDate = new Date(date + 'T00:00:00')
  let dayOfWeek = targetDate.getDay()

  dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek

  const workDays = calendarSettings.workDaysOfWeek.split(',').map((d: string) => parseInt(d.trim()))
  if (!workDays.includes(dayOfWeek)) {
    return { slots: [] }
  }

  const existingAppointments = await AppointmentsTable.findAll(ctx, {
    where: {
      appointmentDate: targetDate,
      status: { $not: 'cancelled' }
    }
  })

  const slotDuration = calendarSettings.slotDurationMinutes

  function isSlotBooked(timeStr: string): boolean {
    for (const apt of existingAppointments) {
      const [aptHour, aptMin] = apt.appointmentTime.split(':').map(Number)
      const [slotHour, slotMin] = timeStr.split(':').map(Number)

      const aptTimeMinutes = aptHour * 60 + aptMin
      const slotTimeMinutes = slotHour * 60 + slotMin
      const aptDuration = apt.duration || slotDuration
      const aptEndTime = aptTimeMinutes + aptDuration

      if (slotTimeMinutes >= aptTimeMinutes && slotTimeMinutes < aptEndTime) {
        return true
      }
    }
    return false
  }

  const slots = []
  const [startHour, startMin] = calendarSettings.workStartTime.split(':').map(Number)
  const [endHour, endMin] = calendarSettings.workEndTime.split(':').map(Number)

  let currentTime = new Date(date + 'T00:00:00')
  currentTime.setHours(startHour, startMin, 0, 0)

  const endTime = new Date(date + 'T00:00:00')
  endTime.setHours(endHour, endMin, 0, 0)

  const now = getMoscowNow()
  const isToday = date === getMoscowDateString()

  const minNoticeMs = calendarSettings.noticeBeforeMinutes * 60 * 1000

  while (currentTime < endTime) {
    const hours = String(currentTime.getHours()).padStart(2, '0')
    const minutes = String(currentTime.getMinutes()).padStart(2, '0')
    const timeStr = `${hours}:${minutes}`

    let isAvailable = !isSlotBooked(timeStr)

    if (isAvailable && isToday) {
      const slotTime = new Date(date + 'T' + timeStr + ':00')
      const earliestAllowedTime = new Date(now.getTime() + minNoticeMs)
      if (slotTime <= earliestAllowedTime) {
        isAvailable = false
      }
    }

    if (isAvailable) {
      slots.push({
        time: timeStr,
        available: true
      })
    }

    currentTime.setMinutes(currentTime.getMinutes() + slotDuration)
  }

  return { slots }
})

// @shared-route
export const apiCreateAppointmentRoute = app.post('/create', async (ctx, req) => {
  const { name, telegramId, email, comments, appointmentDate, appointmentTime } = req.body

  if (!name || !appointmentDate || !appointmentTime) {
    return { error: 'Missing required fields' }
  }

  const settings = await CalendarSettingsTable.findAll(ctx, { limit: 1 })
  if (!settings[0]?.isActive) {
    return { error: 'Calendar is not active' }
  }

  const calendarSettings = settings[0]
  const duration = calendarSettings.slotDurationMinutes

  const appointment = await AppointmentsTable.create(ctx, {
    name,
    telegramId,
    email: email || '',
    comments: comments || '',
    appointmentDate: new Date(appointmentDate + 'T00:00:00'),
    appointmentTime,
    duration,
    status: 'new'
  })

  return { success: true, appointment }
})

// @shared-route
export const apiAppointmentsListRoute = app.get('/list', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const admin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail
  })

  if (!admin) {
    return { error: 'Access denied' }
  }

  const appointments = await AppointmentsTable.findAll(ctx, {
    limit: 1000,
    order: [{ appointmentDate: 'desc' }]
  })

  return appointments
})

// @shared-route
export const apiUpdateAppointmentRoute = app.post('/update/:id', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const admin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail
  })

  if (!admin) {
    return { error: 'Access denied' }
  }

  const { status, notes } = req.body
  const appointment = await AppointmentsTable.update(ctx, {
    id: req.params.id,
    status,
    notes
  })

  return appointment
})

// @shared-route
export const apiDeleteAppointmentRoute = app.post('/delete/:id', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const admin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail
  })

  if (!admin) {
    return { error: 'Access denied' }
  }

  try {
    await AppointmentsTable.delete(ctx, req.params.id)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to delete appointment' }
  }
})

// @shared-route
export const apiUpdateSettingsRoute = app.post('/update-settings', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const admin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail
  })

  if (!admin) {
    return { error: 'Access denied' }
  }

  const settings = await CalendarSettingsTable.findAll(ctx, { limit: 1 })

  if (settings[0]) {
    const updated = await CalendarSettingsTable.update(ctx, {
      id: settings[0].id,
      ...req.body
    })
    return updated
  } else {
    const created = await CalendarSettingsTable.create(ctx, req.body)
    return created
  }
})

// @shared-route
export const apiCheckAdminRoute = app.get('/check-admin', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { isAdmin: false, currentAdmin: null }
  }

  const admin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail,
    isActive: true
  })

  return { isAdmin: !!admin, currentAdmin: admin || null }
})

// @shared-route
export const apiAddAdminRoute = app.post('/add-admin', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const currentAdmin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail
  })

  if (!currentAdmin) {
    return { error: 'Access denied' }
  }

  const { email, firstName, lastName } = req.body

  const existingAdmins = await AdminUsersTable.findAll(ctx, { limit: 1 })
  const isFirstAdmin = existingAdmins.length === 0

  const admin = await AdminUsersTable.create(ctx, {
    email,
    firstName,
    lastName,
    role: isFirstAdmin ? 'admin' : 'staff',
    isActive: true,
    isOwner: isFirstAdmin
  })

  return admin
})

// @shared-route
export const apiAdminsListRoute = app.get('/admins', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const currentAdmin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail
  })

  if (!currentAdmin) {
    return { error: 'Access denied' }
  }

  const admins = await AdminUsersTable.findAll(ctx, {
    limit: 100,
    order: [{ isOwner: 'desc' }, { isActive: 'desc' }]
  })
  return admins
})

// @shared-route
export const apiUpdateAdminRoleRoute = app.post('/update-admin-role/:id', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const currentAdmin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail,
    isActive: true
  })

  if (!currentAdmin) {
    return { error: 'Access denied' }
  }

  const targetAdmin = await AdminUsersTable.findById(ctx, req.params.id)
  if (!targetAdmin) {
    return { error: 'Admin not found' }
  }

  // Owner не может быть изменен
  if (targetAdmin.isOwner) {
    return { error: 'Cannot modify owner' }
  }

  // Owner может менять всех (кроме себя)
  if (currentAdmin.isOwner) {
    // Owner имеет полные права
  } else if (currentAdmin.role === 'staff') {
    // Staff не может менять роли
    return { error: 'Staff cannot change roles' }
  } else if (currentAdmin.role === 'admin') {
    // Admin может менять только staff
    if (targetAdmin.role === 'admin') {
      return { error: 'Admin can only modify staff' }
    }
  }

  const { role } = req.body
  if (!['staff', 'admin'].includes(role)) {
    return { error: 'Invalid role' }
  }

  const updated = await AdminUsersTable.update(ctx, {
    id: req.params.id,
    role
  })

  return updated
})

// @shared-route
export const apiUpdateAdminStatusRoute = app.post('/update-admin-status/:id', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const currentAdmin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail,
    isActive: true
  })

  if (!currentAdmin) {
    return { error: 'Access denied' }
  }

  const targetAdmin = await AdminUsersTable.findById(ctx, req.params.id)
  if (!targetAdmin) {
    return { error: 'Admin not found' }
  }

  // Owner не может быть деактивирован
  if (targetAdmin.isOwner) {
    return { error: 'Cannot modify owner status' }
  }

  // Owner может менять всех (кроме себя)
  if (currentAdmin.isOwner) {
    // Owner имеет полные права
  } else if (currentAdmin.role === 'staff') {
    // Staff не может менять статус
    return { error: 'Staff cannot change admin status' }
  } else if (currentAdmin.role === 'admin') {
    // Admin может менять статус только staff
    if (targetAdmin.role === 'admin') {
      return { error: 'Admin can only modify staff status' }
    }
  }

  const { isActive } = req.body
  if (typeof isActive !== 'boolean') {
    return { error: 'Invalid status value' }
  }

  const updated = await AdminUsersTable.update(ctx, {
    id: req.params.id,
    isActive
  })

  return updated
})

// @shared-route
export const apiDeleteAdminRoute = app.post('/delete-admin/:id', async (ctx, req) => {
  if (!ctx.user?.confirmedEmail) {
    return { error: 'Access denied' }
  }

  const currentAdmin = await AdminUsersTable.findOneBy(ctx, {
    email: ctx.user.confirmedEmail,
    isActive: true
  })

  if (!currentAdmin) {
    return { error: 'Access denied' }
  }

  const targetAdmin = await AdminUsersTable.findById(ctx, req.params.id)
  if (!targetAdmin) {
    return { error: 'Admin not found' }
  }

  // Owner не может быть удален
  if (targetAdmin.isOwner) {
    return { error: 'Cannot delete owner' }
  }

  // Нельзя удалить себя
  if (currentAdmin.id === targetAdmin.id) {
    return { error: 'Cannot delete yourself' }
  }

  // Owner может удалять всех (кроме себя)
  if (currentAdmin.isOwner) {
    // Owner имеет полные права
  } else if (currentAdmin.role === 'staff') {
    // Staff не может удалять администраторов
    return { error: 'Staff cannot delete admins' }
  } else if (currentAdmin.role === 'admin') {
    // Admin может удалять только staff
    if (targetAdmin.role === 'admin') {
      return { error: 'Admin can only delete staff' }
    }
  }

  try {
    await AdminUsersTable.delete(ctx, req.params.id)
    return { success: true }
  } catch (e) {
    return { error: 'Failed to delete admin' }
  }
})
