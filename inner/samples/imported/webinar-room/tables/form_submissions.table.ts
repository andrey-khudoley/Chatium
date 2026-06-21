// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TWebinarRoomWebinarRoomFormSubmissions = Heap.Table(
  't_webinar_room_webinar_room_form_submissions_HAs',
  {
    form: Heap.Optional(
      Heap.RefLink('webinar-room-episode-forms_ssq', {
        customMeta: { title: 'Форма' },
        onDelete: 'none'
      })
    ),
    episode: Heap.Optional(
      Heap.RefLink('webinar-room-episodes_S58', { customMeta: { title: 'Эфир' }, onDelete: 'none' })
    ),
    autowebinar: Heap.Optional(
      Heap.RefLink('t_webinar_room_webinar_room_autowebinars_CRj', {
        customMeta: { title: 'Автовебинар' },
        onDelete: 'none'
      })
    ),
    user: Heap.Optional(
      Heap.UserRefLink({ customMeta: { title: 'Пользователь' }, onDelete: 'restrict' })
    ),
    data: Heap.Optional(Heap.Any()),
    paymentId: Heap.Optional(Heap.String({ customMeta: { title: 'ID платежа' } }))
  },
  { customMeta: { title: 'Отправки форм', description: 'Отправки форм' } }
)

export default TWebinarRoomWebinarRoomFormSubmissions

export type TWebinarRoomWebinarRoomFormSubmissionsRow =
  typeof TWebinarRoomWebinarRoomFormSubmissions.T
export type TWebinarRoomWebinarRoomFormSubmissionsRowJson =
  typeof TWebinarRoomWebinarRoomFormSubmissions.JsonT
