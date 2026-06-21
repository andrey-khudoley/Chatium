// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TAnalitikaLendovLandings = Heap.Table(
  't_analitika-lendov_landings_MFS_LAP',
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
    ),
    workspacePath: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Воркспейс лендинга' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'landings.table.ts', description: 'landings.table.ts' } }
)

export default TAnalitikaLendovLandings

export type TAnalitikaLendovLandingsRow = typeof TAnalitikaLendovLandings.T
export type TAnalitikaLendovLandingsRowJson = typeof TAnalitikaLendovLandings.JsonT
