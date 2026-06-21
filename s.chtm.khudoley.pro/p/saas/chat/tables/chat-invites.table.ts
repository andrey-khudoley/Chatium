// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatInvitesWDM = Heap.Table(
  't_projekt_chat_chat_invites_cDU',
  {
    chat: Heap.Optional(Heap.RefLink('t_projekt_chat_chats_yz5', { customMeta: { title: 'Чат' } })),
    invitedBy: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Кто пригласил' } })),
    invitedUser: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Кого пригласили' } })),
    status: Heap.Optional(Heap.String({ customMeta: { title: 'Статус приглашения' } })),
    token: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Токен приглашения' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    inviteType: Heap.Optional(Heap.String({ customMeta: { title: 'Тип приглашения' } })),
    inviteValue: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Значение приглашения (email/phone/username)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    isLinkInvite: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Приглашение по ссылке' } })),
    expiresAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Срок действия' } }))
  },
  { customMeta: { title: 'Приглашения в чаты', description: '' } }
)

export default TProjektChatChatInvitesWDM

export type TProjektChatChatInvitesWDMRow = typeof TProjektChatChatInvitesWDM.T
export type TProjektChatChatInvitesWDMRowJson = typeof TProjektChatChatInvitesWDM.JsonT
