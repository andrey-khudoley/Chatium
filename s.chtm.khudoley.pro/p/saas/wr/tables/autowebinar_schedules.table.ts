// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TWebinarRoomWebinarRoomAutowebinarSchedules = Heap.Table(
  't_webinar_room_webinar_room_autowebinar_schedules_L0s',
  {
    autowebinar: Heap.Optional(
      Heap.RefLink('t_webinar_room_webinar_room_autowebinars_xT8', {
        customMeta: { title: 'Автовебинар' }
      })
    ),
    scheduledDate: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Запланированная дата/время' } })
    ),
    status: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус (scheduled / waiting_room / live / finished)' } })
    ),
    chatFeedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID общего чата' } })),
    startedAt: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Реальное время старта видео' } })
    ),
    finishedAt: Heap.Optional(Heap.DateTime({ customMeta: { title: 'Время завершения' } }))
  },
  { customMeta: { title: 'Расписания автовебинаров', description: 'Расписания автовебинаров' } }
)

export default TWebinarRoomWebinarRoomAutowebinarSchedules

export type TWebinarRoomWebinarRoomAutowebinarSchedulesRow =
  typeof TWebinarRoomWebinarRoomAutowebinarSchedules.T
export type TWebinarRoomWebinarRoomAutowebinarSchedulesRowJson =
  typeof TWebinarRoomWebinarRoomAutowebinarSchedules.JsonT
