// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TCosmetologySiteLeadsYyj = Heap.Table(
  't_cosmetologySite_leads_Cbd',
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

export default TCosmetologySiteLeadsYyj

export type TCosmetologySiteLeadsYyjRow = typeof TCosmetologySiteLeadsYyj.T
export type TCosmetologySiteLeadsYyjRowJson = typeof TCosmetologySiteLeadsYyj.JsonT
