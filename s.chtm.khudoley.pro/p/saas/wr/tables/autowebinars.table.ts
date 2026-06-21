// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TWebinarRoomWebinarRoomAutowebinars = Heap.Table(
  't_webinar_room_webinar_room_autowebinars_xT8',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    description: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Описание' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    videoHash: Heap.Optional(Heap.String({ customMeta: { title: 'Hash видео в хранилище' } })),
    muuveeVideoId: Heap.Optional(Heap.String({ customMeta: { title: 'ID видео в Muuvee' } })),
    kinescopeVideoId: Heap.Optional(Heap.String({ customMeta: { title: 'ID видео в Kinescope' } })),
    knowledgeBaseId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID базы знаний для автовебинара' } })
    ),
    subtitles: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Субтитры (текст видео)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    subtitlesStatus: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус получения субтитров' } })
    ),
    kinescopePlayerId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID плеера Kinescope (автосоздаётся)' } })
    ),
    duration: Heap.Optional(Heap.Number({ customMeta: { title: 'Длительность видео (секунды)' } })),
    waitingRoomDuration: Heap.Optional(
      Heap.Number({ customMeta: { title: 'Длительность waiting room (секунды)' } })
    ),
    finishAction: Heap.Optional(Heap.String({ customMeta: { title: 'Действие при завершении' } })),
    resultUrl: Heap.Optional(Heap.String({ customMeta: { title: 'URL после завершения' } })),
    resultButtonText: Heap.Optional(
      Heap.String({ customMeta: { title: 'Текст кнопки после завершения' } })
    ),
    resultText: Heap.Optional(Heap.String({ customMeta: { title: 'Текст после завершения' } })),
    chatAccessMode: Heap.Optional(Heap.String({ customMeta: { title: 'Режим доступа к чату' } })),
    thumbnail: Heap.Optional(Heap.String({ customMeta: { title: 'Миниатюра' } })),
    mode: Heap.Optional(Heap.String({ customMeta: { title: 'Режим автовебинара (scheduled)' } })),
    status: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус (draft / active / archived)' } })
    ),
    recurrence: Heap.Optional(Heap.Any()),
    fakeOnlineConfig: Heap.Optional(Heap.Any()),
    muuveeError: Heap.Optional(
      Heap.String({ customMeta: { title: 'Ошибка обработки видео в Muuvee' } })
    ),
    scenarioGenerationStatus: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус генерации сценария' } })
    ),
    scenarioGenerationError: Heap.Optional(
      Heap.String({ customMeta: { title: 'Ошибка генерации сценария' } })
    )
  },
  { customMeta: { title: 'Автовебинары', description: 'Автовебинары' } }
)

export default TWebinarRoomWebinarRoomAutowebinars

export type TWebinarRoomWebinarRoomAutowebinarsRow = typeof TWebinarRoomWebinarRoomAutowebinars.T
export type TWebinarRoomWebinarRoomAutowebinarsRowJson =
  typeof TWebinarRoomWebinarRoomAutowebinars.JsonT
