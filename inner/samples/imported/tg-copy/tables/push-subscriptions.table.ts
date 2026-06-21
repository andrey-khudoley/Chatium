// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TTgPushSubscriptionsQS9 = Heap.Table(
  't_tg_push_subscriptions_rL3',
  {
    endpoint: Heap.Optional(Heap.String({ customMeta: { title: 'Endpoint' } })),
    subscriptionData: Heap.Optional(Heap.Any()),
    userId: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
  },
  { customMeta: { title: 'Push подписки', description: '' } },
)

export default TTgPushSubscriptionsQS9

export type TTgPushSubscriptionsQS9Row = typeof TTgPushSubscriptionsQS9.T
export type TTgPushSubscriptionsQS9RowJson = typeof TTgPushSubscriptionsQS9.JsonT
