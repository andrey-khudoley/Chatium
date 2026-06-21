// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const THairdresserBookingBookings2tk = Heap.Table(
  't_hairdresserBooking_bookings_2tk_PdMMWj_IkU_IkU',
  {
    clientName: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя клиента' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    clientPhone: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Телефон клиента' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    clientEmail: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Email клиента' },
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
      Heap.DateTime({
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
    status: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Статус' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    notes: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Примечания' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Записи на услуги', description: 'Записи на услуги' } }
)

export default THairdresserBookingBookings2tk

export type THairdresserBookingBookings2tkRow = typeof THairdresserBookingBookings2tk.T
export type THairdresserBookingBookings2tkRowJson = typeof THairdresserBookingBookings2tk.JsonT
