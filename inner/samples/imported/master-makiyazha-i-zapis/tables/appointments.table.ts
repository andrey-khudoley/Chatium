// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TMakeupArtistBookingAppointmentsEXZ = Heap.Table(
  't_makeupArtistBooking_appointments_KgA',
  {
    clientName: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя клиента' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    clientPhone: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Телефон' },
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
        customMeta: { title: 'Дата записи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    time: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Время записи' },
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

export default TMakeupArtistBookingAppointmentsEXZ

export type TMakeupArtistBookingAppointmentsEXZRow = typeof TMakeupArtistBookingAppointmentsEXZ.T
export type TMakeupArtistBookingAppointmentsEXZRowJson =
  typeof TMakeupArtistBookingAppointmentsEXZ.JsonT
