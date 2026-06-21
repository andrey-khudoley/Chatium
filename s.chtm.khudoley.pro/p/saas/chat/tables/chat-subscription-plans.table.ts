// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatChatSubscriptionPlansNLN = Heap.Table(
  't_projekt_chat_chat_subscription_plans_nsz',
  {
    chatId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    name: Heap.Optional(
      Heap.String({ customMeta: { title: 'Название тарифа' }, searchable: { langs: ['ru', 'en'] } })
    ),
    description: Heap.Optional(Heap.String({ customMeta: { title: 'Описание тарифа' } })),
    durationType: Heap.Optional(Heap.String({ customMeta: { title: 'Тип длительности' } })),
    durationValue: Heap.Optional(Heap.Number({ customMeta: { title: 'Значение длительности' } })),
    calendarPeriod: Heap.Optional(
      Heap.String({ customMeta: { title: 'Тип календарного периода' } })
    ),
    specificPeriodStart: Heap.Optional(
      Heap.Number({ customMeta: { title: 'Начало специфического периода' } })
    ),
    price: Heap.Optional(Heap.Money({ customMeta: { title: 'Цена' } })),
    isActive: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Активен' } })),
    allowAutoRenewal: Heap.Optional(
      Heap.Boolean({ customMeta: { title: 'Разрешить автопродление' } })
    ),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } }))
  },
  { customMeta: { title: 'Тарифы подписок на чаты', description: '' } }
)

export default TProjektChatChatSubscriptionPlansNLN

export type TProjektChatChatSubscriptionPlansNLNRow = typeof TProjektChatChatSubscriptionPlansNLN.T
export type TProjektChatChatSubscriptionPlansNLNRowJson =
  typeof TProjektChatChatSubscriptionPlansNLN.JsonT
