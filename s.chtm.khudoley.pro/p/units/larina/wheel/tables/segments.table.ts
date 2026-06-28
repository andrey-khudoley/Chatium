import { Heap } from '@app/heap'

export const Segments = Heap.Table('t__larina-wheel__segment__1hj8w9', {
  order: Heap.Number({
    customMeta: { title: 'Порядок (0, 1, 2, …)' }
  }),
  label: Heap.String({
    customMeta: { title: 'Текст на секторе' }
  }),
  prizeOfferID: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID offer в GetCourse (nullable)' }
    })
  ),
  redirectUrl: Heap.Optional(
    Heap.String({
      customMeta: { title: 'URL редиректа при получении приза (nullable)' }
    })
  ),
  full: Heap.String({
    customMeta: { title: 'Текст приза на экране результата' }
  }),
  weight: Heap.Number({
    customMeta: { title: 'Относительный вес при случайном выборе' }
  }),
  maxWins: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Максимум выигрышей (null = без ограничения)' }
    })
  ),
  enabled: Heap.Boolean({
    customMeta: { title: 'Активен (false — не участвует в выборке)' }
  })
})

export default Segments

export type SegmentsRow = typeof Segments.T
export type SegmentsRowJson = typeof Segments.JsonT
