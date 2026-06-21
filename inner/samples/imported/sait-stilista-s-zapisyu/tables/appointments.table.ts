// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TStylistBookingAppointmentsKrw = Heap.Table(
  't_stylistBooking_appointments_fsu',
  {
    clientName: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя клиента' },
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
    service: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Услуга' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    date: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Дата' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    time: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Время' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    comment: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Комментарий' },
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
  { customMeta: { title: 'Записи на прием', description: 'Записи на прием' } }
)

export default TStylistBookingAppointmentsKrw

export type TStylistBookingAppointmentsKrwRow = typeof TStylistBookingAppointmentsKrw.T
export type TStylistBookingAppointmentsKrwRowJson = typeof TStylistBookingAppointmentsKrw.JsonT
