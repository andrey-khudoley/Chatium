import { sendDataToSocket } from '@app/socket'

export async function emitEpisodeUpdated(ctx: app.Ctx, episodeId: string, episode: any) {
  const globalSocketId = 'episodes_global'
  const episodeSocketId = `episode_${episodeId}`

  await sendDataToSocket(ctx, globalSocketId, {
    type: 'episode_updated',
    episode
  })

  await sendDataToSocket(ctx, episodeSocketId, {
    type: 'episode_updated',
    episode
  })
}
