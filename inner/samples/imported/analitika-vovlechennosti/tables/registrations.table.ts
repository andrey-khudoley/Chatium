// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TAnalitikaLendovRegistrationsCfT = Heap.Table(
  't_analitika-lendov_registrations_CnJ',
  {
    lend: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Лендинг (путь без слеша)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    date_reg: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Дата регистрации (DD.MM.YYYY)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
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
    ),
    utm_term: Heap.Optional(
      Heap.String({
        customMeta: { title: 'UTM Term' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    utm_content: Heap.Optional(
      Heap.String({
        customMeta: { title: 'UTM Content' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    uid: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID пользователя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Регистрации', description: 'Регистрации' } }
)

export default TAnalitikaLendovRegistrationsCfT

export type TAnalitikaLendovRegistrationsCfTRow = typeof TAnalitikaLendovRegistrationsCfT.T
export type TAnalitikaLendovRegistrationsCfTRowJson = typeof TAnalitikaLendovRegistrationsCfT.JsonT
