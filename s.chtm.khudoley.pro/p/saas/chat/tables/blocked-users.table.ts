// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatBlockedUsersSKTCwy = Heap.Table(
  't_projekt_chat_t_projekt_chat_blocked_users_sKT_Pkx',
  {
    userId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID пользователя, который блокирует' } })
    ),
    blockedUserId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID заблокированного пользователя' } })
    ),
    reason: Heap.Optional(Heap.String({ customMeta: { title: 'Причина блокировки' } }))
  },
  { customMeta: { title: 'Заблокированные пользователи', description: '' } }
)

export default TProjektChatTProjektChatBlockedUsersSKTCwy

export type TProjektChatTProjektChatBlockedUsersSKTCwyRow =
  typeof TProjektChatTProjektChatBlockedUsersSKTCwy.T
export type TProjektChatTProjektChatBlockedUsersSKTCwyRowJson =
  typeof TProjektChatTProjektChatBlockedUsersSKTCwy.JsonT
