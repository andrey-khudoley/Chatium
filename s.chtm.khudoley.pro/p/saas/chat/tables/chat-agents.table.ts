// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatAgentsKRq6kG = Heap.Table(
  't_projekt_chat_t_projekt_chat_agents_kRq_Ohh',
  {
    chat: Heap.Optional(Heap.RefLink('t_projekt_chat_chats_yz5', { customMeta: { title: 'Чат' } })),
    agentId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID агента в системе Chatium' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    agentName: Heap.Optional(Heap.String({ customMeta: { title: 'Имя агента для отображения' } })),
    agentKey: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Ключ агента (slug)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    botUserId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID бот-пользователя в Chatium' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    respondTo: Heap.Optional(Heap.String({ customMeta: { title: 'Отвечать на' } })),
    respondToMention: Heap.Optional(
      Heap.String({ customMeta: { title: 'Отвечать при упоминании' } })
    ),
    isActive: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Активен' } })),
    canScheduleInChat: Heap.Optional(
      Heap.Boolean({ customMeta: { title: 'Может ставить напоминания в этом чате' } })
    ),
    chainKey: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Ключ цепочки агента для этого чата' },
        searchable: { langs: ['ru', 'en'] }
      })
    )
  },
  { customMeta: { title: 'Агенты в чатах', description: '' } }
)

export default TProjektChatTProjektChatAgentsKRq6kG

export type TProjektChatTProjektChatAgentsKRq6kGRow = typeof TProjektChatTProjektChatAgentsKRq6kG.T
export type TProjektChatTProjektChatAgentsKRq6kGRowJson =
  typeof TProjektChatTProjektChatAgentsKRq6kG.JsonT
