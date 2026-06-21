// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TWebinarRoomWebinarRoomScenarioEvents = Heap.Table(
  't_webinar_room_webinar_room_scenario_events_u6D',
  {
    autowebinar: Heap.Optional(
      Heap.RefLink('t_webinar_room_webinar_room_autowebinars_xT8', {
        onDelete: 'none',
        customMeta: { title: 'Автовебинар' }
      })
    ),
    offsetSeconds: Heap.Optional(
      Heap.Number({ customMeta: { title: 'Смещение от начала (секунды)' } })
    ),
    eventType: Heap.Optional(Heap.String({ customMeta: { title: 'Тип события' } })),
    formId: Heap.Optional(
      Heap.RefLink('webinar-room-episode-forms_nQ2', {
        customMeta: { title: 'Форма (для show_form/hide_form)' },
        onDelete: 'none'
      })
    ),
    formSnapshot: Heap.Optional(Heap.Any()),
    chatMessage: Heap.Optional(Heap.Any()),
    bannerData: Heap.Optional(Heap.Any()),
    reactionData: Heap.Optional(Heap.Any()),
    sortOrder: Heap.Optional(Heap.Number({ customMeta: { title: 'Порядок сортировки' } }))
  },
  { customMeta: { title: 'События сценария', description: 'События сценария' } }
)

export default TWebinarRoomWebinarRoomScenarioEvents

export type TWebinarRoomWebinarRoomScenarioEventsI7JRow =
  typeof TWebinarRoomWebinarRoomScenarioEvents.T
export type TWebinarRoomWebinarRoomScenarioEventsI7JRowJson =
  typeof TWebinarRoomWebinarRoomScenarioEvents.JsonT
