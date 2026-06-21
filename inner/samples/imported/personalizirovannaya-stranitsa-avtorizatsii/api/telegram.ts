import { getTelegramOauthUrl } from '@users/sdk/auth'

// @shared-route
export const getTelegramOauthUrlRoute = app
  .post('/get-telegram-oauth-url')
  .body((s) => ({
    back: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    const { back } = req.body

    const oauthUrl = await getTelegramOauthUrl(ctx, { back })

    return oauthUrl
  })
