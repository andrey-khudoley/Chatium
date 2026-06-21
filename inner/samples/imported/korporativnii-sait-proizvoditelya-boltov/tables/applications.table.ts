// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TBoltManufacturerApplicationsRcO = Heap.Table(
  't_boltManufacturer_applications_4UJ',
  {
    name: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    phone: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Телефон' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    email: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Email' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    message: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Сообщение' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    status: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Статус' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Заявки с сайта', description: 'Заявки с сайта' } }
)

export default TBoltManufacturerApplicationsRcO

export type TBoltManufacturerApplicationsRcORow = typeof TBoltManufacturerApplicationsRcO.T
export type TBoltManufacturerApplicationsRcORowJson = typeof TBoltManufacturerApplicationsRcO.JsonT
