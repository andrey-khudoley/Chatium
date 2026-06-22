import { fetchOffers } from '../../lib/offers/offers.lib'

export const offerListFunction = app.function('/offers/list', async (ctx, _params, _callerInfo) => {
  return fetchOffers(ctx)
})
