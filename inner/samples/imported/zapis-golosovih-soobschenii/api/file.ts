// @shared-route
export const apiGetPublicUrlRoute = app.get('/:hash', async (ctx, req) => {
  const { hash } = req.params

  if (!hash) {
    throw new Error('File hash is required')
  }

  // Формируем публичный URL файла
  const url = `https://msk.cdn-chatium.io/get/${hash}`

  return {
    url,
    hash
  }
})
