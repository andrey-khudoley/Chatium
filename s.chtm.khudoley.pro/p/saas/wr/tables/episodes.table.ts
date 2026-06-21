import { Heap } from '@app/heap'
import { ChatAccessMode, LatencyMode, FinishAction } from '../shared/enum'

export const Episodes = Heap.Table(
  'webinar-room-episodes_N9v',
  {
    title: Heap.String({
      customMeta: { title: 'Название' },
      searchable: { langs: ['ru', 'en'], embeddings: true }
    }),
    description: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Описание' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    scheduledDate: Heap.DateTime({ customMeta: { title: 'Дата проведения' } }),
    startedAt: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Реальное время запуска эфира' } })
    ),
    finishedAt: Heap.Optional(
      Heap.DateTime({ customMeta: { title: 'Реальное время завершения эфира' } })
    ),
    chatFeedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID фида чата' } })), // Заполняется сразу после создания записи в хипе
    status: Heap.String({ customMeta: { title: 'Статус' } }),
    kinescopeId: Heap.String({ customMeta: { title: 'Kinescope Event ID' } }),
    streamkey: Heap.Optional(Heap.String({ customMeta: { title: 'Ключ для стриминга' } })),
    rtmpLink: Heap.Optional(Heap.String({ customMeta: { title: 'RTMP ссылка' } })),
    playLink: Heap.Optional(Heap.String({ customMeta: { title: 'Ссылка на просмотр' } })),
    resultUrl: Heap.Optional(Heap.String({ customMeta: { title: 'Ссылка после эфира' } })),
    resultButtonText: Heap.Optional(
      Heap.String({ customMeta: { title: 'Текст кнопки после эфира' } })
    ),
    resultText: Heap.Optional(Heap.String({ customMeta: { title: 'Текст после эфира' } })),
    chatAccessMode: Heap.NonRequired(
      Heap.String({ customMeta: { title: 'Режим доступа к чату' } }),
      ChatAccessMode.Open
    ),
    kinescopePlayerId: Heap.Optional(Heap.String({ customMeta: { title: 'ID Плеера Kinescope' } })),
    latencyMode: Heap.NonRequired(
      Heap.String({ customMeta: { title: 'Режим задержки' } }),
      LatencyMode.Low
    ),
    dvr: Heap.NonRequired(
      Heap.Boolean({ customMeta: { title: 'DVR (перемотка во время эфира)' } }),
      true
    ),
    record: Heap.NonRequired(
      Heap.Boolean({ customMeta: { title: 'Схоранять запись эфира' } }),
      true
    ),
    kinescopeFolderId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID папки Kinescipe для записи' } })
    ),
    finishAction: Heap.NonRequired(
      Heap.String({ customMeta: { title: 'Действие при завершении' } }),
      FinishAction.Page
    ),
    shownFormIds: Heap.NonRequired(Heap.Any({ customMeta: { title: 'ID показанных форм' } }), [])
  },
  { customMeta: { title: 'Эфиры', description: 'Эфиры' } }
)

export default Episodes

export type EpisodesRow = typeof Episodes.T
export type EpisodesRowJson = typeof Episodes.JsonT
