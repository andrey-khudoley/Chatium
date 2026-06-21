// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatBlockedUsersSKTN9i = Heap.Table(
  't_projekt_chat_t_projekt_chat_blocked_users_sKT_HEP',
  {
    userId: Heap.Optional(Heap.String({ customMeta: { title: 'ID пользователя, который блокирует' } })),
    blockedUserId: Heap.Optional(Heap.String({ customMeta: { title: 'ID заблокированного пользователя' } })),
    reason: Heap.Optional(Heap.String({ customMeta: { title: 'Причина блокировки' } })),
  },
  { customMeta: { title: 'blocked-users.table.ts', description: '' } },
)

export default TProjektChatTProjektChatBlockedUsersSKTN9i

export type TProjektChatTProjektChatBlockedUsersSKTN9iRow = typeof TProjektChatTProjektChatBlockedUsersSKTN9i.T
export type TProjektChatTProjektChatBlockedUsersSKTN9iRowJson = typeof TProjektChatTProjektChatBlockedUsersSKTN9i.JsonT
