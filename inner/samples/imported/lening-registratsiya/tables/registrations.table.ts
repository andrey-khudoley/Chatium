// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TVfRegistratsiyaRegistrationsYLp = Heap.Table(
  't_vf-registratsiya_registrations_c7M',
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
    testScore: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Результат теста' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    speedLevel: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Уровень скорости' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    answers: Heap.Optional(Heap.Any()),
    registeredAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата регистрации' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Регистрации на марафон', description: 'Регистрации на марафон' } }
)

export default TVfRegistratsiyaRegistrationsYLp

export type TVfRegistratsiyaRegistrationsYLpRow = typeof TVfRegistratsiyaRegistrationsYLp.T
export type TVfRegistratsiyaRegistrationsYLpRowJson = typeof TVfRegistratsiyaRegistrationsYLp.JsonT
