// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TZoomAgentToolZoomMeetingsYmQ = Heap.Table(
  't_zoom_agent_tool_zoom_meetings_UCU',
  {
    meeting_id: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID встречи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    topic: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Тема встречи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    agenda: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Повестка' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    start_url: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Ссылка для организатора' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    join_url: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Ссылка для участников' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    password: Heap.Optional(Heap.String({ customMeta: { title: 'Пароль встречи' } })),
    created_at: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата создания' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Zoom встречи', description: 'Созданные Zoom встречи' } }
)

// declaration merging: allows using table-related types via default import
export declare namespace TZoomAgentToolZoomMeetingsYmQ {
  export type T = typeof TZoomAgentToolZoomMeetingsYmQ.T
  export type JsonT = typeof TZoomAgentToolZoomMeetingsYmQ.JsonT
  export type PropsT = typeof TZoomAgentToolZoomMeetingsYmQ.PropsT
  export type PatchT = typeof TZoomAgentToolZoomMeetingsYmQ.PatchT
  export type CreateInputT = typeof TZoomAgentToolZoomMeetingsYmQ.CreateInputT
}

export default TZoomAgentToolZoomMeetingsYmQ

export type TZoomAgentToolZoomMeetingsYmQRow = TZoomAgentToolZoomMeetingsYmQ.T
export type TZoomAgentToolZoomMeetingsYmQRowJson = TZoomAgentToolZoomMeetingsYmQ.JsonT
