import { obtainStorageFilePutUrl } from '@app/storage'

// @shared-route
export const apiGetUploadUrlRoute = app.get('/upload-url', async (ctx, req) => {
  const uploadUrl = await obtainStorageFilePutUrl(ctx)

  return { uploadUrl }
})
