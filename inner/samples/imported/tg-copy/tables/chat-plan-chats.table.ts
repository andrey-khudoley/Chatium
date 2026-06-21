// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatChatPlanChatsK8MJoo = Heap.Table(
  't_projekt_chat_t_projekt_chat_chat_plan_chats_k8M_A3m',
  {
    planId: Heap.Optional(
      Heap.RefLink('t_projekt_chat_chat_subscription_plans_9nM', { customMeta: { title: 'Тариф' } }),
    ),
    feedId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID чата (feedId)' }, searchable: { langs: ['ru', 'en'] } }),
    ),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } })),
  },
  { customMeta: { title: 'chat-plan-chats.table.ts', description: '' } },
)

export default TProjektChatTProjektChatChatPlanChatsK8MJoo

export type TProjektChatTProjektChatChatPlanChatsK8MJooRow = typeof TProjektChatTProjektChatChatPlanChatsK8MJoo.T
export type TProjektChatTProjektChatChatPlanChatsK8MJooRowJson =
  typeof TProjektChatTProjektChatChatPlanChatsK8MJoo.JsonT
