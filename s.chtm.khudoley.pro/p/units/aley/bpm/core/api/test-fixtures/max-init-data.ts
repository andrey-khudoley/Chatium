// @shared-route
import { requireAccountRole } from '@app/auth'
import {
  createMaxInitDataFixture,
  type MaxInitDataFixtureRequest
} from '../../lib/testFixtures/maxInitData.lib'

export const maxInitDataFixtureRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')
  try {
    const fixture = await createMaxInitDataFixture(
      ctx,
      (req.body ?? {}) as MaxInitDataFixtureRequest
    )
    return { success: true, ...fixture }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
