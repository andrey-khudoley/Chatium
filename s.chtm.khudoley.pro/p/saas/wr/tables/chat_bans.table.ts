import { Heap } from '@app/heap'
import Episodes from './episodes.table'

export const ChatBans = Heap.Table(
  'webinar-room-chat-bans_p7R',
  {
    user: Heap.UserRefLink(),
    bannedBy: Heap.Optional(Heap.UserRefLink()),
    episode: Heap.Optional(Heap.RefLink(Episodes, { onDelete: 'none' })),
    reason: Heap.Optional(Heap.String({ customMeta: { title: 'Причина блокировки' } })),
    expiresAt: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Истекает (null = навсегда)' } })
    ),
    type: Heap.Optional(
      Heap.String({ customMeta: { title: 'Тип блокировки (permanent/timeout)' } })
    )
  },
  { customMeta: { title: 'Баны в чате', description: 'Баны в чате' } }
)

export default ChatBans

export type ChatBansRow = typeof ChatBans.T
export type ChatBansRowJson = typeof ChatBans.JsonT
