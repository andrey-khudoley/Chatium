import LandingsTable from '../tables/landings.table'
import { queryAi } from '@traffic/sdk'
import { requireRealUser } from '@app/auth'

// @shared-route
export const apiGetLandingsRoute = app.get('/landings', async (ctx, req) => {
  requireRealUser(ctx)
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
    requireRealUser(ctx)
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

      // Определяем workspacePath автоматически из URL в behaviour2_log
      let workspacePath = ''
      try {
        const query = `
        SELECT DISTINCT urlPath
        FROM chatium_ai.behaviour2_log
        WHERE
          startsWith(urlPath, 'https')
          AND (urlPath LIKE '%${req.body.path}%' OR urlPath LIKE '%${req.body.path}/%')
          AND dt >= subtractDays(today(), 90)
        LIMIT 1
      `
        const result = await queryAi(ctx, query)

        if (result.rows.length > 0) {
          const url = new URL(result.rows[0].urlPath)
          // Извлекаем workspacePath из URL pathname
          // Формат: /workspace-name/path или просто /path (текущий воркспейс)
          const pathParts = url.pathname.split('/').filter((p) => p)
          if (pathParts.length > 1) {
            // Первая часть - это воркспейс
            workspacePath = '/' + pathParts[0]
          }
        }
      } catch (error) {
        ctx.account.log('Error detecting workspace path', {
          level: 'warn',
          json: { error: error.message }
        })
      }

      const landing = await LandingsTable.create(ctx, {
        path: req.body.path,
        title: req.body.title,
        isActive: true,
        workspacePath: workspacePath || ''
      })

      ctx.account.log('Landing created', {
        level: 'info',
        json: { landingId: landing.id, path: landing.path, workspacePath: landing.workspacePath }
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
    requireRealUser(ctx)
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
export const apiUpdateLandingTitleRoute = app
  .body((s) => ({
    id: s.string(),
    title: s.string()
  }))
  .post('/update-landing-title', async (ctx, req) => {
    requireRealUser(ctx)
    try {
      const landing = await LandingsTable.update(ctx, {
        id: req.body.id,
        title: req.body.title
      })

      ctx.account.log('Landing title updated', {
        level: 'info',
        json: { landingId: landing.id, newTitle: landing.title }
      })

      return { success: true, data: landing }
    } catch (error) {
      ctx.account.log('Error updating landing title', {
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
    requireRealUser(ctx)
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

// @shared-route
export const apiGetAvailablePathsRoute = app.get('/available-paths', async (ctx, req) => {
  requireRealUser(ctx)
  try {
    // Получаем уникальные пути из behaviour2_log за последние 90 дней
    const query = `
      SELECT DISTINCT
        urlPath
      FROM chatium_ai.behaviour2_log
      WHERE
        startsWith(urlPath, 'https')
        AND dt >= subtractDays(today(), 90)
      LIMIT 1000
    `

    const result = await queryAi(ctx, query)

    // Извлекаем пути из URL и проверяем доступность воркспейсов
    const pathsMap = new Map<string, { path: string; workspacePath: string }>()

    for (const row of result.rows) {
      try {
        const url = new URL(row.urlPath)
        let path = url.pathname

        // Убираем trailing slash если есть и путь не корневой
        if (path !== '/' && path.endsWith('/')) {
          path = path.slice(0, -1)
        }

        // Извлекаем workspacePath из URL pathname
        // Учитываем что путь может содержать тильду (~), которая разделяет workspace и внутренний путь
        // Например: /workspace/page~subpage или /dir1/dir2/page
        let workspacePath = ''

        // Если в пути есть тильда, то часть до тильды - это workspace path
        const tildeIndex = path.indexOf('~')
        if (tildeIndex > 0) {
          // Путь вида /workspace/route~internal
          const pathBeforeTilde = path.substring(0, tildeIndex)
          const lastSlashIndex = pathBeforeTilde.lastIndexOf('/')
          if (lastSlashIndex >= 0) {
            workspacePath = pathBeforeTilde.substring(0, lastSlashIndex)
          }
        } else {
          // Обычный путь без тильды: /workspace/page или /workspace/dir/page
          const pathParts = path.split('/').filter((p) => p)
          if (pathParts.length > 1) {
            workspacePath = '/' + pathParts[0]
          }
        }

        // Добавляем только если путь не корневой
        if (path && path !== '/') {
          pathsMap.set(path, { path, workspacePath })
        }
      } catch (e) {
        // Игнорируем невалидные URL
      }
    }

    // Проверяем существование воркспейсов
    const validPaths: string[] = []
    const checkedWorkspaces = new Map<string, boolean>()

    for (const [path, info] of pathsMap.entries()) {
      // Если workspacePath пустой - это текущий воркспейс, всегда валиден
      if (!info.workspacePath || info.workspacePath === ctx.workspacePath) {
        validPaths.push(path)
        continue
      }

      // Проверяем воркспейс только один раз (кэшируем результат)
      if (!checkedWorkspaces.has(info.workspacePath)) {
        let isValid = false
        try {
          const tables = await ctx.heap.getWorkspaceTables(info.workspacePath)
          // Воркспейс валиден только если метод вернул непустой массив или по крайней мере не упал с ошибкой
          isValid = tables !== null && tables !== undefined && Array.isArray(tables)
        } catch (error) {
          // Воркспейс не существует или недоступен
          isValid = false
          ctx.account.log('Workspace not accessible', {
            level: 'debug',
            json: { workspacePath: info.workspacePath, error: error.message }
          })
        }
        checkedWorkspaces.set(info.workspacePath, isValid)
      }

      // Добавляем путь только если воркспейс валиден
      if (checkedWorkspaces.get(info.workspacePath)) {
        validPaths.push(path)
      }
    }

    // Сортируем валидные пути
    const paths = validPaths.sort()

    ctx.account.log('Available paths loaded', {
      level: 'info',
      json: { pathsCount: paths.length, totalFound: pathsMap.size }
    })

    return { success: true, paths }
  } catch (error) {
    ctx.account.log('Error getting available paths', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message, paths: [] }
  }
})
