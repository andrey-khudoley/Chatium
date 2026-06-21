// @shared
import { findCurrentWorkspace } from '@start/sdk'
import Episodes from '../../tables/episodes.table'
import Autowebinars from '../../tables/autowebinars.table'

export function actionToEventType(action: string): string {
  return action.replace('player_', '')
}

export async function getWorkspacePath(ctx: any): Promise<string> {
  const workspace = await findCurrentWorkspace(ctx)
  return workspace?.path ?? '/'
}

export function formActionToEventType(action: string | null, urlPath: string): string {
  if (urlPath.includes('webinar_form_payment_completed')) return 'payment_completed'
  if (urlPath.includes('webinar_form_submitted')) return 'submitted'

  if (!action) return 'unknown'
  return action.replace('form_', '')
}

export interface AnalyticsEntity {
  id: string
  title: string
  startedAt: Date | null
  finishedAt: Date | null
  durationSeconds: number
  type: 'episode' | 'autowebinar'
}

export async function resolveAnalyticsEntity(
  ctx: any,
  entityId: string
): Promise<AnalyticsEntity | null> {
  const episode = await Episodes.findById(ctx, entityId)
  if (episode) {
    const startedAt = episode.startedAt ? new Date(episode.startedAt) : null
    const finishedAt = episode.finishedAt ? new Date(episode.finishedAt) : null
    const durationSeconds = startedAt
      ? Math.floor(((finishedAt ? finishedAt.getTime() : Date.now()) - startedAt.getTime()) / 1000)
      : 0
    return {
      id: episode.id,
      title: episode.title,
      startedAt,
      finishedAt,
      durationSeconds,
      type: 'episode'
    }
  }

  const autowebinar = await Autowebinars.findById(ctx, entityId)
  if (autowebinar) {
    return {
      id: autowebinar.id,
      title: autowebinar.title,
      startedAt: null,
      finishedAt: null,
      durationSeconds: autowebinar.duration || 0,
      type: 'autowebinar'
    }
  }

  return null
}
