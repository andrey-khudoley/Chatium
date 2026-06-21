// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatTProjektChatChatPlanChatsK8MN5m = Heap.Table(
  't_projekt_chat_t_projekt_chat_chat_plan_chats_k8M_vuz',
  {
    planId: Heap.Optional(
      Heap.RefLink('t_projekt_chat_chat_subscription_plans_nsz', { customMeta: { title: 'Тариф' } })
    ),
    feedId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID чата (feedId)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } }))
  },
  { customMeta: { title: 'Чаты в тарифах подписок', description: '' } }
)

export default TProjektChatTProjektChatChatPlanChatsK8MN5m

export type TProjektChatTProjektChatChatPlanChatsK8MN5mRow =
  typeof TProjektChatTProjektChatChatPlanChatsK8MN5m.T
export type TProjektChatTProjektChatChatPlanChatsK8MN5mRowJson =
  typeof TProjektChatTProjektChatChatPlanChatsK8MN5m.JsonT
