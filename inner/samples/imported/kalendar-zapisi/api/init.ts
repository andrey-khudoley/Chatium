import CalendarSettingsTable from '../tables/calendarSettings.table'
import AdminUsersTable from '../tables/adminUsers.table'

// Инициализация календаря при первом запуске
// @shared-route
export const initCalendarRoute = app.get('/initialize', async (ctx, req) => {
  try {
    // Проверяем, есть ли уже настройки
    const existingSettings = await CalendarSettingsTable.findAll(ctx, { limit: 1 })

    if (!existingSettings[0]) {
      // Создаем стандартные настройки
      await CalendarSettingsTable.create(ctx, {
        title: 'Запись на прием',
        workDaysOfWeek: '1,2,3,4,5', // Пн-Пт
        workStartTime: '09:00',
        workEndTime: '18:00',
        slotDurationMinutes: 30,
        noticeBeforeMinutes: 60,
        maxDaysAhead: 30,
        isActive: true
      })
    }

    // Проверяем, есть ли уже администраторы
    const existingAdmins = await AdminUsersTable.findAll(ctx, { limit: 1 })

    if (existingAdmins.length === 0 && ctx.user?.confirmedEmail) {
      // Добавляем текущего пользователя как администратора и owner
      await AdminUsersTable.create(ctx, {
        email: ctx.user.confirmedEmail,
        firstName: ctx.user.firstName || 'Admin',
        lastName: ctx.user.lastName || 'User',
        role: 'admin',
        isActive: true,
        isOwner: true
      })
    } else if (existingAdmins.length > 0) {
      // Проверяем, есть ли Owner среди существующих администраторов
      const owners = await AdminUsersTable.findAll(ctx, {
        where: { isOwner: true },
        limit: 1
      })

      if (owners.length === 0) {
        // Нет Owner - делаем первого созданного админа Owner'ом
        const firstAdmin = await AdminUsersTable.findAll(ctx, {
          limit: 1,
          order: [{ createdAt: 'asc' }]
        })

        if (firstAdmin[0]) {
          await AdminUsersTable.update(ctx, {
            id: firstAdmin[0].id,
            isOwner: true,
            role: 'admin' // Owner всегда должен быть Admin
          })
        }
      } else {
        // Есть Owner - проверяем что у него role = 'admin'
        const owner = owners[0]
        if (owner.role !== 'admin') {
          await AdminUsersTable.update(ctx, {
            id: owner.id,
            role: 'admin'
          })
        }
      }
    }

    return { success: true, message: 'Calendar initialized' }
  } catch (error) {
    console.error('Init error:', error)
    return { error: 'Failed to initialize calendar' }
  }
})
