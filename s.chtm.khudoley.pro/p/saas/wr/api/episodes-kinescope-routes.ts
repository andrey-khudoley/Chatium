// @shared

import { requireAccountRole } from '@app/auth'
import { reporterApp } from '../shared/error-handler-middleware'
import * as kinescopeSdkRaw from '@kinescope/sdk'

const kinescopeSdk = kinescopeSdkRaw as any
const listPlayers = kinescopeSdk.listPlayers as (ctx: app.Ctx, params?: any) => Promise<any>
const listProjects = kinescopeSdk.listProjects as (ctx: app.Ctx, params: any) => Promise<any>
const listVideos = kinescopeSdk.listVideos as (ctx: app.Ctx, params: any) => Promise<any>
const unsafeReporterApp = reporterApp as any

// @shared-route
export const apiKinescopePlayersRoute = reporterApp.get('/kinescope-players', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const players = await listPlayers(ctx)

  return players.data.map((player: any) => ({
    id: player.id,
    name: player.name,
    settings: player.settings
  }))
})

// @shared-route
export const apiKinescopeFoldersRoute = reporterApp.get('/kinescope-folders', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const projects = await listProjects(ctx, { per_page: 100, page: 1 })

  const folders: Array<{ id: string; name: string; projectName: string }> = []

  for (const project of projects.data) {
    for (const folder of project.folders) {
      folders.push({
        id: folder.id,
        name: folder.name,
        projectName: project.name
      })
    }
  }

  return folders
})

// @shared-route
export const apiKinescopeProjectsRoute = reporterApp.get(
  '/kinescope-projects',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    try {
      const projects = await listProjects(ctx, { per_page: 100, page: 1 })

      return projects.data.map((project: any) => ({
        id: project.id,
        name: project.name
      }))
    } catch (error: any) {
      ctx.account.log('@webinar-room Kinescope listProjects error', {
        level: 'error',
        json: { error: error.message }
      })
      return []
    }
  }
)

// @shared-route
export const apiKinescopeVideosRoute = unsafeReporterApp
  .query(
    ((s: any) => ({
      page: s.number().optional(),
      per_page: s.number().optional(),
      project_id: s.string().optional(),
      query: s.string().optional()
    })) as any,
    { strict: false } as any
  )
  .get('/kinescope-videos', async (ctx: app.Ctx, req: any) => {
    requireAccountRole(ctx, 'Admin')

    try {
      const page = req.query.page || 1
      const perPage = req.query.per_page || 50
      const projectId = req.query.project_id
      const searchQuery = req.query.query

      const params: any = {
        per_page: perPage,
        page: page,
        order: 'created_at.desc'
      }

      if (projectId) {
        params.project_id = projectId
      }

      if (searchQuery) {
        params.q = searchQuery
      }

      const videos = await listVideos(ctx, params)

      return {
        data: videos.data.map((video: any) => {
          const videoId = video.embed_link?.split('/').pop()
          const autoThumbnail = videoId ? `https://kinescope.io/${videoId}/thumbnail.jpg` : null

          return {
            id: video.id,
            title: video.title,
            duration: video.duration,
            thumbnail: video.poster || autoThumbnail,
            embed_link: video.embed_link,
            created_at: video.created_at,
            project_id: video.project_id,
            project: video.project
              ? {
                  id: video.project.id,
                  name: video.project.name
                }
              : null
          }
        }),
        pagination: videos.pagination
      }
    } catch (error: any) {
      ctx.account.log('@webinar-room Kinescope listVideos error', {
        level: 'error',
        json: { error: error.message }
      })
      throw new Error('Не удалось загрузить видео из Kinescope: ' + error.message)
    }
  })
