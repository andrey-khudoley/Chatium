// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TelegramBotSubscriptionCheckerVera5TV = Heap.Table(
  'telegramBotSubscriptionChecker_vera_aKd',
  {
    category: Heap.Optional(Heap.String({ customMeta: { title: 'category' } })),
    test_name: Heap.Optional(Heap.String({ customMeta: { title: 'test_name' } })),
    synonyms_semicolon: Heap.Optional(Heap.String({ customMeta: { title: 'synonyms_semicolon' } })),
    value: Heap.Optional(Heap.String({ customMeta: { title: 'value' } })),
    units: Heap.Optional(Heap.String({ customMeta: { title: 'units' } })),
    reference_or_cutoff: Heap.Optional(
      Heap.String({ customMeta: { title: 'reference_or_cutoff' } })
    ),
    comment: Heap.Optional(Heap.String({ customMeta: { title: 'comment' } })),
    availability: Heap.Optional(Heap.String({ customMeta: { title: 'availability' } }))
  },
  { customMeta: { title: 'Вера', description: 'Вера' } }
)

export default TelegramBotSubscriptionCheckerVera5TV

export type TelegramBotSubscriptionCheckerVera5TVRow =
  typeof TelegramBotSubscriptionCheckerVera5TV.T
export type TelegramBotSubscriptionCheckerVera5TVRowJson =
  typeof TelegramBotSubscriptionCheckerVera5TV.JsonT
