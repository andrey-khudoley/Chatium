// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatPrivacyVskIgf = Heap.Table(
  't_projekt_chat_t_projekt_chat_privacy_vsk_HC6',
  {
    user: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
    allowDirectMessages: Heap.Optional(Heap.String({ customMeta: { title: 'Кто может писать в личку' } })),
    allowedUsers: Heap.Optional(Heap.Any()),
    blockedUsers: Heap.Optional(Heap.Any()),
  },
  { customMeta: { title: 'user-privacy-settings.table.ts', description: '' } },
)

export default TProjektChatTProjektChatPrivacyVskIgf

export type TProjektChatTProjektChatPrivacyVskIgfRow = typeof TProjektChatTProjektChatPrivacyVskIgf.T
export type TProjektChatTProjektChatPrivacyVskIgfRowJson = typeof TProjektChatTProjektChatPrivacyVskIgf.JsonT
