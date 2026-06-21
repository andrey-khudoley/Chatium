/**
 * Хелперы для нормализации данных сообщений (author id, reactions).
 * Используются в api/messages и в тестах.
 */

/** Значение createdBy из Feed: строка id или объект с id */
export type CreatedBy = string | { id: string } | undefined

/** Минимальный контур сообщения Feed для обогащения и нормализации */
export interface FeedMessageMinimal {
  id?: string
  createdBy?: CreatedBy
  created_by?: string | { id: string }
  data?: { reactions?: unknown; forwardedFrom?: unknown; [k: string]: unknown }
  reactions?: unknown
  author?: { id: string; displayName?: string }
  [key: string]: unknown
}

export function normalizeAuthorId(createdBy: CreatedBy): string {
  if (!createdBy) return ''
  if (typeof createdBy === 'string') return createdBy
  if (typeof createdBy === 'object' && createdBy !== null && 'id' in createdBy) return createdBy.id
  return String(createdBy)
}

export function normalizeReactions(message: FeedMessageMinimal): Record<string, unknown> {
  let reactions: unknown =
    message.reactions ?? (message.data as { reactions?: unknown } | undefined)?.reactions ?? {}
  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions) as Record<string, unknown>
    } catch {
      reactions = {}
    }
  }
  return reactions && typeof reactions === 'object' && !Array.isArray(reactions)
    ? (reactions as Record<string, unknown>)
    : {}
}
