// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatSubscriptions0EK = Heap.Table(
  't_projekt_chat_chat_subscriptions_BYo',
  {
    userId: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    planId: Heap.Optional(
      Heap.RefLink('t_projekt_chat_chat_subscription_plans_nsz', { customMeta: { title: 'Тариф' } })
    ),
    status: Heap.Optional(Heap.String({ customMeta: { title: 'Статус' } })),
    startDate: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата начала доступа' } })),
    endDate: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата окончания доступа' } })),
    autoRenewal: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Автопродление включено' } })),
    renewalPlanId: Heap.Optional(
      Heap.RefLink('t_projekt_chat_chat_subscription_plans_nsz', {
        customMeta: { title: 'Тариф для продления' }
      })
    ),
    lastPaymentId: Heap.Optional(Heap.String({ customMeta: { title: 'ID последнего платежа' } })),
    lastPaymentAt: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Дата последнего платежа' } })
    ),
    nextBillingDate: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Дата следующего списания' } })
    ),
    cancelledAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Дата отмены подписки' } })),
    cancelReason: Heap.Optional(Heap.String({ customMeta: { title: 'Причина отмены' } })),
    selectedPeriodStart: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Выбранная дата начала периода' } })
    ),
    selectedPeriodEnd: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Выбранная дата окончания периода' } })
    )
  },
  { customMeta: { title: 'Подписки на чаты', description: '' } }
)

export default TProjektChatChatSubscriptions0EK

export type TProjektChatChatSubscriptions0EKRow = typeof TProjektChatChatSubscriptions0EK.T
export type TProjektChatChatSubscriptions0EKRowJson = typeof TProjektChatChatSubscriptions0EK.JsonT
