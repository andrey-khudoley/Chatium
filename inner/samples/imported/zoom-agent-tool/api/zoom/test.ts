import { getZoomAuthToken } from '../zoom-api'

export const apiZoomTestRoute = app.get('/', async (ctx, req) => {
  const tokenResult = await getZoomAuthToken(ctx)

  if (typeof tokenResult === 'string') {
    return {
      success: true,
      message: 'Успешное подключение к Zoom API. Токен получен.'
    }
  } else {
    return {
      success: false,
      message: tokenResult.message
    }
  }
})
