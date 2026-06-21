// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TKalendarZapisiAppointmentsX1J = Heap.Table(
  't_kalendar-zapisi_appointments_Hog',
  {
    name: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя клиента' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    telegramId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Telegram ID' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    email: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Почта' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    appointmentDate: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата записи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    appointmentTime: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Время записи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    duration: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Длительность встречи (мин)' },
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
        customMeta: { title: 'Заметки' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    comments: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Комментарий клиента' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Записи клиентов', description: 'Записи клиентов' } }
)

export default TKalendarZapisiAppointmentsX1J

export type TKalendarZapisiAppointmentsX1JRow = typeof TKalendarZapisiAppointmentsX1J.T
export type TKalendarZapisiAppointmentsX1JRowJson = typeof TKalendarZapisiAppointmentsX1J.JsonT
