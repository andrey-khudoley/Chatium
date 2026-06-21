import { Heap } from '@app/heap'

/**
 * Таблица для хранения настраиваемых весов для самообучения системы атрибуции
 *
 * Каждая запись содержит:
 * - projectId: ID проекта
 * - channelId: ID канала (опционально, для канало-специфичных весов)
 * - parameter: название параметра: 'lambda' | 'tau_fast' | 'tau_slow' | 'alpha' | 'beta' | 'avg_conversion_time'
 * - value: числовое значение параметра
 * - samplesCount: количество образцов, использованных для расчёта
 * - lastUpdatedAt: время последнего обновления
 *
 * Системные поля createdAt и updatedAt добавляются автоматически
 */
export const AttributionWeights = Heap.Table(
  't__tg_channel_analytics__attribution_weights__f6a7b8c9',
  {
    projectId: Heap.String({
      customMeta: { title: 'ID проекта' }
    }),
    channelId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID канала (опционально, для канало-специфичных весов)' }
      })
    ),
    parameter: Heap.Union(
      [
        Heap.Literal('lambda'),
        Heap.Literal('tau_fast'),
        Heap.Literal('tau_slow'),
        Heap.Literal('alpha'),
        Heap.Literal('beta'),
        Heap.Literal('avg_conversion_time')
      ],
      {
        customMeta: { title: 'Название параметра' }
      }
    ),
    value: Heap.Number({
      customMeta: { title: 'Числовое значение параметра' }
    }),
    samplesCount: Heap.Number({
      customMeta: { title: 'Количество образцов, использованных для расчёта' },
      defaultValue: 0
    }),
    lastUpdatedAt: Heap.DateTime({
      customMeta: { title: 'Время последнего обновления' }
    })
  }
)

export default AttributionWeights
