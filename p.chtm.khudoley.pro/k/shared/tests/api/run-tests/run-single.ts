// @shared-route
import { runSingleTest } from './shared'

export const apiRunSingleTestRoute = app.post('/', async (ctx, req) => {
  return runSingleTest(ctx, req)
})
