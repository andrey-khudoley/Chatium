import { getTelegramOauthUrl } from '@users/sdk/auth'

// @shared-route
export const getTelegramOauthUrlRoute = app
  .body((s) => ({
    back: s.string().optional()
  }))
  .result((s) => s.string())
  .post('/get-telegram-oauth-url', async (ctx, req) => {
    const { back } = req.body

    const oauthUrl = await getTelegramOauthUrl(ctx, { back })

    return oauthUrl
  })
