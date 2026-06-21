// @shared-route
import { getTestsList } from './shared'

export const apiGetTestsListRoute = app.get('/', async (ctx, req) => {
  return getTestsList(ctx, req)
})
