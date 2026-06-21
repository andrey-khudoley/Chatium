// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TLendMetrikaLandingsW2F = Heap.Table(
  't_lend-metrika_landings_LAW',
  {
    path: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Путь лендинга' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название лендинга' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    isActive: Heap.Optional(
      Heap.Boolean({
        customMeta: { title: 'Активен' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Лендинги', description: 'Лендинги' } }
)

export default TLendMetrikaLandingsW2F

export type TLendMetrikaLandingsW2FRow = typeof TLendMetrikaLandingsW2F.T
export type TLendMetrikaLandingsW2FRowJson = typeof TLendMetrikaLandingsW2F.JsonT
