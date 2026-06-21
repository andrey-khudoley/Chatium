// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatPrivacyVsk8RL = Heap.Table(
  't_projekt_chat_t_projekt_chat_privacy_vsk_0Rb',
  {
    user: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
    allowDirectMessages: Heap.Optional(
      Heap.String({ customMeta: { title: 'Кто может писать в личку' } })
    ),
    allowedUsers: Heap.Optional(Heap.Any()),
    blockedUsers: Heap.Optional(Heap.Any())
  },
  { customMeta: { title: 'Настройки приватности пользователей', description: '' } }
)

export default TProjektChatTProjektChatPrivacyVsk8RL

export type TProjektChatTProjektChatPrivacyVsk8RLRow =
  typeof TProjektChatTProjektChatPrivacyVsk8RL.T
export type TProjektChatTProjektChatPrivacyVsk8RLRowJson =
  typeof TProjektChatTProjektChatPrivacyVsk8RL.JsonT
