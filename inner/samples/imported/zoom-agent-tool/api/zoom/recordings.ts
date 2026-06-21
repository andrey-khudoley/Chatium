import { listCloudRecordings } from '../zoom-api'

export const apiZoomRecordingsRoute = app.get('/', async (ctx, req) => {
  return await listCloudRecordings(ctx)
})
