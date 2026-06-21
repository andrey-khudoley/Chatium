import LandingsTable from '../tables/landings.table'

// @shared-route
export const apiGetLandingsRoute = app.get('/landings', async (ctx, req) => {
  try {
    const landings = await LandingsTable.findAll(ctx, {
      limit: 1000,
      order: [{ createdAt: 'desc' }]
    })

    return { success: true, data: landings }
  } catch (error) {
    ctx.account.log('Error getting landings', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})

// @shared-route
export const apiCreateLandingRoute = app
  .body((s) => ({
    path: s.string(),
    title: s.string()
  }))
  .post('/create-landing', async (ctx, req) => {
    try {
      // Проверяем, что путь начинается с /
      if (!req.body.path.startsWith('/')) {
        return { success: false, error: 'Путь должен начинаться с "/"' }
      }

      // Проверяем, что такой лендинг уже не существует
      const existing = await LandingsTable.findOneBy(ctx, { path: req.body.path })
      if (existing) {
        return { success: false, error: 'Лендинг с таким путём уже существует' }
      }

      const landing = await LandingsTable.create(ctx, {
        path: req.body.path,
        title: req.body.title,
        isActive: true
      })

      ctx.account.log('Landing created', {
        level: 'info',
        json: { landingId: landing.id, path: landing.path }
      })

      return { success: true, data: landing }
    } catch (error) {
      ctx.account.log('Error creating landing', {
        level: 'error',
        json: { error: error.message }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiToggleLandingRoute = app
  .body((s) => ({
    id: s.string(),
    isActive: s.boolean()
  }))
  .post('/toggle-landing', async (ctx, req) => {
    try {
      const landing = await LandingsTable.update(ctx, {
        id: req.body.id,
        isActive: req.body.isActive
      })

      ctx.account.log('Landing toggled', {
        level: 'info',
        json: { landingId: landing.id, isActive: landing.isActive }
      })

      return { success: true, data: landing }
    } catch (error) {
      ctx.account.log('Error toggling landing', {
        level: 'error',
        json: { error: error.message }
      })
      return { success: false, error: error.message }
    }
  })

// @shared-route
export const apiDeleteLandingRoute = app
  .body((s) => ({
    id: s.string()
  }))
  .post('/delete-landing', async (ctx, req) => {
    try {
      const landing = await LandingsTable.findById(ctx, req.body.id)
      if (!landing) {
        return { success: false, error: 'Лендинг не найден' }
      }

      await LandingsTable.delete(ctx, req.body.id)

      ctx.account.log('Landing deleted', {
        level: 'info',
        json: { landingId: req.body.id, path: landing.path }
      })

      return { success: true }
    } catch (error) {
      ctx.account.log('Error deleting landing', {
        level: 'error',
        json: { error: error.message }
      })
      return { success: false, error: error.message }
    }
  })
