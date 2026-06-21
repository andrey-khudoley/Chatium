// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TNailBookingAgentBookingsJzY = Heap.Table(
  't_nail-booking-agent_bookings_KLm',
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
        customMeta: { title: 'Дополнительные заметки' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Записи на маникюр', description: 'Записи на маникюр' } }
)

export default TNailBookingAgentBookingsJzY

export type TNailBookingAgentBookingsJzYRow = typeof TNailBookingAgentBookingsJzY.T
export type TNailBookingAgentBookingsJzYRowJson = typeof TNailBookingAgentBookingsJzY.JsonT
