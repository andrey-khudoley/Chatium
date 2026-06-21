// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TTestUtmQuizLeadsPTj = Heap.Table(
  't_test-utm_quiz_leads_m3A',
  {
    name: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    email: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Email' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    phone: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Телефон' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    answers: Heap.Optional(Heap.Any()),
    utm_source: Heap.Optional(
      Heap.String({
        customMeta: { title: 'UTM Source' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    utm_medium: Heap.Optional(
      Heap.String({
        customMeta: { title: 'UTM Medium' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    utm_campaign: Heap.Optional(
      Heap.String({
        customMeta: { title: 'UTM Campaign' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Лиды из теста', description: 'Лиды из теста' } }
)

export default TTestUtmQuizLeadsPTj

export type TTestUtmQuizLeadsPTjRow = typeof TTestUtmQuizLeadsPTj.T
export type TTestUtmQuizLeadsPTjRowJson = typeof TTestUtmQuizLeadsPTj.JsonT
