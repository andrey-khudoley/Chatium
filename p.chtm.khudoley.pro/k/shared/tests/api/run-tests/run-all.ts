// @shared-route
import { runAllTests } from './shared'

export const apiRunAllTestsRoute = app.get('/', async (ctx, req) => {
  return runAllTests(ctx, req)
})
