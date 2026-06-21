// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatMetricsM3t = Heap.Table(
  't_projekt_chat_metrics_M3t',
  {
    metricKey: Heap.Optional(
      Heap.String({ customMeta: { title: 'Ключ метрики' }, searchable: { langs: ['ru', 'en'] } })
    ),
    value: Heap.Optional(Heap.Number({ customMeta: { title: 'Значение' } }))
  },
  {
    customMeta: {
      title: 'Метрики чатов',
      description: 'Счётчики событий для мониторинга и аналитики'
    }
  }
)

export default TProjektChatMetricsM3t

export type TProjektChatMetricsM3tRow = typeof TProjektChatMetricsM3t.T
export type TProjektChatMetricsM3tRowJson = typeof TProjektChatMetricsM3t.JsonT
