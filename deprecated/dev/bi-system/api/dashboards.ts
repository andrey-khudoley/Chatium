// @shared-route
import { AnalyticsDashboards } from '../tables/dashboards.table'
import { AnalyticsDatasets } from '../tables/datasets.table'
import { requireAccountRole } from '@app/auth'
import { Debug } from '../shared/debug'
import { applyDebugLevel } from '../lib/logging'

/**
 * API для работы с дашбордами
 * Дашборд - это набор визуальных компонентов поверх датасетов
 */

/**
 * GET /list - Получить список всех дашбордов
 */
export const apiDashboardsListRoute = app.get('/list', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:list')

  const dashboards = await AnalyticsDashboards.findAll(ctx, {})
  Debug.info(ctx, `[dashboards:list] найдено ${dashboards.length} записей`)

  return {
    success: true,
    dashboards: dashboards.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }))
  }
})

/**
 * GET /:id - Получить дашборд по ID
 */
export const apiDashboardGetRoute = app.get('/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:get')

  const dashboardId = req.params.id as string
  const dashboard = await AnalyticsDashboards.findById(ctx, dashboardId)

  if (!dashboard) {
    return {
      success: false,
      error: 'Dashboard not found'
    }
  }

  return {
    success: true,
    dashboard: {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      config: dashboard.config,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt
    }
  }
})

/**
 * POST /create - Создать новый дашборд
 */
export const apiDashboardCreateRoute = app.post('/create', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:create')

  const { name, description, config } = req.body

  if (!name) {
    return {
      success: false,
      error: 'Name is required'
    }
  }

  const dashboard = await AnalyticsDashboards.create(ctx, {
    name,
    description: description || '',
    config: config || '{"components":[]}'
  })

  Debug.info(ctx, `[dashboards:create] создан дашборд ${dashboard.id} (${dashboard.name})`)

  return {
    success: true,
    dashboard: {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      config: dashboard.config,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt
    }
  }
})

/**
 * POST /update/:id - Обновить дашборд
 */
export const apiDashboardUpdateRoute = app.post('/update/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:update')

  const dashboardId = req.params.id as string
  const { name, description, config } = req.body

  const existing = await AnalyticsDashboards.findById(ctx, dashboardId)
  if (!existing) {
    return {
      success: false,
      error: 'Dashboard not found'
    }
  }

  const updated = await AnalyticsDashboards.update(ctx, {
    id: dashboardId,
    name: name ?? existing.name,
    description: description ?? existing.description,
    config: config ?? existing.config
  })

  Debug.info(ctx, `[dashboards:update] обновлён дашборд ${updated.id} (${updated.name})`)

  return {
    success: true,
    dashboard: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      config: updated.config,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }
})

/**
 * POST /delete/:id - Удалить дашборд (роут с параметром для тестов)
 */
export const apiDashboardDeleteRoute = app.post('/delete/:id', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:delete')

  const dashboardId = req.params.id as string

  const existing = await AnalyticsDashboards.findById(ctx, dashboardId)
  if (!existing) {
    return {
      success: false,
      error: 'Dashboard not found'
    }
  }

  await AnalyticsDashboards.delete(ctx, dashboardId)

  Debug.info(ctx, `[dashboards:delete] удалён дашборд ${dashboardId} (${existing.name})`)

  return {
    success: true,
    message: 'Dashboard deleted successfully'
  }
})

/**
 * POST /delete - Удалить дашборд (для клиента)
 */
export const apiDashboardDeleteByIdRoute = app.post('/delete', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:delete')

  const { id, _redirect } = req.body

  if (!id) {
    return {
      success: false,
      error: 'Dashboard ID is required'
    }
  }

  const existing = await AnalyticsDashboards.findById(ctx, id)
  if (!existing) {
    return {
      success: false,
      error: 'Dashboard not found'
    }
  }

  await AnalyticsDashboards.delete(ctx, id)

  Debug.info(ctx, `[dashboards:delete] удалён дашборд ${id} (${existing.name})`)

  if (_redirect) {
    return ctx.resp.redirect(_redirect)
  }

  return {
    success: true,
    message: 'Dashboard deleted successfully'
  }
})

/**
 * POST /update - Обновить дашборд (для клиента, без параметра в пути)
 */
export const apiDashboardUpdateByIdRoute = app.post('/update', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  await applyDebugLevel(ctx, 'dashboards:update')

  const { id, name, description, config } = req.body

  if (!id) {
    return {
      success: false,
      error: 'Dashboard ID is required'
    }
  }

  const existing = await AnalyticsDashboards.findById(ctx, id)
  if (!existing) {
    return {
      success: false,
      error: 'Dashboard not found'
    }
  }

  const updated = await AnalyticsDashboards.update(ctx, {
    id,
    name: name ?? existing.name,
    description: description ?? existing.description,
    config: config ?? existing.config
  })

  Debug.info(ctx, `[dashboards:update] обновлён дашборд ${updated.id} (${updated.name})`)

  return {
    success: true,
    dashboard: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      config: updated.config,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }
})

// Endpoints для обработки данных удалены - логика будет переписана с нуля
