// @shared
/**
 * Порядок сообщений в UI чата: сверху вниз — от старых к новым.
 * `feedMessagesGetHandler` может отдавать ленту в обратном порядке (новые первыми).
 */

export function taskAiChatMsgTime(m: {
  createdAt?: number | Date | string | null
  createdAtTimestamp?: number | null
}): number {
  const c = m.createdAt ?? m.createdAtTimestamp
  if (c instanceof Date) return c.getTime()
  if (typeof c === 'number') return c
  if (typeof c === 'string') {
    const t = Date.parse(c)
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

export function sortTaskAiChatMessagesForDisplay<
  T extends {
    id?: string
    createdAt?: number | Date | string | null
    createdAtTimestamp?: number | null
  }
>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    const ta = taskAiChatMsgTime(a)
    const tb = taskAiChatMsgTime(b)
    if (ta !== tb) return ta - tb
    return String(a.id ?? '').localeCompare(String(b.id ?? ''))
  })
}
