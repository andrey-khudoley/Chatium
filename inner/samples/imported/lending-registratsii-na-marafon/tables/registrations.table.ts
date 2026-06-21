// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TUtmSborRegistrationsUYh = Heap.Table(
  't_utm-sbor_registrations_RTm',
  {
    firstName: Heap.Optional(
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
    experience: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Опыт работы' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    registeredAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата регистрации' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Регистрации на мероприятие', description: 'Регистрации на мероприятие' } }
)

export default TUtmSborRegistrationsUYh

export type TUtmSborRegistrationsUYhRow = typeof TUtmSborRegistrationsUYh.T
export type TUtmSborRegistrationsUYhRowJson = typeof TUtmSborRegistrationsUYh.JsonT
