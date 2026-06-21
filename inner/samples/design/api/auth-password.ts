// @shared-route

export const apiGetPasswordHashRoute = app.post('/password-hash', async (ctx, req) => {
  try {
    const body =
      req.body && Object.keys(req.body).length > 0
        ? req.body
        : (req as any).it || (req as any).ik || (req as any).pwd
          ? req
          : {}
    const { it, ik, pwd } = body as any

    if (!it || !ik || !pwd) {
      return { success: false, error: 'Missing parameters' }
    }

    const authProvider = await import('@app/auth/provider')
    const getPasswordHashWithSalt = (authProvider as any).getPasswordHashWithSalt

    if (typeof getPasswordHashWithSalt !== 'function') {
      return { success: false, error: 'Password auth not available' }
    }

    const hash = await getPasswordHashWithSalt(ctx, it, ik, pwd)
    return { success: true, hash }
  } catch (error: any) {
    ctx.account.log('Failed to get password hash', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})
